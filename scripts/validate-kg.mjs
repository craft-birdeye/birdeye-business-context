#!/usr/bin/env node
// Validates the Lush Landscaping Knowledge Graph under v1/kg/.
// Node built-ins only. Usage: node scripts/validate-kg.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES, STATES, zipMatchesState } from "./lib/geo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIN_DAY = "2026-07-15";
const MAX_DAY = "2026-11-11";
const MIN_INSTANT = Date.parse(`${MIN_DAY}T00:00:00Z`);
const MAX_INSTANT = Date.parse(`${MAX_DAY}T23:59:59Z`);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const FIXTURE_KEYWORDS = [
  "backyard landscaping",
  "vegetable garden design",
  "above ground pool installation",
  "outdoor living spaces",
  "how to start a garden",
  "above ground pool",
  "vegetable garden",
];
const FIXTURE_SERVICES = [
  "backyard landscaping",
  "vegetable garden design",
  "above ground pool installation",
  "outdoor living spaces",
];
const LABELS = {
  "works-at": ["works at", "employs"],
  "belongs-to": ["belongs to", "contains"],
  "part-of": ["part of", "includes"],
  "department-of": ["department of", "has department"],
};
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const FILES = [
  ["locations.json", "locations"],
  ["single-location.json", "locations"],
  ["people.json", "people"],
  ["groups.json", "groups"],
  ["relationships.json", "relationships"],
  ["suggestions.json", "suggestions"],
  ["users.json", "users"],
];

const results = [];
function check(name, errors) {
  results.push({ name, errors });
  const mark = errors.length ? "✗" : "✓";
  console.log(`${mark} ${name}${errors.length ? ` (${errors.length} problem${errors.length === 1 ? "" : "s"})` : ""}`);
  for (const e of errors.slice(0, 25)) console.log(`    - ${e}`);
  if (errors.length > 25) console.log(`    … and ${errors.length - 25} more`);
}
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// Same JSON Schema 2020-12 subset as scripts/validate.mjs.
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
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errs.push(`${at}: more than ${schema.maxItems} items`);
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

function sameSet(a, b) {
  return a.length === b.length && a.every((x) => b.includes(x));
}
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  if (typeof a === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}
function inWindow(instant) { return instant >= MIN_INSTANT && instant <= MAX_INSTANT; }
function walkDates(v, where, errs) {
  if (typeof v === "string") {
    if (DATETIME.test(v)) {
      const t = Date.parse(v);
      if (Number.isNaN(t) || !inWindow(t)) errs.push(`${where}: ${v} is outside ${MIN_DAY}..${MAX_DAY}`);
    } else if (DATE.test(v)) {
      if (v < MIN_DAY || v > MAX_DAY) errs.push(`${where}: ${v} is outside ${MIN_DAY}..${MAX_DAY}`);
    }
  } else if (Array.isArray(v)) v.forEach((x, i) => walkDates(x, `${where}[${i}]`, errs));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walkDates(x, `${where}.${k}`, errs);
}
function liveValue(loc, field) {
  if (!loc) return undefined;
  if (field === "contact.phone") return loc.contact?.phone;
  if (field === "contact.website") return loc.contact?.website;
  if (field === "contact.address.street1") return loc.contact?.address?.street1;
  if (field === "basics.description") return loc.basics?.description;
  if (field === "basics.categories.additional") return (loc.basics?.categories?.additional ?? []).join(", ");
  const social = /^social\.([a-z]+)$/.exec(field);
  if (social) return loc.social?.find((s) => s.network === social[1])?.url;
  const custom = /^customFields\.([A-Za-z][A-Za-z0-9]*)$/.exec(field);
  if (custom) return loc.customFields?.find((c) => c.key === custom[1])?.value;
  const hours = /^hours\.regular\.([a-z]+)$/.exec(field);
  if (hours) {
    const row = loc.hours?.regular?.find((h) => h.day === hours[1]);
    if (!row) return undefined;
    return row.closed ? "closed" : `${row.open}-${row.close}`;
  }
  return undefined;
}

const kgDir = "v1/kg/lush-landscaping";
const docs = Object.fromEntries(FILES.map(([file, key]) => [file, readJson(`${kgDir}/${file}`)]));
const locations = docs["locations.json"].locations ?? [];
const single = docs["single-location.json"].locations ?? [];
const people = docs["people.json"].people ?? [];
const groups = docs["groups.json"].groups ?? [];
const relationships = docs["relationships.json"].relationships ?? [];
const suggestions = docs["suggestions.json"].suggestions ?? [];
const users = docs["users.json"].users ?? [];
const places = readJson("scripts/lib/us-cities-over-500k.json").places ?? [];

console.log("lush-landscaping knowledge graph\n");

// 1. Schemas
{
  const errs = [];
  for (const [file] of FILES) {
    const rel = `${kgDir}/${file}`;
    const doc = docs[file];
    if (typeof doc.$schema !== "string") { errs.push(`${rel}: missing $schema`); continue; }
    const schemaPath = path.resolve(path.dirname(path.join(ROOT, rel)), doc.$schema);
    const relSchema = path.relative(path.join(ROOT, "v1/kg/schemas"), schemaPath);
    if (relSchema.startsWith("..") || path.isAbsolute(relSchema)) errs.push(`${rel}: $schema is not under v1/kg/schemas`);
    else if (!fs.existsSync(schemaPath)) errs.push(`${rel}: schema not found ${doc.$schema}`);
    else for (const e of validateSchema(readJson(path.relative(ROOT, schemaPath)), doc)) errs.push(`${rel} ${e}`);
  }
  check(`JSON Schemas (${FILES.length} files against v1/kg/schemas)`, errs);
}

// 2. Counts, ids, fixture names
{
  const errs = [];
  const seen = new Set();
  const take = (id, kind, where) => {
    if (typeof id !== "string") { errs.push(`${where}: missing id`); return; }
    if (seen.has(id)) errs.push(`duplicate id ${id}`);
    seen.add(id);
    if (!id.startsWith(`${kind}-`)) errs.push(`${id}: expected prefix ${kind}-`);
  };
  if (locations.length !== 8) errs.push(`locations.json has ${locations.length} locations, expected 8`);
  if (single.length !== 1) errs.push(`single-location.json has ${single.length} locations, expected 1`);
  if (people.length !== 14) errs.push(`people.json has ${people.length} people, expected 14`);
  if (suggestions.length !== 9) errs.push(`suggestions.json has ${suggestions.length} suggestions, expected 9`);
  if (users.length !== 8) errs.push(`users.json has ${users.length} users, expected 8`);
  for (const l of locations) take(l.id, "loc", "locations");
  for (const p of people) take(p.id, "ppl", "people");
  for (const g of groups) take(g.id, "grp", "groups");
  for (const r of relationships) take(r.id, "rel", "relationships");
  for (const s of suggestions) take(s.id, "sug", "suggestions");
  for (const u of users) take(u.id, "usr", "users");
  const main = locations.find((l) => l.id === "loc-main-st");
  if (!main) errs.push("locations.json is missing loc-main-st");
  else if (main.basics?.name !== "Lush Landscaping — Main St") errs.push(`loc-main-st name is ${JSON.stringify(main.basics?.name)}`);
  if (single.length === 1) {
    if (single[0].id !== "loc-main-st") errs.push(`single-location.json id is ${single[0].id}`);
    else if (main && !deepEqual(single[0], main)) errs.push("single-location.json loc-main-st differs from locations.json");
  }
  for (const [file] of FILES) {
    const doc = docs[file];
    if (doc.businessName !== "Lush Landscaping") errs.push(`${file}: businessName`);
    if (doc.domain !== "lushlandscaping.com") errs.push(`${file}: domain`);
  }
  const regions = groups.filter((g) => g.kind === "region");
  const brands = groups.filter((g) => g.kind === "brand");
  if (regions.length !== 3) errs.push(`${regions.length} regions, expected 3`);
  if (brands.length !== 1) errs.push(`${brands.length} brand groups, expected 1`);
  for (const title of ["Crew Lead", "Irrigation Specialist", "Hardscape Designer", "Arborist"]) {
    if (!people.some((p) => p.title === title)) errs.push(`missing title ${title}`);
  }
  if (people.filter((p) => (p.locationIds ?? []).length >= 2).length < 3) errs.push("fewer than 3 people work at 2 or more locations");
  check("Counts, stable ids, and the Myna fixture name", errs);
}

// 3. References, profile shape, dates, cities
{
  const errs = [];
  const locById = new Map(locations.map((l) => [l.id, l]));
  const regions = groups.filter((g) => g.kind === "region");
  const regionById = new Map(regions.map((g) => [g.id, g]));
  const userById = new Map(users.map((u) => [u.id, u]));
  const big = readJson("scripts/lib/us-cities-over-500k.json");
  if (big.threshold !== 500000) errs.push(`city list threshold is ${big.threshold}`);
  for (const p of places) if (!(p.population > 500000)) errs.push(`blocklist ${p.city}, ${p.state} population ${p.population} is not over 500000`);
  for (const [city, state] of [["Houston", "TX"], ["Phoenix", "AZ"], ["Dallas", "TX"], ["Austin", "TX"], ["Charlotte", "NC"], ["Denver", "CO"], ["Mesa", "AZ"], ["Raleigh", "NC"]]) {
    if (!places.some((p) => p.city === city && p.state === state && p.population > 500000)) errs.push(`blocklist missing ${city}, ${state}`);
  }
  for (const [city, state] of [["Colorado Springs", "CO"], ["Omaha", "NE"], ["McMinnville", "OR"], ["Keizer", "OR"], ["Redmond", "OR"], ["Logan", "UT"], ["St. George", "UT"], ["Asheville", "NC"], ["Gastonia", "NC"]]) {
    if (places.some((p) => p.city === city && p.state === state)) errs.push(`${city}, ${state} is listed as over 500,000`);
  }
  for (const file of FILES.map(([f]) => f)) walkDates(docs[file], file, errs);
  for (const l of locations) {
    const ad = l.contact?.address ?? {};
    const where = l.id ?? "(location)";
    const hit = places.find((p) => p.city.toLowerCase() === String(ad.city).toLowerCase() && p.state.toUpperCase() === String(ad.state).toUpperCase());
    if (hit) errs.push(`${where}: ${ad.city}, ${ad.state} has population ${hit.population}, over 500,000`);
    if (!STATES[ad.state]) errs.push(`${where}: unknown state ${ad.state}`);
    else if (STATES[ad.state].name !== ad.stateName) errs.push(`${where}: stateName ${ad.stateName} != ${STATES[ad.state].name}`);
    if (!zipMatchesState(ad.postalCode, ad.state)) errs.push(`${where}: ZIP ${ad.postalCode} is not a ${ad.state} ZIP`);
    const geo = CITIES[`${ad.city}, ${ad.state}`];
    if (!geo) errs.push(`${where}: "${ad.city}, ${ad.state}" is not in scripts/lib/geo.mjs CITIES`);
    else if (!geo.zips.includes(ad.postalCode)) errs.push(`${where}: ZIP ${ad.postalCode} is not listed for ${ad.city}, ${ad.state}`);
    const ac = String(l.contact?.phone ?? "").slice(1, 4);
    if (geo && !geo.areaCodes.includes(ac)) errs.push(`${where}: area code ${ac} not used in ${ad.city}, ${ad.state}`);
    if (!sameSet(l.basics?.keywords ?? [], FIXTURE_KEYWORDS)) errs.push(`${where}: keywords are not the Myna fixture set`);
    for (const svc of FIXTURE_SERVICES) if (!(l.basics?.services ?? []).includes(svc)) errs.push(`${where}: missing service ${svc}`);
    const additional = l.basics?.categories?.additional ?? [];
    if (new Set(additional).size !== additional.length) errs.push(`${where}: duplicate additional categories`);
    if (additional.includes(l.basics?.categories?.primary)) errs.push(`${where}: additional categories include the primary`);
    const days = (l.hours?.regular ?? []).map((h) => h.day);
    if (!sameSet(days, DAYS)) errs.push(`${where}: regular hours are not the seven weekdays`);
    for (const h of l.hours?.regular ?? []) {
      if (h.closed && (h.open || h.close)) errs.push(`${where}: ${h.day} is closed but has times`);
      if (!h.closed && !(h.open && h.close && h.open < h.close)) errs.push(`${where}: ${h.day} needs open < close`);
    }
    const seenDates = new Set();
    for (const h of l.hours?.special ?? []) {
      if (seenDates.has(h.date)) errs.push(`${where}: duplicate special hours ${h.date}`);
      seenDates.add(h.date);
      if (h.closed && (h.open || h.close)) errs.push(`${where}: special ${h.date} is closed but has times`);
      if (!h.closed && !(h.open && h.close && h.open < h.close)) errs.push(`${where}: special ${h.date} needs open < close`);
    }
    const networks = (l.social ?? []).map((s) => s.network);
    for (const n of ["facebook", "instagram", "linkedin", "youtube", "x"]) if (!networks.includes(n)) errs.push(`${where}: missing ${n}`);
    if (new Set(networks).size !== networks.length) errs.push(`${where}: duplicate social network`);
  }
  const member = new Map();
  for (const g of regions) for (const id of g.locationIds ?? []) {
    if (!locById.has(id)) errs.push(`${g.id}: unknown location ${id}`);
    else if (member.has(id)) errs.push(`${id} is in ${member.get(id)} and ${g.id}`);
    else member.set(id, g.id);
  }
  for (const l of locations) if (!member.has(l.id)) errs.push(`${l.id} is not in a region`);
  for (const g of regions) if (g.regionIds) errs.push(`${g.id}: a region must not carry regionIds`);
  const brand = groups.find((g) => g.kind === "brand");
  if (brand) {
    if (brand.locationIds) errs.push(`${brand.id}: the brand must not carry locationIds`);
    if (!sameSet(brand.regionIds ?? [], regions.map((g) => g.id))) errs.push(`${brand.id}: regionIds are not the three regions`);
    for (const id of brand.regionIds ?? []) if (!regionById.has(id)) errs.push(`${brand.id}: unknown region ${id}`);
  }
  for (const p of people) {
    const ids = p.locationIds ?? [];
    if (new Set(ids).size !== ids.length) errs.push(`${p.id}: duplicate locationIds`);
    for (const id of ids) if (!locById.has(id)) errs.push(`${p.id}: unknown location ${id}`);
  }
  for (const u of users) {
    if (u.role === "Location Manager") {
      if (!(u.locationIds ?? []).length) errs.push(`${u.id}: Location Manager has no locationIds`);
      if (u.regionIds) errs.push(`${u.id}: Location Manager must not carry regionIds`);
    } else if (u.role === "Regional Manager") {
      if (!(u.regionIds ?? []).length) errs.push(`${u.id}: Regional Manager has no regionIds`);
      if (u.locationIds) errs.push(`${u.id}: Regional Manager must not carry locationIds`);
    } else if (u.locationIds || u.regionIds) errs.push(`${u.id}: ${u.role} must not carry location or region scope`);
    for (const id of u.locationIds ?? []) if (!locById.has(id)) errs.push(`${u.id}: unknown location ${id}`);
    for (const id of u.regionIds ?? []) if (!regionById.has(id)) errs.push(`${u.id}: unknown region ${id}`);
    if (u.locationIds && new Set(u.locationIds).size !== u.locationIds.length) errs.push(`${u.id}: duplicate locationIds`);
    if (u.regionIds && new Set(u.regionIds).size !== u.regionIds.length) errs.push(`${u.id}: duplicate regionIds`);
  }
  if (users.filter((u) => u.role === "Location Manager").length < 2) errs.push("fewer than 2 Location Managers");
  for (const role of ["Account Owner", "Admin", "Regional Manager", "Location Manager", "Viewer"]) {
    if (!users.some((u) => u.role === role)) errs.push(`missing role ${role}`);
  }
  const emails = users.map((u) => u.email);
  if (new Set(emails).size !== emails.length) errs.push("duplicate user emails");
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  for (const s of suggestions) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    if (!locById.has(s.locationId)) errs.push(`${s.id}: unknown location ${s.locationId}`);
    if (!userById.has(s.submittedBy)) errs.push(`${s.id}: unknown submittedBy ${s.submittedBy}`);
    const live = liveValue(locById.get(s.locationId), s.field);
    if (live === undefined) errs.push(`${s.id}: cannot resolve field ${s.field}`);
    else if (s.status === "approved") { if (live !== s.suggestedValue) errs.push(`${s.id}: approved suggestion is not the live ${s.field}`); }
    else if (live !== s.currentValue) errs.push(`${s.id}: ${s.status} suggestion currentValue is not the live ${s.field}`);
    if (s.currentValue === s.suggestedValue) errs.push(`${s.id}: suggestedValue equals currentValue`);
    if (s.status === "pending") {
      for (const k of ["reviewedBy", "reviewedAt", "reason"]) if (k in s) errs.push(`${s.id}: pending suggestion has ${k}`);
    } else {
      if (!userById.has(s.reviewedBy)) errs.push(`${s.id}: unknown reviewedBy ${s.reviewedBy}`);
      if (!s.reviewedAt) errs.push(`${s.id}: missing reviewedAt`);
      else if (s.submittedAt && s.reviewedAt < s.submittedAt) errs.push(`${s.id}: reviewedAt before submittedAt`);
    }
  }
  for (const [status, n] of Object.entries(byStatus)) if (n !== 3) errs.push(`${n} ${status} suggestions, expected 3`);
  check("References, fixture keywords, dates, and cities under 500,000", errs);
}

// 4. Relationships match people and groups
{
  const errs = [];
  const locIds = new Set(locations.map((l) => l.id));
  const personById = new Map(people.map((p) => [p.id, p]));
  const regions = new Map(groups.filter((g) => g.kind === "region").map((g) => [g.id, g]));
  const brand = groups.find((g) => g.kind === "brand");
  const works = new Map();
  const belongs = new Map();
  const parts = new Map();
  let departments = 0;
  for (const r of relationships) {
    if ("strength" in r || "source" in r) errs.push(`${r.id}: strength and source are not allowed`);
    const labels = LABELS[r.type];
    if (!labels) { errs.push(`${r.id}: unknown type ${r.type}`); continue; }
    if (r.forwardLabel !== labels[0] || r.reverseLabel !== labels[1]) errs.push(`${r.id}: labels ${JSON.stringify(r.forwardLabel)} / ${JSON.stringify(r.reverseLabel)}`);
    if (r.type === "works-at") {
      const person = personById.get(r.from);
      if (!person) errs.push(`${r.id}: from ${r.from} is not a person`);
      if (!locIds.has(r.to)) errs.push(`${r.id}: to ${r.to} is not a location`);
      const key = `${r.from}|${r.to}`;
      if (works.has(key)) errs.push(`${r.id}: duplicate works-at ${key}`);
      works.set(key, r.id);
      if (person && !(person.locationIds ?? []).includes(r.to)) errs.push(`${r.id}: ${r.from} does not list ${r.to} in people.json`);
    } else if (r.type === "belongs-to") {
      if (!locIds.has(r.from)) errs.push(`${r.id}: from ${r.from} is not a location`);
      if (!regions.has(r.to)) errs.push(`${r.id}: to ${r.to} is not a region`);
      if (belongs.has(r.from)) errs.push(`${r.from} belongs to ${belongs.get(r.from)} and ${r.to}`);
      belongs.set(r.from, r.to);
    } else if (r.type === "part-of") {
      if (!regions.has(r.from)) errs.push(`${r.id}: from ${r.from} is not a region`);
      if (!brand || r.to !== brand.id) errs.push(`${r.id}: to ${r.to} is not the brand group`);
      if (parts.has(r.from)) errs.push(`${r.from} is part of more than one group`);
      parts.set(r.from, r.to);
    } else if (r.type === "department-of") {
      departments += 1;
      if (!locIds.has(r.from) || !locIds.has(r.to)) errs.push(`${r.id}: department-of endpoints must be locations`);
      if (r.from === r.to) errs.push(`${r.id}: a location cannot be a department of itself`);
      const child = locations.find((l) => l.id === r.from);
      const parent = locations.find((l) => l.id === r.to);
      if (child && parent) {
        if (child.contact.address.street1 !== parent.contact.address.street1 || child.contact.address.city !== parent.contact.address.city) errs.push(`${r.id}: ${r.from} is not at the same street as ${r.to}`);
      }
    }
  }
  if (departments < 1) errs.push("missing a department-of link");
  for (const p of people) for (const id of p.locationIds ?? []) {
    if (!works.has(`${p.id}|${id}`)) errs.push(`${p.id} lists ${id} but has no works-at link`);
  }
  for (const l of locations) {
    const regionId = belongs.get(l.id);
    if (!regionId) errs.push(`${l.id} has no belongs-to link`);
    else if (!(regions.get(regionId)?.locationIds ?? []).includes(l.id)) errs.push(`${l.id} belongs to ${regionId}, which does not list it`);
  }
  for (const [id, g] of regions) {
    if (parts.get(id) !== brand?.id) errs.push(`${id} is not part of the brand group`);
    for (const locId of g.locationIds ?? []) if (belongs.get(locId) !== id) errs.push(`${id} lists ${locId}, but that location does not belong to it`);
  }
  check("People and relationship links agree", errs);
}

const failed = results.filter((r) => r.errors.length);
console.log("\nRow counts:");
for (const [file, key] of FILES) console.log(`  ${file.padEnd(24)} ${String((docs[file][key] ?? []).length).padStart(3)}`);
const typeCounts = {};
for (const r of relationships) typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
console.log(`  relationships by type: ${Object.entries(typeCounts).map(([k, n]) => `${k} ${n}`).join(", ")}`);
console.log(failed.length ? `\nFAILED: ${failed.length} of ${results.length} checks` : `\nPASSED: all ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
