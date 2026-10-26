#!/usr/bin/env node
// Validates generated data in v1/ (and the source it came from). Node built-ins only.
// Usage: node scripts/validate.mjs [--date YYYY-MM-DD] [--max-age-days N]
//   --date          reference "build date" (default: v1/index.json generatedAt)
//   --max-age-days  also fail if generatedAt is older than N days before today (freshness check)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES, STATES, zipMatchesState } from "./lib/geo.mjs";
import { denylistHit, SKIP_KEYS, KNOWN_CRM_PRODUCTS } from "./lib/denylist.mjs";
import { CENTERS } from "./lib/centers.mjs";
import { haversineKm, histogramRating, round1, profileKeyFor, holidaysForYear, slugify } from "./lib/enrich.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const DAY = 86400000;
const WINDOW_DAYS = 120; // "last 3 to 4 months"

const results = [];
function check(name, errors) {
  results.push({ name, errors });
  const mark = errors.length ? "✗" : "✓";
  console.log(`${mark} ${name}${errors.length ? ` (${errors.length} problem${errors.length === 1 ? "" : "s"})` : ""}`);
  for (const e of errors.slice(0, 25)) console.log(`    - ${e}`);
  if (errors.length > 25) console.log(`    … and ${errors.length - 25} more`);
}
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// ---------- tiny JSON Schema (2020-12 subset) validator ----------
function validateSchema(schema, value, at = "$", root = schema, errs = []) {
  if (schema.$ref) return validateSchema(resolveRef(root, schema.$ref), value, at, root, errs);
  const t = typeOf(value);
  if (schema.const !== undefined && value !== schema.const) errs.push(`${at}: expected const ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errs.push(`${at}: ${JSON.stringify(value)} not in enum`);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((x) => x === t || (x === "number" && t === "integer"))) { errs.push(`${at}: expected ${types.join("|")}, got ${t}`); return errs; }
  }
  if (t === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errs.push(`${at}: shorter than ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errs.push(`${at}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) errs.push(`${at}: invalid date-time`);
    if (schema.format === "uri" && !/^https?:\/\/\S+$/.test(value)) errs.push(`${at}: invalid uri`);
  }
  if (t === "integer" || t === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errs.push(`${at}: < ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errs.push(`${at}: > ${schema.maximum}`);
  }
  if (t === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) errs.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.items) value.forEach((v, i) => validateSchema(schema.items, v, `${at}[${i}]`, root, errs));
  }
  if (t === "object") {
    for (const r of schema.required ?? []) if (!(r in value)) errs.push(`${at}: missing required "${r}"`);
    const keys = Object.keys(value);
    if (schema.minProperties !== undefined && keys.length < schema.minProperties) errs.push(`${at}: fewer than ${schema.minProperties} properties`);
    for (const k of keys) {
      if (schema.propertyNames) validateSchema(schema.propertyNames, k, `${at}{${k}}`, root, errs);
      if (schema.properties?.[k]) validateSchema(schema.properties[k], value[k], `${at}.${k}`, root, errs);
      else if (schema.additionalProperties === false) errs.push(`${at}: unexpected property "${k}"`);
      else if (typeof schema.additionalProperties === "object") validateSchema(schema.additionalProperties, value[k], `${at}.${k}`, root, errs);
    }
  }
  return errs;
}
function typeOf(v) { if (v === null) return "null"; if (Array.isArray(v)) return "array"; if (Number.isInteger(v)) return "integer"; return typeof v; }
function resolveRef(root, ref) { return ref.replace(/^#\//, "").split("/").reduce((o, k) => o[k], root); }

// ---------- load ----------
const manifest = readJson("v1/index.json");
const index = readJson("v1/accounts-index.json");
const accountsDoc = readJson("v1/accounts.json");
const brandingDoc = readJson("v1/branding.json");
const locationsDoc = readJson("v1/locations.json");
const contactsDoc = readJson("v1/contacts.json");
const reviewsDoc = readJson("v1/reviews.json");
const accounts = accountsDoc.accounts, locations = locationsDoc.locations, contacts = contactsDoc.contacts, reviews = reviewsDoc.reviews;
const bundles = accounts.map((a) => ({ id: a.id, doc: fs.existsSync(path.join(ROOT, `v1/accounts/${a.id}.json`)) ? readJson(`v1/accounts/${a.id}.json`) : null }));

const refDateStr = arg("--date") ?? manifest.generatedAt.slice(0, 10);
const refEnd = Date.parse(`${refDateStr}T23:59:59Z`);
const refStart = Date.parse(`${refDateStr}T00:00:00Z`) - WINDOW_DAYS * DAY;
console.log(`birdeye-business-context validation · reference date ${refDateStr} · window ${WINDOW_DAYS} days\n`);

// 1. Schemas
{
  const errs = [];
  const pairs = [["accounts-index", index, "v1/accounts-index.json"], ["accounts", accountsDoc, "v1/accounts.json"], ["branding", brandingDoc, "v1/branding.json"], ["locations", locationsDoc, "v1/locations.json"], ["contacts", contactsDoc, "v1/contacts.json"], ["reviews", reviewsDoc, "v1/reviews.json"], ["manifest", manifest, "v1/index.json"]];
  for (const b of bundles) if (b.doc) pairs.push(["account-bundle", b.doc, `v1/accounts/${b.id}.json`]);
  for (const [name, doc, file] of pairs) {
    const schema = readJson(`schemas/${name}.schema.json`);
    for (const e of validateSchema(schema, doc)) errs.push(`${file} ${e}`);
  }
  check(`JSON Schemas (${pairs.length} files against schemas/*.schema.json)`, errs);
}

// 2. Stable, unique IDs
{
  const errs = [];
  const seen = new Set();
  for (const [kind, rows] of [["account", accounts], ["location", locations], ["contact", contacts], ["review", reviews]]) {
    for (const r of rows) { if (seen.has(r.id)) errs.push(`duplicate ${kind} id ${r.id}`); seen.add(r.id); }
  }
  for (const l of locations) if (l.id !== `${l.accountId}-loc-${l.index}`) errs.push(`location id ${l.id} != ${l.accountId}-loc-${l.index}`);
  for (const c of contacts) if (!c.id.startsWith(`${c.accountId}-ct-`)) errs.push(`contact id ${c.id} not prefixed by its account`);
  for (const r of reviews) if (!r.id.startsWith(`${r.accountId}-rev-`)) errs.push(`review id ${r.id} not prefixed by its account`);
  check("Stable, unique IDs", errs);
}

// 3. Invented-only
{
  const errs = [];
  // Denylisted names are stored as salted hashes (scripts/lib/denylist.mjs); every 1-5 word n-gram of each
  // string, its run-together form (ids, slugs, hosts, file names), and example.com host-label prefixes are hashed and looked up.
  const walk = (v, where, key) => {
    if (typeof v === "string") {
      if (!SKIP_KEYS.has(key)) {
        const hit = denylistHit(v);
        if (hit) errs.push(`${where}: denylisted real brand/name ("${hit}") in ${JSON.stringify(v.slice(0, 80))}`);
      }
    }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`, k);
  };
  const files = ["accounts.json", "locations.json", "contacts.json", "reviews.json"];
  for (const f of files) walk(readJson(`source/${f}`), `source/${f}`, "");
  walk(accountsDoc, "v1/accounts.json", ""); walk(locationsDoc, "v1/locations.json", ""); walk(contactsDoc, "v1/contacts.json", ""); walk(reviewsDoc, "v1/reviews.json", "");
  walk(readJson("v1/index.json"), "v1/index.json", ""); walk(readJson("v1/accounts-index.json"), "v1/accounts-index.json", "");
  // file names under v1/ and docs/accounts/ carry account ids too
  for (const dir of ["v1/accounts", "v1/logos", "docs/accounts"]) for (const f of fs.readdirSync(path.join(ROOT, dir))) walk(`${dir}/${f}`, `${dir}/`, "path");
  // CRM labels: only known products (allowlist in scripts/lib/denylist.mjs), on top of the denylist walk above
  for (const [where, list] of [["source/accounts.json", readJson("source/accounts.json").accounts], ["v1/accounts.json", accounts]])
    for (const a of list) for (const p of String(a.crm ?? "").split(" / ")) if (!KNOWN_CRM_PRODUCTS.has(p)) errs.push(`${where} ${a.id}: crm "${p}" is not a known CRM product (KNOWN_CRM_PRODUCTS in scripts/lib/denylist.mjs)`);
  // emails, phones, websites
  const EMAIL = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)*example\.com$/;
  const PHONE = /^\(\d{3}\) 555-01\d{2}$/;
  const WEB = /^https:\/\/([a-z0-9-]+\.)*example\.com(\/|$)/;
  const scan = (v, where) => {
    if (typeof v === "string") {
      for (const m of v.match(/[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? []) if (!EMAIL.test(m)) errs.push(`${where}: non-example.com email ${m}`);
      for (const m of v.match(/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g) ?? []) if (!PHONE.test(m)) errs.push(`${where}: phone not in 555-01xx range: ${m}`);
      if (/^https?:\/\//.test(v) && !WEB.test(v) && !v.startsWith(manifest.baseUrl) && !v.startsWith("https://json-schema.org/")) errs.push(`${where}: URL outside example.com: ${v}`);
    } else if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) scan(x, `${where}.${k}`);
  };
  scan(accounts, "accounts"); scan(locations, "locations"); scan(contacts, "contacts"); scan(reviews, "reviews");
  for (const c of contacts) {
    if (c.hasEmail !== Boolean(c.email)) errs.push(`${c.id}: hasEmail=${c.hasEmail} but email ${c.email ? "present" : "missing"}`);
    if (c.hasPhone !== Boolean(c.phone)) errs.push(`${c.id}: hasPhone=${c.hasPhone} but phone ${c.phone ? "present" : "missing"}`);
  }
  check("Invented-only (denylist, example.com emails/sites, 555-01xx phones)", errs);
}

// 4. Location rows == purchasedLocations
{
  const errs = [];
  for (const a of accounts) {
    const rows = locations.filter((l) => l.accountId === a.id);
    if (rows.length !== a.purchasedLocations) errs.push(`${a.id}: ${rows.length} location rows, purchasedLocations ${a.purchasedLocations}`);
    const idx = rows.map((l) => l.index).sort((x, y) => x - y);
    if (idx.some((v, i) => v !== i + 1)) errs.push(`${a.id}: location indexes not 1..n`);
    if (!rows.some((l) => l.isHeadquarters)) errs.push(`${a.id}: no headquarters location`);
    if (rows.filter((l) => l.isHeadquarters).length > 1) errs.push(`${a.id}: more than one headquarters location`);
    const names = new Set(rows.map((l) => l.name));
    if (names.size !== rows.length) errs.push(`${a.id}: duplicate location names`);
    for (const l of rows) {
      if (!l.label.startsWith(l.name)) errs.push(`${l.id}: label does not start with name`);
      if (l.locationLine !== `${l.address.city}, ${l.address.state}`) errs.push(`${l.id}: locationLine "${l.locationLine}" != address city/state`);
      if (a.purchasedLocations === 1 && l.name !== a.name) errs.push(`${l.id}: single-location account should use the account name`);
    }
  }
  check("Location rows equal purchasedLocations per account", errs);
}

// 5. Dates within the last 3-4 months
{
  const errs = [];
  const dates = [];
  const chk = (v, where) => { const t = Date.parse(v); dates.push(v); if (Number.isNaN(t)) errs.push(`${where}: bad date ${v}`); else if (t > refEnd) errs.push(`${where}: ${v} is after the build date`); else if (t < refStart) errs.push(`${where}: ${v} is more than ${WINDOW_DAYS} days before the build date`); };
  locations.forEach((l) => chk(l.createdOn, `${l.id}.createdOn`));
  contacts.forEach((c) => { chk(c.createdOn, `${c.id}.createdOn`); chk(c.lastActivity, `${c.id}.lastActivity`); if (c.lastActivity < c.createdOn) errs.push(`${c.id}: lastActivity before createdOn`); });
  reviews.forEach((r) => { chk(r.date, `${r.id}.date`); if (r.reply) { chk(r.reply.date, `${r.id}.reply.date`); if (r.reply.date < r.date) errs.push(`${r.id}: reply before review`); } });
  const gen = Date.parse(manifest.generatedAt);
  for (const doc of [index, accountsDoc, brandingDoc, locationsDoc, contactsDoc, reviewsDoc]) if (doc.generatedAt !== manifest.generatedAt) errs.push(`generatedAt mismatch across files`);
  dates.sort();
  const spanDays = Math.round((Date.parse(dates.at(-1)) - Date.parse(dates[0])) / DAY);
  if (spanDays < 75) errs.push(`dates only span ${spanDays} days; spread them across ~3-4 months`);
  const maxAge = arg("--max-age-days");
  if (maxAge !== undefined && Date.now() - gen > Number(maxAge) * DAY) errs.push(`generatedAt ${manifest.generatedAt} is older than ${maxAge} days; run scripts/generate.mjs`);
  // source offsets
  const src = (f, k) => readJson(`source/${f}`)[k];
  for (const l of src("locations.json", "locations")) if (!(l.createdDaysAgo >= 1 && l.createdDaysAgo <= 118)) errs.push(`source ${l.id}.createdDaysAgo out of 1..118`);
  for (const c of src("contacts.json", "contacts")) for (const k of ["createdDaysAgo", "lastActivityDaysAgo"]) if (!(c[k] >= 1 && c[k] <= 118)) errs.push(`source ${c.id}.${k} out of 1..118`);
  for (const r of src("reviews.json", "reviews")) if (!(r.daysAgo >= 1 && r.daysAgo <= 118)) errs.push(`source ${r.id}.daysAgo out of 1..118`);
  check(`Dates within last ${WINDOW_DAYS} days of ${refDateStr} (range ${dates[0]} .. ${dates.at(-1)}, span ${spanDays} days)`, errs);
}

// 6. Referential integrity
{
  const errs = [];
  const acc = new Map(accounts.map((a) => [a.id, a]));
  const loc = new Map(locations.map((l) => [l.id, l]));
  for (const l of locations) if (!acc.has(l.accountId)) errs.push(`${l.id}: unknown account ${l.accountId}`);
  for (const a of accounts) { const p = loc.get(a.profile.primaryLocationId); if (!p || p.accountId !== a.id) errs.push(`${a.id}: primaryLocationId ${a.profile.primaryLocationId} is not one of its locations`); else if (JSON.stringify(p.address) !== JSON.stringify(a.profile.address)) errs.push(`${a.id}: profile.address differs from its primary location`); }
  for (const c of contacts) {
    if (!acc.has(c.accountId)) errs.push(`${c.id}: unknown account ${c.accountId}`);
    for (const id of c.locationIds) { const l = loc.get(id); if (!l) errs.push(`${c.id}: unknown location ${id}`); else if (l.accountId !== c.accountId) errs.push(`${c.id}: location ${id} belongs to ${l.accountId}`); }
    if (new Set(c.locationIds).size !== c.locationIds.length) errs.push(`${c.id}: duplicate locationIds`);
    if (c.locationIds[0] !== c.primaryLocationId) errs.push(`${c.id}: primaryLocationId must be first in locationIds`);
    if (c.locationCount !== c.locationIds.length) errs.push(`${c.id}: locationCount ${c.locationCount} != ${c.locationIds.length}`);
    const a = acc.get(c.accountId); if (a && c.locationCount > a.purchasedLocations) errs.push(`${c.id}: references ${c.locationCount} locations but account has ${a.purchasedLocations}`);
    if (c.location !== loc.get(c.primaryLocationId)?.label) errs.push(`${c.id}: location label does not match primary location`);
    if (c.isLead !== (c.contactType === "Lead")) errs.push(`${c.id}: isLead/contactType mismatch`);
  }
  for (const r of reviews) {
    if (!acc.has(r.accountId)) errs.push(`${r.id}: unknown account ${r.accountId}`);
    const l = loc.get(r.locationId); if (!l) errs.push(`${r.id}: unknown location ${r.locationId}`); else if (l.accountId !== r.accountId) errs.push(`${r.id}: location ${r.locationId} belongs to ${l.accountId}`);
    if (r.location !== l?.label) errs.push(`${r.id}: location label mismatch`);
    if (r.employees !== r.employeesMentioned.length) errs.push(`${r.id}: employees != employeesMentioned.length`);
    if ((r.replyStatus === "edit") !== Boolean(r.reply)) errs.push(`${r.id}: replyStatus "${r.replyStatus}" but reply ${r.reply ? "present" : "missing"}`);
  }
  // index / branding / bundles agree with accounts
  const ids = accounts.map((a) => a.id);
  if (JSON.stringify(index.order) !== JSON.stringify(ids)) errs.push("accounts-index order != accounts.json order");
  if (Object.keys(index.accounts).sort().join() !== [...ids].sort().join()) errs.push("accounts-index keys != account ids");
  if (!acc.has(index.defaultAccountId)) errs.push(`defaultAccountId ${index.defaultAccountId} unknown`);
  if (accounts.filter((a) => a.isDefault).length !== 1) errs.push("exactly one account must have isDefault");
  for (const a of accounts) {
    const e = index.accounts[a.id];
    if (!e) continue;
    for (const k of ["name", "segment", "industryId", "purchasedLocations"]) if (e[k] !== a[k]) errs.push(`index ${a.id}.${k} mismatch`);
    if (e.counts.locations !== a.purchasedLocations) errs.push(`index ${a.id}.counts.locations != purchasedLocations`);
    if (JSON.stringify(brandingDoc.branding[a.id]?.colors) !== JSON.stringify(a.branding.colors)) errs.push(`branding.json ${a.id} differs from accounts.json`);
    if (!fs.existsSync(path.join(ROOT, a.branding.logo.path))) errs.push(`${a.id}: logo file ${a.branding.logo.path} missing`);
    if (!fs.existsSync(path.join(ROOT, `docs/accounts/${a.id}.md`))) errs.push(`${a.id}: brief docs/accounts/${a.id}.md missing`);
    const b = bundles.find((x) => x.id === a.id)?.doc;
    if (!b) errs.push(`${a.id}: bundle missing`);
    else {
      if (b.locations.length !== a.purchasedLocations) errs.push(`bundle ${a.id}: location count`);
      if (b.contacts.length !== contacts.filter((c) => c.accountId === a.id).length) errs.push(`bundle ${a.id}: contact count`);
      if (b.reviews.length !== reviews.filter((r) => r.accountId === a.id).length) errs.push(`bundle ${a.id}: review count`);
    }
    if (contacts.filter((c) => c.accountId === a.id).length < 5) errs.push(`${a.id}: fewer than 5 contacts`);
    if (reviews.filter((r) => r.accountId === a.id).length < 5) errs.push(`${a.id}: fewer than 5 reviews`);
  }
  check("Referential integrity (contacts/reviews -> locations -> accounts; index, branding, bundles, briefs)", errs);
}

// 7. Review text unique across accounts and on-brand
{
  const errs = [];
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const seen = new Map();
  for (const r of reviews) { const k = norm(r.text); if (seen.has(k)) errs.push(`${r.id} duplicates ${seen.get(k)}`); else seen.set(k, r.id); }
  // a review must not name another account's brand
  for (const r of reviews) for (const a of accounts) if (a.id !== r.accountId && a.brandName.length > 6 && new RegExp(`\\b${a.brandName.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}\\b`, "i").test(r.text)) {
    const own = accounts.find((x) => x.id === r.accountId);
    if (!own.brandName.toLowerCase().includes(a.brandName.toLowerCase())) errs.push(`${r.id} mentions another account's brand "${a.brandName}"`);
  }
  // reviews must not cite a location name the account does not have, nor another of its offices
  const rx = (t) => new RegExp(`(^|[^A-Za-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`);
  const GENERIC = new Set(["Main", "HQ"]);
  // City names: every city in scripts/lib/geo.mjs plus every US place of 20k+ people (Census, public domain;
  // see scripts/lib/us-places-20k.json), so a city the generator has never heard of (e.g. "Albuquerque") is caught.
  const US_PLACES = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/lib/us-places-20k.json"), "utf8")).places;
  const cityNames = [...new Set([...Object.keys(CITIES).map((k) => k.split(", ")[0]), ...US_PLACES])].sort((x, y) => y.length - x.length);
  const cityNameSet = new Set(cityNames);
  // Place names that are also common words or first names ("Mobile", "Surprise", "Tyler"; derived in
  // scripts/lib/city-stoplist.json) count only next to a place cue: "from Tyler", "visited Mobile", "Tyler, TX".
  // Exception: a stoplisted city above BIG_CITY_EXEMPT_MAX people ("Dallas", "Phoenix") is flagged even with no
  // cue, because a bare mention of a big city ("loved Dallas", "the Denver office") is almost always the place.
  // Final setting confirmed by Balaji K on 2026-10-21; to change it, edit this one line.
  const BIG_CITY_EXEMPT_MAX = 500000;
  const STOPLIST = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/lib/city-stoplist.json"), "utf8")).entries;
  const AMBIGUOUS = new Set(Object.keys(STOPLIST));
  const isBig = (c) => (STOPLIST[c]?.population ?? 0) > BIG_CITY_EXEMPT_MAX;
  const MOVE = "drove|drive|drives|driving|moved|move|moves|moving|came|come|comes|coming|went|go|goes|going|got|get|getting|flew|fly|flies|flying|commuted?|commutes|commuting|relocated|relocate|relocating|headed|head|heading|travel(?:l)?ed|travel(?:l)?ing|travels?|returned|returning|back";
  const CUE_BEFORE = new RegExp(`(?:^|[^A-Za-z])(?:in|from|near|outside(?: of)?|around|toward|towards|through|via|visit|visits|visited|visiting|(?:road )?trips? to|(?:${MOVE})(?: (?:up|down|over|back|out|home|all the way|here|there))?(?: to| into)?)\\s+$`, "i");
  const stateAlt = Object.entries(STATES).flatMap(([code, s]) => [code, s.name]).sort((x, y) => y.length - x.length).join("|");
  const CUE_AFTER = new RegExp(`^,?\\s+(?:${stateAlt})(?![A-Za-z])`);
  // A stoplisted word followed by one of these nouns is the ordinary word ("in Superior form"), and one followed
  // by another capitalised word that is not a state is part of a longer name ("go to Mission Bay", "Orange County").
  const ORDINARY_AFTER = /^\s+(?:form|shape|condition|quality|service|care|style|fashion|order|spirits|mood|health|taste)\b/i;
  const LONGER_NAME_AFTER = new RegExp(`^ (?!(?:${stateAlt})(?![A-Za-z]))[A-Z][a-z]`);
  // people: name words of the account's staff and of this review's reviewer and employeesMentioned. They exempt
  // only a stoplisted name with no cue next to it, so "Austin" as a reviewer passes, but a reviewer named
  // "Albuquerque Smith" does not let "from Albuquerque" through.
  const cited = (text, c, people) => {
    const g = new RegExp(`(^|[^A-Za-z])${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^A-Za-z]|$)`, "g");
    for (let m; (m = g.exec(text)); ) {
      if (!AMBIGUOUS.has(c)) return true;
      const at = m.index + m[1].length;
      const after = text.slice(at + c.length);
      const cue = CUE_BEFORE.test(text.slice(Math.max(0, at - 40), at)) || CUE_AFTER.test(after);
      if (cue) {
        if (!isBig(c) && (ORDINARY_AFTER.test(after) || LONGER_NAME_AFTER.test(after))) continue;
        return true;
      }
      if (isBig(c) && !people.has(c)) return true;
    }
    return false;
  };
  for (const r of reviews) {
    const own = locations.find((l) => l.id === r.locationId);
    if (!own) { errs.push(`${r.id}: locationId ${r.locationId} does not exist`); continue; }
    if (own.accountId !== r.accountId) { errs.push(`${r.id}: location ${own.id} belongs to another account`); continue; }
    const mine = locations.filter((l) => l.accountId === r.accountId);
    const ownNames = new Set([own.shortName, own.address.city]);
    for (const l of mine) if (l.id !== own.id && !GENERIC.has(l.shortName) && !ownNames.has(l.shortName) && !own.shortName.includes(l.shortName) && rx(l.shortName).test(r.text))
      errs.push(`${r.id} (at ${own.shortName}) cites another office "${l.shortName}"`);
    const accountCities = new Set(mine.map((l) => l.address.city));
    const people = [...(accounts.find((a) => a.id === r.accountId)?.staff ?? []), r.reviewer ?? "", ...(r.employeesMentioned ?? [])];
    const personWords = new Set(people.flatMap((n) => String(n).replace(/^Dr\. /, "").split(/\s+/)).filter(Boolean));
    // Longest names first, masking each hit, so "Chula Vista" is not also read as "Vista".
    const gx = (t) => new RegExp(`(^|[^A-Za-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^A-Za-z]|$)`, "g");
    let text = r.text;
    for (const c of [...accountCities].sort((x, y) => y.length - x.length)) text = text.replace(gx(c), (m, pre) => pre + " ".repeat(c.length));
    // A person's full name written out ("Max Fairbanks") is a person, whatever its words are: mask it. Single
    // words are not masked, so an employeesMentioned entry "Albuquerque" cannot hide "from Albuquerque", and a
    // "name" that is itself a city ("Santa Fe") is not masked either.
    const fullNames = [...new Set(people.flatMap((n) => [String(n).trim(), String(n).replace(/^Dr\. /, "").trim()]))].filter((n) => /\s/.test(n) && !cityNameSet.has(n)).sort((x, y) => y.length - x.length);
    for (const n of fullNames) text = text.replace(gx(n), (m, pre) => pre + " ".repeat(n.length));
    for (const c of cityNames) if (!accountCities.has(c) && c.length > 3 && cited(text, c, personWords)) {
      errs.push(`${r.id} cites "${c}", a city where ${r.accountId} has no location`);
      text = text.replace(gx(c), (m, pre) => pre + " ".repeat(c.length));
    }
  }
  check("Review text unique, never names another account, cites only its own offices", errs);
}

// 8. Addresses complete; city/state/ZIP/timezone/area code consistent
{
  const errs = [];
  const addrCheck = (ad, where) => {
    for (const k of ["street1", "city", "state", "stateName", "zip", "country"]) if (!ad?.[k] || !String(ad[k]).trim()) errs.push(`${where}: empty ${k}`);
    if (!ad) return null;
    if (!STATES[ad.state]) errs.push(`${where}: unknown state ${ad.state}`);
    else if (STATES[ad.state].name !== ad.stateName) errs.push(`${where}: stateName ${ad.stateName} != ${STATES[ad.state].name}`);
    if (!zipMatchesState(ad.zip, ad.state)) errs.push(`${where}: ZIP ${ad.zip} is not a ${ad.state} ZIP`);
    const geo = CITIES[`${ad.city}, ${ad.state}`];
    if (!geo) errs.push(`${where}: "${ad.city}, ${ad.state}" is not in scripts/lib/geo.mjs CITIES`);
    else if (!geo.zips.includes(ad.zip)) errs.push(`${where}: ZIP ${ad.zip} is not listed for ${ad.city}, ${ad.state}`);
    return geo;
  };
  for (const l of locations) {
    const geo = addrCheck(l.address, l.id);
    if (geo) {
      if (geo.tz !== l.timezone) errs.push(`${l.id}: timezone ${l.timezone} != ${geo.tz} for ${l.locationLine}`);
      const ac = l.phone.slice(1, 4); if (!geo.areaCodes.includes(ac)) errs.push(`${l.id}: area code ${ac} not used in ${l.locationLine}`);
    }
  }
  for (const a of accounts) {
    addrCheck(a.profile.address, `${a.id}.profile.address`);
    if (!CITIES[`${a.hq.city}, ${a.hq.state}`]) errs.push(`${a.id}: HQ ${a.hq.city}, ${a.hq.state} unknown`);
    if (!locations.some((l) => l.accountId === a.id && l.address.city === a.hq.city && l.address.state === a.hq.state)) errs.push(`${a.id}: no location in HQ city ${a.hq.city}, ${a.hq.state}`);
  }
  for (const c of contacts) if (c.phone) { const l = locations.find((x) => x.id === c.primaryLocationId); const geo = l && CITIES[l.locationLine]; if (geo && !geo.areaCodes.includes(c.phone.slice(1, 4))) errs.push(`${c.id}: area code ${c.phone.slice(1, 4)} not local to ${l.locationLine}`); }
  check("Addresses complete; city/state/ZIP/timezone/area code consistent", errs);
}

// 9. Listing-level fields (schema 1.1.0): coordinates, categories, status, special hours, attributes, listings, rollups
{
  const errs = [];
  const D = readJson("source/distributions.json"), C = D.common, V = D.display;
  const byLocSite = new Map();
  for (const r of reviews) { const k = `${r.locationId}|${r.site}`; if (!byLocSite.has(k)) byLocSite.set(k, []); byLocSite.get(k).push(r); }
  // special hours may be future-dated: their own window, 30 days before to 90 days after the reference date
  const ref = Date.parse(`${refDateStr}T00:00:00Z`);
  const shFrom = new Date(ref - C.holidays.windowDaysBefore * DAY).toISOString().slice(0, 10), shTo = new Date(ref + C.holidays.windowDaysAfter * DAY).toISOString().slice(0, 10);
  const holidayDates = {}; for (const y of [0, 1, 2].map((k) => Number(refDateStr.slice(0, 4)) - 1 + k)) for (const [n, d] of Object.entries(holidaysForYear(y))) (holidayDates[n] ??= new Set()).add(d);
  const sum = (h) => Object.values(h).reduce((x, y) => x + y, 0);
  const starSum = (h) => Object.entries(h).reduce((x, [k, n]) => x + Number(k) * n, 0);
  for (const l of locations) {
    const a = accounts.find((x) => x.id === l.accountId); if (!a) continue;
    const p = D.profiles[profileKeyFor(D, a)];
    const at = l.id;
    // coordinates within validateWithinKm of the city center
    const c = CENTERS[l.locationLine];
    if (!c) errs.push(`${at}: no city center for ${l.locationLine} in scripts/lib/centers.mjs`);
    else if (!l.coordinates) errs.push(`${at}: missing coordinates`);
    else { const km = haversineKm(c[0], c[1], l.coordinates.lat, l.coordinates.lng); if (km > C.coordinates.validateWithinKm) errs.push(`${at}: coordinates ${km.toFixed(1)} km from ${l.locationLine} center (max ${C.coordinates.validateWithinKm})`); }
    // categories
    if (l.categories?.primary !== a.profile.categories[0]) errs.push(`${at}: primary category "${l.categories?.primary}" != account primary "${a.profile.categories[0]}"`);
    const sec = l.categories?.secondary ?? [];
    if (new Set(sec).size !== sec.length || sec.includes(l.categories?.primary)) errs.push(`${at}: secondary categories repeat or include the primary`);
    for (const x of sec) if (!(p.secondaryCategories[l.categories.primary] ?? []).includes(x)) errs.push(`${at}: secondary category "${x}" not in the profile vocabulary`);
    // status: only Inactive, non-HQ locations may be closed; label matches the display map
    if (!(l.businessStatus in V.businessStatus)) errs.push(`${at}: unknown businessStatus ${l.businessStatus}`);
    else if (l.businessStatusLabel !== V.businessStatus[l.businessStatus]) errs.push(`${at}: businessStatusLabel "${l.businessStatusLabel}" != "${V.businessStatus[l.businessStatus]}"`);
    if (l.businessStatus !== "open" && (l.status !== "Inactive" || l.isHeadquarters)) errs.push(`${at}: ${l.businessStatus} but status ${l.status}${l.isHeadquarters ? " (headquarters)" : ""}`);
    // regular hours follow one of the profile's patterns
    if (!p.hoursPatterns.some((h) => JSON.stringify(h) === JSON.stringify(l.hours))) errs.push(`${at}: hours do not match any hoursPatterns of profile ${profileKeyFor(D, a)}`);
    // special hours: real holiday dates, inside their window, sane times
    const seen = new Set();
    for (const h of l.specialHours ?? []) {
      if (h.date < shFrom || h.date > shTo) errs.push(`${at}: specialHours ${h.date} outside ${shFrom}..${shTo}`);
      if (!holidayDates[h.name]?.has(h.date)) errs.push(`${at}: specialHours "${h.name}" is not on ${h.date}`);
      if (seen.has(h.date)) errs.push(`${at}: duplicate specialHours date ${h.date}`); seen.add(h.date);
      if (!h.closed && !(h.open && h.close && h.open < h.close)) errs.push(`${at}: specialHours ${h.date} needs open < close`);
      if (h.closed && (h.open || h.close)) errs.push(`${at}: specialHours ${h.date} is closed but has times`);
    }
    if (l.businessStatus === "permanentlyClosed" && (l.specialHours ?? []).length) errs.push(`${at}: permanently closed location has specialHours`);
    // attributes from the profile vocabulary, none from excluded groups
    for (const x of l.attributes ?? []) {
      if (!p.attributes.some((y) => y.group === x.group && y.label === x.label)) errs.push(`${at}: attribute ${x.group}/${x.label} not in the profile vocabulary`);
      if ((V.attributeGroupsExcluded ?? []).includes(x.group)) errs.push(`${at}: attribute group "${x.group}" is excluded`);
    }
    if (!Number.isInteger(l.photoCount) || l.photoCount < C.listingPhotos.min || l.photoCount > C.listingPhotos.max) errs.push(`${at}: photoCount ${l.photoCount} outside ${C.listingPhotos.min}..${C.listingPhotos.max}`);
    // listings: plausible against the sampled reviews
    const sites = new Set();
    for (const s of l.listings ?? []) {
      const w = `${at} ${s.site}`;
      if (sites.has(s.site)) errs.push(`${w}: duplicate site`); sites.add(s.site);
      if (!V.sites.some((x) => x.id === s.site)) errs.push(`${w}: site not in display.sites`);
      if (s.url !== V.listingUrlTemplate.replace("{site}", s.site).replace("{slug}", slugify(l.name))) errs.push(`${w}: url ${s.url} does not follow listingUrlTemplate`);
      if (s.verified && !s.claimed) errs.push(`${w}: verified but not claimed`);
      const mine = byLocSite.get(`${l.id}|${s.site}`) ?? [];
      if (s.sampledReviews !== mine.length) errs.push(`${w}: sampledReviews ${s.sampledReviews} != ${mine.length} reviews in v1/reviews.json`);
      if (s.reviewCount < mine.length) errs.push(`${w}: reviewCount ${s.reviewCount} < ${mine.length} sampled reviews`);
      if (sum(s.ratingDistribution) !== s.reviewCount) errs.push(`${w}: ratingDistribution sums to ${sum(s.ratingDistribution)}, reviewCount ${s.reviewCount}`);
      for (const st of [1, 2, 3, 4, 5]) { const k = mine.filter((r) => r.rating === st).length; if (s.ratingDistribution[st] < k) errs.push(`${w}: ${s.ratingDistribution[st]} ${st}-star in ratingDistribution but ${k} sampled`); }
      if (s.rating !== histogramRating(s.ratingDistribution)) errs.push(`${w}: rating ${s.rating} != ${histogramRating(s.ratingDistribution)} from ratingDistribution`);
      // a listing of 20+ reviews should sit near the generator's floor or above; tiny listings can be anything
      if (s.reviewCount >= 20 && s.rating < C.listingRatingSd.min - 0.3) errs.push(`${w}: rating ${s.rating} on ${s.reviewCount} reviews is below ${round1(C.listingRatingSd.min - 0.3)}`);
    }
    for (const r of reviews.filter((x) => x.locationId === l.id)) if (!sites.has(r.site)) errs.push(`${at}: review ${r.id} on ${r.site}, but the location has no ${r.site} listing`);
    const ls = l.listings ?? [], tot = ls.reduce((x, s) => x + s.reviewCount, 0);
    const rs = l.reviewSummary ?? {};
    const exp = { totalReviews: tot, averageRating: tot ? round1(ls.reduce((x, s) => x + starSum(s.ratingDistribution), 0) / tot) : null, sampledReviews: reviews.filter((x) => x.locationId === l.id).length, listedSites: ls.length };
    for (const [k, v] of Object.entries(exp)) if (rs[k] !== v) errs.push(`${at}: reviewSummary.${k} ${rs[k]} != ${v}`);
  }
  // account and index rollups
  for (const a of accounts) {
    const locs = locations.filter((l) => l.accountId === a.id), ls = locs.flatMap((l) => l.listings ?? []), tot = ls.reduce((x, s) => x + s.reviewCount, 0);
    const exp = { locations: locs.length, openLocations: locs.filter((l) => l.businessStatus === "open").length, listings: ls.length, claimedListings: ls.filter((s) => s.claimed).length, verifiedListings: ls.filter((s) => s.verified).length, totalReviews: tot, averageRating: tot ? round1(ls.reduce((x, s) => x + starSum(s.ratingDistribution), 0) / tot) : null, photoCount: locs.reduce((x, l) => x + l.photoCount, 0) };
    for (const [k, v] of Object.entries(exp)) if (a.listingSummary?.[k] !== v) errs.push(`${a.id}: listingSummary.${k} ${a.listingSummary?.[k]} != ${v}`);
    if (JSON.stringify(index.accounts[a.id]?.listingSummary) !== JSON.stringify(a.listingSummary)) errs.push(`${a.id}: accounts-index listingSummary differs from accounts.json`);
  }
  if (manifest.counts.listings !== locations.reduce((x, l) => x + (l.listings ?? []).length, 0)) errs.push(`v1/index.json counts.listings mismatch`);
  if (manifest.distributions && (manifest.distributions.specialHoursWindow.from !== shFrom || manifest.distributions.specialHoursWindow.to !== shTo)) errs.push(`v1/index.json specialHoursWindow != ${shFrom}..${shTo}`);
  check(`Listings and location details (1.1.0): coordinates within ${C.coordinates.validateWithinKm} km, ratings/counts consistent with sampled reviews, special hours ${shFrom}..${shTo}`, errs);
}

// ---------- summary ----------
const failed = results.filter((r) => r.errors.length);
console.log("\nPer-account counts (locations / purchasedLocations · contacts · reviews):");
for (const a of accounts) {
  const n = (rows) => rows.filter((r) => r.accountId === a.id).length;
  console.log(`  ${a.id.padEnd(26)} ${String(n(locations)).padStart(2)} / ${String(a.purchasedLocations).padEnd(2)} · ${String(n(contacts)).padStart(2)} contacts · ${String(n(reviews)).padStart(2)} reviews`);
}
console.log(`\nTotals: ${accounts.length} accounts, ${locations.length} locations, ${contacts.length} contacts, ${reviews.length} reviews`);
console.log(failed.length ? `\nFAILED: ${failed.length} of ${results.length} checks` : `\nPASSED: all ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
