# birdeye-business-context
Shared synthetic Birdeye business-context data (accounts, contacts, reviews, locations) for Myna, FOB, and Grok Bot agents. Invented businesses only.

**Base URL:** `https://craft-birdeye.github.io/birdeye-business-context/v1/`
**Live switcher demo:** https://craft-birdeye.github.io/birdeye-business-context/

The feed covers 40 invented accounts across dental, home services, legal, agency, and automotive, in SMB, Enterprise, and Channel segments: 224 locations, 330 contacts, and 338 reviews. It's plain JSON on GitHub Pages, with no package and no build step for consumers.

- Team guide (how to consume it, the switcher pattern, how to request or add accounts): [`docs/team-guide.md`](docs/team-guide.md)
- Agent skill: [`skills/business-context/SKILL.md`](skills/business-context/SKILL.md) · Rule to drop into apps: [`rules/business-context.md`](rules/business-context.md)
- Per-account briefs: [`docs/accounts/`](docs/accounts/README.md)

## Consumer contract

| URL (relative to base) | Contents | Schema |
|---|---|---|
| `index.json` | Manifest: `generatedAt`, date window, file URLs, counts (1.1.0: `counts.listings`, `distributions` with the seed and the `specialHoursWindow`) | `schemas/manifest.schema.json` |
| `accounts-index.json` | **Account switcher.** `defaultAccountId`, `order`, `segments`, `industries`, and `accounts` keyed by id (name, segment, industry, purchasedLocations, branding, counts, bundleUrl; 1.1.0: `listingSummary`) | `schemas/accounts-index.schema.json` |
| `accounts/<accountId>.json` | One account's bundle: `{ account, locations, contacts, reviews }` | `schemas/account-bundle.schema.json` |
| `accounts.json` | Full profiles: business info, HQ address, branding, tone, staff, services, `llmContext` (1.1.0: `listingSummary`) | `schemas/accounts.schema.json` |
| `locations.json` | Business-info rows, exactly `purchasedLocations` per account (1.1.0: listing-level fields, below) | `schemas/locations.schema.json` |
| `contacts.json` | Contacts, linked to their account's locations | `schemas/contacts.schema.json` |
| `reviews.json` | Reviews, distinct per account, with replies | `schemas/reviews.schema.json` |
| `branding.json` | Branding and tone keyed by account id | `schemas/branding.schema.json` |
| `logos/<accountId>.svg` | Monogram logo placeholder in brand colors | — |

**Listing-level fields (schema 1.1.0, additive).** Every location also carries invented, seeded values:

| Field | Shape | Notes |
|---|---|---|
| `coordinates` | `{ lat, lng }` | 0.3-12 km from the city center (OpenStreetMap). Not geocoded from the street address, and it can land on water or a real property. |
| `categories` | `{ primary, secondary[] }` | `primary` is the account's first category. |
| `businessStatus`, `businessStatusLabel` | `open` \| `temporarilyClosed` \| `permanentlyClosed`, plus a display label | Only non-HQ `Inactive` locations can be closed. |
| `specialHours` | `[{ date, name, closed, open?, close? }]` | US holidays from 30 days before to 90 days after the build date, so **future dates appear here**. |
| `attributes` | `[{ group, label }]` | From the industry's vocabulary in `source/distributions.json`. |
| `photoCount` | integer | Photos on the listing. |
| `listings` | `[{ site, url, claimed, verified, rating, reviewCount, ratingDistribution, sampledReviews }]` | One per site the location is listed on. `url` is on `*.example.com`. `reviewCount` and `ratingDistribution` are the listing's public totals; `sampledReviews` is how many of them are in `reviews.json`. `rating` is the distribution's mean to 1 decimal, or `null` with no reviews. |
| `reviewSummary` | `{ totalReviews, averageRating, sampledReviews, listedSites }` | Rollup of `listings`. |

Accounts carry `listingSummary` (locations, open locations, listings, claimed, verified, total reviews, average rating, photos). The distributions behind every value, with sources and which numbers are estimates, are in [`docs/distributions.md`](docs/distributions.md).

Schemas are served at `https://craft-birdeye.github.io/birdeye-business-context/schemas/`.

**Guarantees**

- **Stable ids.** Accounts use `acct-*`, locations `<accountId>-loc-<n>`, contacts `<accountId>-ct-<n>`, and reviews `<accountId>-rev-<n>`. An id never changes meaning.
- **Versioned path.** Within `/v1/`, changes are additive only: new fields or new accounts. Renames, removals, and type changes ship as `/v2/`, and `/v1/` keeps serving. `schemaVersion` is semver.
- **Fresh dates.** Every date is an ISO 8601 UTC string inside the last ~4 months of the build date. The one exception is `specialHours[].date` (a `YYYY-MM-DD` day), which runs from 30 days before to 90 days after it. Pages rebuilds on every merge to `main` and weekly, so don't cache dates across sessions or hard-code them.
- **Invented only.** Every name is web-checked against real businesses ([`docs/name-collision-checks.md`](docs/name-collision-checks.md)); the denylist also scans ids, file names, and hosts. Emails are `@example.com` or `@*.example.com`, phones are `(xxx) 555-01xx`, there are no real brands or people, and every address is complete with city, state, and ZIP in agreement.
- **Integrity.** Contacts and reviews always reference a location of the same account, and location rows always equal `purchasedLocations`.

## Fetch helper (copy and paste)

No dependencies. Works in the browser and in Node 18+. A fuller version is in [`examples/business-context.js`](examples/business-context.js).

```js
const BASE = "https://craft-birdeye.github.io/birdeye-business-context/v1";
const cache = new Map();
const getJson = (path) => {
  if (!cache.has(path)) cache.set(path, fetch(`${BASE}/${path}`).then((r) => {
    if (!r.ok) throw new Error(`business-context ${path}: ${r.status}`);
    return r.json();
  }));
  return cache.get(path);
};

export const loadAccountsIndex = () => getJson("accounts-index.json");
export async function loadAccount(id) {
  const index = await loadAccountsIndex();
  return getJson(`accounts/${index.accounts[id] ? id : index.defaultAccountId}.json`);
}
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// Usage: switcher + one account
const index = await loadAccountsIndex();
const options = index.order.map((id) => ({ id, label: index.accounts[id].name }));
const { account, locations, contacts, reviews } = await loadAccount("acct-thimbleleaf-dental");
```

## Repo layout

```
source/                 Offset-based source of truth (edit these)
  accounts.json         Accounts with branding, tone, profile, staff, services
  locations.json        Locations with createdDaysAgo
  contacts.json         Contacts with createdDaysAgo / lastActivityDaysAgo
  reviews.json          Reviews with daysAgo (+ reply.daysAgo)
  distributions.json    Seeded distributions for 1.1.0 fields and review reshaping (sources: docs/distributions.md)
  review-templates.json Invented review and reply templates used by the reshaping
v1/                     Generated, published JSON (committed snapshot; Pages regenerates)
schemas/                JSON Schemas (draft 2020-12)
scripts/generate.mjs    source/ -> v1/ (ISO dates), bundles, logos, docs/accounts/*.md
scripts/validate.mjs    All data checks; exits non-zero on failure
scripts/lib/            geo.mjs (city/state/ZIP/timezone/area codes), denylist.mjs (hashed real-name denylist,
                        CRM allowlist), us-places-20k.json (US Census city names for the review city check),
                        city-stoplist.json + derive-city-stoplist.mjs (place names that are also words or first names),
                        centers.mjs (OpenStreetMap city centers), enrich.mjs (seeded 1.1.0 enrichment)
docs/team-guide.md      How teammates consume and contribute
docs/accounts/          One generated brief per account
skills/, rules/         App-agnostic agent skill and rule
examples/               Copy-paste fetch helper
index.html              Switcher demo served at the Pages root
.github/workflows/      ci.yml (validate PRs), pages.yml (generate + validate + deploy, weekly cron)
```

## Local development

These scripts use Node built-ins only. You need Node 18 or newer, and there's nothing to install.

```bash
node scripts/generate.mjs                    # build date = today (UTC)
node scripts/generate.mjs --date 2026-10-21  # reproducible build for a given day
node scripts/validate.mjs                    # all checks; exit 1 on any failure
python3 -m http.server 8000                  # then open http://localhost:8000
```

## Hosting

Pages deploys through GitHub Actions (`.github/workflows/pages.yml`). It needs one repo setting:
**Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Privacy

These are invented businesses shaped by segment and industry patterns. They are not Birdeye customers. Never commit real customer names, ids, addresses, phones, emails, or analytics rows.
