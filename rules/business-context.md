---
description: Keep demo data aligned to one invented Birdeye account at a time (shared business-context feed).
globs:
alwaysApply: false
---

# Rule: business context for demos and prototypes

Copy this file into an app as `.cursor/rules/business-context.mdc`, `AGENTS.md`, `CLAUDE.md`,
or a system prompt. Data: https://craft-birdeye.github.io/birdeye-business-context/ (files under `v1/`)

1. **One account at a time.** Every surface reads the active account id and loads
   `v1/accounts/<id>.json`. Fall back to `defaultAccountId` from `v1/accounts-index.json`.
2. **Do not hard-code mock lists.** Contacts, reviews, business info, and branding come from the feed
   or are invented to match that account.
3. **Location counts are exact.** Business-info rows and the Purchased KPI equal `purchasedLocations`.
   Contacts and reviews reference only that account's location ids. Listing totals (`listings[].reviewCount`)
   are larger than the review sample; don't count `reviews[]` to show a listing's total.
4. **Branding comes from the account.** Use `account.branding` for logo, brand name, and colors, and
   `account.tone` for copy and review replies. Don't swap the top-bar title for a location name.
5. **Dates are relative.** Use the feed's ISO dates as-is and format them for display (holiday
   `specialHours` dates can be in the future). Never write a
   fixed calendar date into mock data; the feed refreshes weekly to stay inside the last 3-4 months.
6. **Invented only.** Use `@example.com` emails, `(xxx) 555-01xx` phones, and invented businesses and people.
   Never paste real customer names, account IDs, addresses, or analytics rows.
7. **Pin the major version.** Read from `/v1/`. Fields may be added within v1; nothing is renamed or
   removed without a `/v2/`.
8. **Need something new?** Open a "Request a new demo account" issue in
   craft-birdeye/birdeye-business-context (no git needed). Don't fork the data into the app.
