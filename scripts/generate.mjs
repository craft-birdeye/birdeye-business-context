#!/usr/bin/env node
// Turns offset-based sources (source/*.json) into dated, publishable JSON (v1/*.json),
// per-account bundles, monogram logos, and per-account markdown briefs.
// Node built-ins only. Usage:
//   node scripts/generate.mjs                 # build date = today (UTC)
//   node scripts/generate.mjs --date 2026-10-21
//   BASE_URL=https://example.github.io/x node scripts/generate.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CENTERS } from "./lib/centers.mjs";
import { makeEnricher } from "./lib/enrich.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_VERSION = "1.1.0";
const BASE_URL = (process.env.BASE_URL || "https://craft-birdeye.github.io/birdeye-business-context").replace(/\/$/, "");

const argDate = (() => { const i = process.argv.indexOf("--date"); return i > -1 ? process.argv[i + 1] : process.env.BUILD_DATE; })();
const buildDate = argDate || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(buildDate)) throw new Error(`Bad build date: ${buildDate}`);
const generatedAt = `${buildDate}T00:00:00Z`;
const DAY = 86400000;
const anchor = Date.parse(generatedAt);

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
/** daysAgo (>=1) -> ISO date-time on that UTC day, at a stable US-business-hours time. */
function isoDaysAgo(daysAgo, seed) {
  if (!Number.isInteger(daysAgo) || daysAgo < 1) throw new Error(`daysAgo must be an integer >= 1 (${seed}: ${daysAgo})`);
  const h = hash(seed);
  const t = anchor - daysAgo * DAY + (14 + (h % 8)) * 3600000 + ((h >>> 4) % 12) * 5 * 60000;
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "source", f), "utf8"));
const srcAccounts = read("accounts.json").accounts;
const srcLocations = read("locations.json").locations;
const srcContacts = read("contacts.json").contacts;
const D = read("distributions.json");
const T = read("review-templates.json");
const enricher = makeEnricher({ D, T, CENTERS, buildDate });
// Proposal 1: reshape non-scenario review samples to source/distributions.json (quick scenarios stay as authored).
const { reviews: srcReviews, stats: curationStats } = enricher.curateReviews(srcAccounts, srcLocations, read("reviews.json").reviews);

const schemaUrl = (n) => `${BASE_URL}/schemas/${n}.schema.json`;
const fileUrl = (p) => `${BASE_URL}/${p}`;

const baseLocations = srcLocations.map(({ createdDaysAgo, ...l }) => ({ ...l, createdOn: isoDaysAgo(createdDaysAgo, l.id) }));
const locById = new Map(baseLocations.map((l) => [l.id, l]));

const contacts = srcContacts.map(({ createdDaysAgo, lastActivityDaysAgo, ...c }) => {
  const out = { ...c };
  out.locationCount = c.locationIds.length;
  out.location = locById.get(c.primaryLocationId)?.label ?? "";
  out.createdOn = isoDaysAgo(createdDaysAgo, c.id + ":created");
  out.lastActivity = isoDaysAgo(lastActivityDaysAgo, c.id + ":activity");
  // Same-day activity can land at an earlier hour than creation; keep activity after creation.
  if (out.lastActivity < out.createdOn) out.lastActivity = new Date(Date.parse(out.createdOn) + 2 * 3600000).toISOString().replace(/\.\d{3}Z$/, "Z");
  return out;
});

const reviews = srcReviews.map(({ daysAgo, reply, ...r }) => {
  const out = { ...r, location: locById.get(r.locationId)?.label ?? "", employees: r.employeesMentioned.length, date: isoDaysAgo(daysAgo, r.id) };
  if (reply && reply.lagHours !== undefined) {
    // reshaped accounts: reply posted lagHours after the review; a reply that would land after the build time is withheld
    const { lagHours, ...rest } = reply;
    const t = Date.parse(out.date) + Math.round(lagHours * 60) * 60000;
    if (t <= anchor) out.reply = { ...rest, date: new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z") };
    else { out.replyStatus = "post"; curationStats.repliesWithheld = (curationStats.repliesWithheld ?? 0) + 1; }
  } else if (reply) {
    const { daysAgo: rd, ...rest } = reply;
    // A reply can never predate its review.
    const replyDate = isoDaysAgo(Math.min(rd, daysAgo), r.id + ":reply");
    out.reply = { ...rest, date: replyDate < out.date ? out.date : replyDate };
  }
  // stable key order
  const { id, number, accountId, locationId, location, site, rating, reviewer, date, text, photoCount, featured, archived, employeesMentioned, employees, replyStatus } = out;
  return { id, number, accountId, locationId, location, site, rating, reviewer, date, text, photoCount, featured, archived, employeesMentioned, employees, replyStatus, ...(out.reply ? { reply: out.reply } : {}) };
});

// Proposal 2: invented listing-level fields per location (additive in schema 1.1.0).
const srcAccountById = new Map(srcAccounts.map((a) => [a.id, a]));
const locations = baseLocations.map((l) => ({ ...l, ...enricher.enrichLocation(l, srcAccountById.get(l.accountId), reviews.filter((r) => r.locationId === l.id)) }));

function llmContext(a) {
  const n = a.purchasedLocations;
  return [a.name, a.segmentLabel, a.industryLabel, `HQ ${a.hq.city}, ${a.hq.stateName}, ${a.hq.country}`, `${n} purchased location${n === 1 ? "" : "s"}`, `CRM ${a.crm}`, a.businessBlurb].join(" · ");
}
const accounts = srcAccounts.map((a) => ({
  ...a,
  branding: { ...a.branding, logo: { ...a.branding.logo, url: fileUrl(a.branding.logo.path) } },
  llmContext: llmContext(a),
  listingSummary: enricher.accountSummary(locations.filter((l) => l.accountId === a.id)),
}));

const by = (rows, id) => rows.filter((r) => r.accountId === id);
const env = (name, key, rows) => ({ $schema: schemaUrl(name), schemaVersion: SCHEMA_VERSION, generatedAt, [key]: rows });

const SEGMENTS = [{ id: "SMB", label: "SMB" }, { id: "ENT", label: "Enterprise" }, { id: "CH-SLV", label: "Channel" }];
const INDUSTRIES = [];
for (const a of accounts) if (!INDUSTRIES.some((i) => i.id === a.industryId)) INDUSTRIES.push({ id: a.industryId, label: a.industryLabel });

const index = {
  $schema: schemaUrl("accounts-index"), schemaVersion: SCHEMA_VERSION, generatedAt,
  defaultAccountId: (accounts.find((a) => a.isDefault) ?? accounts[0]).id,
  order: accounts.map((a) => a.id),
  segments: SEGMENTS,
  industries: INDUSTRIES,
  accounts: Object.fromEntries(accounts.map((a) => [a.id, {
    id: a.id, name: a.name, brandName: a.brandName, segment: a.segment, segmentLabel: a.segmentLabel,
    industryId: a.industryId, industryLabel: a.industryLabel, purchasedLocations: a.purchasedLocations,
    hqLabel: `${a.hq.city}, ${a.hq.state}`, quickScenario: a.quickScenario, branding: a.branding,
    counts: { locations: by(locations, a.id).length, contacts: by(contacts, a.id).length, reviews: by(reviews, a.id).length },
    listingSummary: a.listingSummary,
    bundleUrl: fileUrl(`v1/accounts/${a.id}.json`),
  }])),
};
const branding = { $schema: schemaUrl("branding"), schemaVersion: SCHEMA_VERSION, generatedAt, branding: Object.fromEntries(accounts.map((a) => [a.id, { ...a.branding, tone: a.tone }])) };

// ---- write v1 ----
const V1 = path.join(ROOT, "v1");
fs.rmSync(V1, { recursive: true, force: true });
fs.mkdirSync(path.join(V1, "accounts"), { recursive: true });
fs.mkdirSync(path.join(V1, "logos"), { recursive: true });
const write = (rel, obj) => fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(obj, null, 2) + "\n");

write("v1/accounts-index.json", index);
write("v1/accounts.json", env("accounts", "accounts", accounts));
write("v1/branding.json", branding);
write("v1/locations.json", env("locations", "locations", locations));
write("v1/contacts.json", env("contacts", "contacts", contacts));
write("v1/reviews.json", env("reviews", "reviews", reviews));
for (const a of accounts) {
  write(`v1/accounts/${a.id}.json`, { $schema: schemaUrl("account-bundle"), schemaVersion: SCHEMA_VERSION, generatedAt, account: a, locations: by(locations, a.id), contacts: by(contacts, a.id), reviews: by(reviews, a.id) });
  fs.writeFileSync(path.join(V1, "logos", `${a.id}.svg`), logoSvg(a));
}

const allDates = [...locations.map((l) => l.createdOn), ...contacts.flatMap((c) => [c.createdOn, c.lastActivity]), ...reviews.flatMap((r) => [r.date, r.reply?.date].filter(Boolean))].sort();
write("v1/index.json", {
  $schema: schemaUrl("manifest"), schemaVersion: SCHEMA_VERSION, generatedAt,
  dateWindow: { oldest: allDates[0], newest: allDates.at(-1), maxDaysAgo: 120 },
  baseUrl: BASE_URL,
  files: {
    accountsIndex: fileUrl("v1/accounts-index.json"), accounts: fileUrl("v1/accounts.json"), branding: fileUrl("v1/branding.json"),
    locations: fileUrl("v1/locations.json"), contacts: fileUrl("v1/contacts.json"), reviews: fileUrl("v1/reviews.json"),
    accountBundle: fileUrl("v1/accounts/{accountId}.json"), logo: fileUrl("v1/logos/{accountId}.svg"), schemas: fileUrl("schemas/"),
  },
  counts: { accounts: accounts.length, locations: locations.length, contacts: contacts.length, reviews: reviews.length, listings: locations.reduce((x, l) => x + l.listings.length, 0) },
  distributions: { version: D.version, seed: D.seed, specialHoursWindow: specialHoursWindowFor() },
});

// ---- per-account briefs (no dates, so they only change when source changes) ----
fs.mkdirSync(path.join(ROOT, "docs", "accounts"), { recursive: true });
// drop briefs for ids that no longer exist (renamed or removed accounts)
for (const f of fs.readdirSync(path.join(ROOT, "docs", "accounts"))) if (/^acct-.*\.md$/.test(f) && !accounts.some((a) => `${a.id}.md` === f)) fs.rmSync(path.join(ROOT, "docs", "accounts", f));
for (const a of accounts) fs.writeFileSync(path.join(ROOT, "docs", "accounts", `${a.id}.md`), brief(a));
fs.writeFileSync(path.join(ROOT, "docs", "accounts", "README.md"), briefIndex());

console.log(`generated v1 for ${buildDate}: ${accounts.length} accounts, ${locations.length} locations, ${contacts.length} contacts, ${reviews.length} reviews`);
console.log(`date window: ${allDates[0]} .. ${allDates.at(-1)}`);
console.log(`curation: ${curationStats.converted} reviews re-rated from templates, ${curationStats.repliesAdded} templated replies added, ${curationStats.repliesWithheld ?? 0} replies withheld (would post after build time)`);

function specialHoursWindowFor() { const h = D.common.holidays; return { from: new Date(anchor - h.windowDaysBefore * DAY).toISOString().slice(0, 10), to: new Date(anchor + h.windowDaysAfter * DAY).toISOString().slice(0, 10) }; }

function logoSvg(a) {
  const { primary, onPrimary, accent } = a.branding.colors;
  const t = a.branding.logo.initials;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${esc(a.brandName)} logo placeholder">
  <rect width="128" height="128" rx="28" fill="${primary}"/>
  <rect x="20" y="98" width="88" height="6" rx="3" fill="${accent}"/>
  <text x="64" y="76" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="${t.length > 2 ? 40 : 52}" font-weight="700" fill="${onPrimary}">${esc(t)}</text>
</svg>
`;
}

function brief(a) {
  const locs = by(locations, a.id), cts = by(contacts, a.id), revs = by(reviews, a.id);
  const avg = (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1);
  const types = [...new Set(cts.map((c) => c.contactType))].join(", ");
  const listRows = locs.map((l) => `| ${l.index} | ${l.businessStatusLabel} | ${[l.categories.primary, ...l.categories.secondary].join(", ")} | ${l.listings.map((s) => `${s.site}: ${s.rating ?? "–"} · ${s.reviewCount} · ${s.claimed ? (s.verified ? "verified" : "claimed") : "unclaimed"}`).join("; ")} | ${l.coordinates.lat}, ${l.coordinates.lng} |`).join("\n");
  const locRows = locs.map((l) => `| ${l.index} | ${l.name} | ${l.address.street1}${l.address.street2 ? ", " + l.address.street2 : ""}, ${l.address.city}, ${l.address.state} ${l.address.zip} | ${l.phone} | ${l.status} |`).join("\n");
  return `<!-- Generated by scripts/generate.mjs from source/*.json. Do not edit by hand. -->
# ${a.name}

\`${a.id}\` · ${a.segmentLabel} · ${a.industryLabel}${a.isDefault ? " · **default account**" : ""}${a.quickScenario ? " · quick scenario" : ""}

> ${a.llmContext}

## Business

- **Brand name:** ${a.brandName} (${a.branding.tagline})
- **Parent group:** ${a.parentGroup}
- **Tier:** ${a.tier}
- **CRM:** ${a.crm}
- **HQ:** ${a.profile.address.street1}${a.profile.address.street2 ? ", " + a.profile.address.street2 : ""}, ${a.profile.address.city}, ${a.profile.address.state} ${a.profile.address.zip}
- **Phone / email / web:** ${a.profile.phone} · ${a.profile.email} · ${a.profile.website}
- **Categories:** ${a.profile.categories.join(", ")}
- **Purchased locations:** ${a.purchasedLocations} (location rows: ${locs.length})

${a.profile.description}

## Brand and tone

- **Colors:** primary \`${a.branding.colors.primary}\`, secondary \`${a.branding.colors.secondary}\`, accent \`${a.branding.colors.accent}\`, text on primary \`${a.branding.colors.onPrimary}\`
- **Logo placeholder:** monogram "${a.branding.logo.initials}" at [\`${a.branding.logo.path}\`](${a.branding.logo.url})
- **Voice:** ${a.tone.voice}
- **Formality:** ${a.tone.formality}
- **Review reply sign-off:** ${a.tone.replySignoff}
- **Named staff (use these in UI copy):** ${a.staff.join(", ")}
- **Typical services:** ${a.services.join("; ")}

## Data at a glance

- Contacts: ${cts.length} (${types})
- Reviews: ${revs.length}, average ${avg}★, ${revs.filter((r) => r.reply).length} with replies
- Listings (invented, schema 1.1.0): ${a.listingSummary.listings} across ${a.listingSummary.locations} location${a.listingSummary.locations === 1 ? "" : "s"}, ${a.listingSummary.claimedListings} claimed, ${a.listingSummary.verifiedListings} verified; ${a.listingSummary.totalReviews} public reviews, average ${a.listingSummary.averageRating ?? "n/a"}★; ${a.listingSummary.photoCount} photos
- Bundle: [\`v1/accounts/${a.id}.json\`](${fileUrl(`v1/accounts/${a.id}.json`)})

## Locations

| # | Name | Address | Phone | Status |
|---|---|---|---|---|
${locRows}

## Listings

| # | Business status | Categories | Listings (site: rating · reviews · claimed) | Coordinates |
|---|---|---|---|---|
${listRows}

Special hours are in the bundle (\`specialHours\`). They are dated, so they are not repeated here.

## Prompt snippet

\`\`\`text
Active business context: ${a.llmContext}
Brand: ${a.brandName}. Voice: ${a.tone.voice}
Use only this account's locations, contacts, and reviews from ${fileUrl(`v1/accounts/${a.id}.json`)}.
\`\`\`
`;
}

function briefIndex() {
  const rows = accounts.map((a) => `| [${a.name}](./${a.id}.md) | \`${a.id}\` | ${a.segmentLabel} | ${a.industryLabel} | ${a.purchasedLocations} |${a.quickScenario ? " ✓" : ""} |`).join("\n");
  return `<!-- Generated by scripts/generate.mjs. Do not edit by hand. -->
# Account briefs

| Account | ID | Segment | Industry | Locations | Quick scenario |
|---|---|---|---|---|---|
${rows}
`;
}
