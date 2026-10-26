// Rebuilds scripts/lib/city-stoplist.json: the US place names (from us-places-20k.json and geo.mjs)
// that are also a common English word or a common first name. Node built-ins only; the three source
// lists are downloaded by hand (they are not bundled):
//   node scripts/lib/derive-city-stoplist.mjs <american-english> <dist.male.first> <dist.female.first> <sub-est2023.csv>
//   <american-english>: SCOWL size-50 American word list (Debian package "wamerican" 2020.12.07,
//     /usr/share/dict/american-english; http://wordlist.aspell.net/). Only all-lowercase entries count
//     as common words, so proper nouns such as "Tyler" or "Boston" do not.
//   <dist.*.first>: U.S. Census Bureau 1990 first-name frequency files (public domain),
//     https://www2.census.gov/topics/genealogy/1990surnames/. A name counts if it ranks in the top
//     FIRST_NAME_MAX_RANK for either sex.
//   <sub-est2023.csv>: U.S. Census Bureau SUB-EST2023 (the file us-places-20k.json was built from); gives each
//     entry its largest 2023 population among same-named places, used by BIG_CITY_EXEMPT_MAX in validate.mjs.
// Only single-word place names are compared; multi-word names ("Bowling Green") are left to the normal check.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CITIES } from "./geo.mjs";

const FIRST_NAME_MAX_RANK = 1000;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [wordsFile, maleFile, femaleFile, censusFile] = process.argv.slice(2);
if (!censusFile) { console.error("usage: derive-city-stoplist.mjs <american-english> <dist.male.first> <dist.female.first> <sub-est2023.csv>"); process.exit(2); }

const places = JSON.parse(fs.readFileSync(path.join(HERE, "us-places-20k.json"), "utf8")).places;
const names = [...new Set([...Object.keys(CITIES).map((k) => k.split(", ")[0]), ...places])].filter((n) => !/\s/.test(n)).sort();
const words = new Set(fs.readFileSync(wordsFile, "utf8").split("\n").filter((w) => w && w === w.toLowerCase()));
const rank = new Map();
for (const f of [maleFile, femaleFile]) for (const line of fs.readFileSync(f, "utf8").split("\n")) {
  const p = line.trim().split(/\s+/);
  if (p.length < 4) continue;
  const n = p[0][0] + p[0].slice(1).toLowerCase();
  rank.set(n, Math.min(rank.get(n) ?? Infinity, Number(p[3])));
}
// Largest 2023 population per cleaned place name (incorporated places and consolidated cities).
const population = new Map();
const csv = fs.readFileSync(censusFile, "latin1").split("\n");
const head = csv[0].split(",");
const col = (k) => head.indexOf(k);
for (const line of csv.slice(1)) {
  const f = line.split(",");
  if (!["162", "170", "172"].includes(f[col("SUMLEV")])) continue;
  let n = f[col("NAME")].replace(" (balance)", "");
  n = n.replace(/ (city|town|village|borough|municipality|CDP|city and borough|metropolitan government|metro government|consolidated government|unified government|urban county)$/, "");
  n = n.split(/[-/]/)[0].trim();
  population.set(n, Math.max(population.get(n) ?? 0, Number(f[col("POPESTIMATE2023")])));
}
const entries = {};
for (const n of names) {
  const why = [];
  if (words.has(n.toLowerCase())) why.push("word");
  if ((rank.get(n) ?? Infinity) <= FIRST_NAME_MAX_RANK) why.push("firstName");
  if (why.length) entries[n] = { reason: why.join("+"), population: population.get(n) ?? null };
}
const out = {
  description: "Single-word US place names that are also a common English word or a common first name, with the largest 2023 population of a place of that name. The review city check flags these only when a place cue sits next to them (\"from Tyler\", \"in Mobile\", \"Tyler, TX\"), so \"Tyler at the front desk\" or \"Mobile check-in\" passes; places above BIG_CITY_EXEMPT_MAX (scripts/validate.mjs) are flagged even without a cue. Regenerate with scripts/lib/derive-city-stoplist.mjs; do not hand-edit.",
  sources: [
    "Place names: scripts/lib/us-places-20k.json (U.S. Census Bureau SUB-EST2023) plus scripts/lib/geo.mjs",
    "Common words: SCOWL size-50 American English word list (Debian wamerican 2020.12.07), all-lowercase entries only; http://wordlist.aspell.net/",
    "Populations: U.S. Census Bureau SUB-EST2023 (Vintage 2023 subcounty population estimates), POPESTIMATE2023",
    `First names: U.S. Census Bureau 1990 first-name files dist.male.first and dist.female.first, rank <= ${FIRST_NAME_MAX_RANK} for either sex; https://www2.census.gov/topics/genealogy/1990surnames/`,
  ],
  counts: { singleWordPlacesCompared: names.length, word: Object.values(entries).filter((v) => v.reason.includes("word")).length, firstName: Object.values(entries).filter((v) => v.reason.includes("firstName")).length, over500k: Object.values(entries).filter((v) => v.population > 500000).length, over250k: Object.values(entries).filter((v) => v.population > 250000).length, total: Object.keys(entries).length },
  entries,
};
fs.writeFileSync(path.join(HERE, "city-stoplist.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`city-stoplist.json: ${out.counts.total} names (${out.counts.word} common words, ${out.counts.firstName} first names) from ${names.length} single-word places`);
