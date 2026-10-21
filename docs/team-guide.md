# Business context: team guide

Use this guide when you build or review a Birdeye prototype, demo, or agent that needs customer data.
Every screen should feel like **one real customer account at a time**, not a random mix of names and cities.

- **Data:** https://craft-birdeye.github.io/birdeye-business-context/ (every file below is under `v1/`)
- **Repo:** https://github.com/craft-birdeye/birdeye-business-context
- **Agent skill:** [`skills/business-context/SKILL.md`](../skills/business-context/SKILL.md)
- **Rule to drop into an app:** [`rules/business-context.md`](../rules/business-context.md)
- **Per-account briefs:** [`docs/accounts/`](./accounts/README.md)

---

## 1. What's in the feed

There are 40 invented accounts: 8 per industry, mixed across the three segments. Industry labels are exactly the
`industryLabel` values in the feed: Dental and healthcare, Home services and contractors, Legal and professional
services, Advertising and agency, Automotive. Segment ids are `SMB`, `ENT` (Enterprise), and `CH-SLV` (Channel). They cover 224 locations, 330 contacts, and 338 reviews.

| Quick scenario | ID | Segment | Industry | Locations |
|---|---|---|---|---|
| Evercoast Dental Partners (default) | `acct-evercoast` | `ENT` | Dental and healthcare | 45 |
| Hearthquell Heating, Plumbing & Electrical | `acct-hearthquell-home` | `ENT` | Home services and contractors | 15 |
| Varrowmere & Associates Law Firm | `acct-varrowmere-law` | `ENT` | Legal and professional services | 5 |
| Thimbleleaf Family Dental | `acct-thimbleleaf-dental` | `SMB` | Dental and healthcare | 1 |
| Northquell Digital Partners | `acct-northquell` | `CH-SLV` | Advertising and agency | 10 |

> All account ids changed before v1 was published, because earlier names collided with real businesses
> (see [`name-collision-checks.md`](./name-collision-checks.md)). There are no aliases for the old ids;
> unknown ids fall back to `defaultAccountId`.

## 2. How a prototype consumes it

All files are plain JSON with CORS enabled (GitHub Pages). You don't need a package or a build step.

| File | Use it for |
|---|---|
| `v1/accounts-index.json` | Account switcher. Keyed by id, with branding and counts |
| `v1/accounts/<id>.json` | Everything for one account: `{ account, locations, contacts, reviews }` |
| `v1/accounts.json` | Full account profiles (business info, branding, tone, staff, services) |
| `v1/locations.json` | Business-info rows for every account |
| `v1/contacts.json` | Contacts for every account |
| `v1/reviews.json` | Reviews (with replies) for every account |
| `v1/branding.json` | Branding and tone keyed by account id, for theming without loading data |
| `v1/logos/<id>.svg` | Monogram logo placeholder in brand colors |
| `v1/index.json` | Manifest: build date, date window, URLs, and counts |
| `schemas/*.schema.json` | JSON Schemas for each file |

The smallest useful integration is the copy-paste helper in
[`examples/business-context.js`](../examples/business-context.js), which is also shown in the README:

```js
import { loadAccountsIndex, loadAccount, applyBranding, formatDate } from "./business-context.js";
const index = await loadAccountsIndex();
const { account, locations, contacts, reviews } = await loadAccount(activeAccountId ?? index.defaultAccountId);
applyBranding(account.branding);
```

### Screen mapping

| Screen | Read | Notes |
|---|---|---|
| Contacts | `contacts` | `location` holds the primary location label. `locationIds`/`locationCount` cover multi-location contacts. `createdOn` and `lastActivity` are ISO dates. |
| Reviews | `reviews` | `site`, `rating`, `reviewer`, `date`, `text`, `location`, `employeesMentioned`. When `replyStatus` is `"edit"`, a `reply` already exists. |
| Business info | `locations` + `account.profile` | The row count always equals `purchasedLocations`. Single-location accounts go straight to the profile editor. |
| Listings (1.1.0) | `locations[].listings`, `reviewSummary`, `account.listingSummary` | Per-site rating, public review count, `ratingDistribution`, claimed/verified, and an `*.example.com` URL. Also `coordinates`, `categories`, `businessStatusLabel`, `specialHours` (can be future-dated), `attributes`, `photoCount`. See `docs/distributions.md`. |
| Dashboard appearance / branding | `account.branding`, `account.tone` | Logo, brand name, colors (`primary`, `secondary`, `accent`, `onPrimary`), voice, and reply sign-off. |
| Agent prompts | `account.llmContext` | A one-line brief: name · segment · industry · HQ · locations · CRM · blurb. |

### How agents consume it

Point the agent at the skill (`skills/business-context/SKILL.md`) and give it the account id. Agents can
fetch the bundle URL directly, and the per-account brief in `docs/accounts/<id>.md` gives a readable
summary plus a ready-made prompt snippet.

## 3. The account-switcher pattern

```js
const index = await loadAccountsIndex();
// 1. List: segment → industry → account (Enterprise first, dental first, matching the old FOB switcher)
// segment is a segment id: "SMB" | "ENT" | "CH-SLV" (index.segments[].id); industry is an industryId or "all"
const segment = "ENT", industry = "dental-healthcare";
const visible = index.order
  .map((id) => index.accounts[id])
  .filter((a) => a.segment === segment && (industry === "all" || a.industryId === industry));
// 2. Switch by id, and persist it however your app likes (URL hash, localStorage, context)
setActiveAccountId(id);
// 3. Every surface re-reads its data for the new id
const bundle = await loadAccount(id);
```

Rules:

- The **id is the only key**. Never key on names, because names may be polished over time.
- Unknown or removed ids fall back to `index.defaultAccountId` (the helper does this for you).
- Quick scenarios are the accounts with `quickScenario: true`.
- Browser-only custom accounts, like FOB's "Add custom account", stay local to the app. Merge them with
  the index in the app and never write them back to this repo.

## 4. Freshness and stability

- Source files store **relative offsets** such as `daysAgo` and `createdDaysAgo`. `scripts/generate.mjs`
  turns them into absolute ISO dates relative to the build day.
- The Pages workflow regenerates on every push to `main` and **weekly (Mondays 06:17 UTC)**, so hosted
  dates always fall in the last ~4 months. The `v1/` copy committed to git is a snapshot and can be older.
- **Stability:** ids never change. Fields may be **added** within `v1` but are never renamed or removed.
  A breaking change ships as `/v2/` alongside `/v1/`. `schemaVersion` follows semver.

## 5. Requesting or contributing an account

You don't need git, a terminal, or Node for either path.

**Option A: request one (recommended).** Open a
[new-account issue](https://github.com/craft-birdeye/birdeye-business-context/issues/new?template=new-account.yml)
and fill in the form: invented name, segment, industry, HQ, how many locations and in which cities, and the
story you need to demo. A maintainer builds and validates the data and links the result in the issue.

**Option B: copy an existing account in the browser.**

1. Open the brief of the closest existing account in [`docs/accounts/`](./accounts/README.md), for example
   [`acct-thimbleleaf-dental.md`](./accounts/acct-thimbleleaf-dental.md) for a single-location practice.
2. Copy its "Business", "Brand and tone", and "Locations" sections into a new-account issue and change what you need:
   name, cities, staff, services, colors, tone, and a few review ideas in your own words.
3. Before you submit, web-search the business name you invented. If a real business with that name
   comes up, pick another one. Use only `@example.com` emails and `(xxx) 555-01xx` phones.
4. Submit the issue. The maintainer turns it into `source/*.json` rows, runs the validator, and opens the PR.

Maintainers (git users) follow the checklist in `.github/pull_request_template.md`: edit `source/*.json`
only, add exactly `purchasedLocations` rows, add any new city to `scripts/lib/geo.mjs`, then run
`node scripts/generate.mjs && node scripts/validate.mjs` and commit `source/`, `v1/`, and `docs/accounts/`.

What the validator enforces:

- Invented data only: a denylist of real brands, `example.com` emails and websites, `555-01xx` phones.
- Location rows equal `purchasedLocations`.
- Every date falls within 120 days of the build date.
- Referential integrity: contacts and reviews point at locations of the same account, and the index,
  branding, bundles, logos, and briefs all agree.
- No duplicate review text across accounts, no review names another account's brand, and no review
  cites an office or city the account does not have. "City" means any city in `scripts/lib/geo.mjs` or any
  US place of 20,000+ people (`scripts/lib/us-places-20k.json`, U.S. Census Bureau, public domain).
  How a city name counts:
  - Most city names (for example "Albuquerque", "Tucson", "Madison") are flagged wherever they appear.
  - The 199 place names that are also a common word or first name (`scripts/lib/city-stoplist.json`, for
    example "Mobile", "Surprise", "Tyler") are flagged only next to a place word: before it "in", "from",
    "near", "visited", "visiting", "trip to", "flew into", "drove to", "moved here from" and similar, or after
    it a state ("Mobile, AL", "Tyler Texas"). "Tyler at the front desk" and "Mobile check-in" pass; "in
    Superior form" and "go to Mission Bay" pass because the next word shows it is not the city.
  - Exception, final setting confirmed by Balaji K on 2026-10-21: stoplisted cities above
    `BIG_CITY_EXEMPT_MAX` = 500,000 people (Houston, Phoenix, Dallas, Austin, Charlotte, Denver, Mesa) are
    flagged even with no place word ("loved Dallas", "the Denver office").
  - People: a full name written out ("Max Fairbanks") of the account's staff or the review's own reviewer or
    `employeesMentioned` is ignored, unless that name is itself a place ("Santa Fe"). A single name word only
    exempts a stoplisted name with no place word next to it, so a reviewer named Austin can write "Austin here", but a reviewer "Albuquerque Smith" can't
    write "from Albuquerque" and a reviewer "Shelby ..." can't write "moved here from Shelby".
- The denylist (real brands and names, stored only as salted SHA-256 hashes in `scripts/lib/denylist.mjs`)
  also covers ids, file names, slugs, email/website hosts, and `crm`, so a real name can't hide in an id.
  To add a name, ask a maintainer: the plain-text list is kept outside the repo. `crm` must also be a
  product listed in `KNOWN_CRM_PRODUCTS` (`scripts/lib/denylist.mjs`).
- Every address is complete, with city, state, ZIP, timezone, and area code agreeing.
- Listing fields (1.1.0): coordinates within 25 km of the city center; each listing's `ratingDistribution`
  sums to `reviewCount`, has at least as many reviews at each star as the sample, and its mean gives `rating`;
  rollups add up; special-hours dates are the real holiday dates inside their window; categories,
  attributes, and status come from `source/distributions.json`.

## 6. Privacy

These are invented businesses shaped by segment × industry patterns. They are not Birdeye customers.
Never commit real customer names, account ids, addresses, phone numbers, emails, or analytics rows,
and never paste them into an app's custom-account form either. `docs/name-collision-checks.md` is public
too: describe a real person found in a check as "real person, same profession and city", never by name.
