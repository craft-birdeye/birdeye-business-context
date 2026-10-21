---
name: business-context
description: |
  Use when building, extending, or reviewing demo or prototype surfaces (contacts, reviews,
  business info, locations, branding, campaigns, agent replies) that need realistic Birdeye
  customer data. Loads one invented account at a time from the shared business-context feed
  so names, locations, dates, brand, and tone all match that account. App-agnostic: works for
  Myna, FOB, Storybook, or any agent that can fetch a URL.
---

# Business context skill

Shared synthetic data lives under **https://craft-birdeye.github.io/birdeye-business-context/v1/**.
In the steps below, file names are relative to that `v1/` base (so `accounts-index.json` is
`https://craft-birdeye.github.io/birdeye-business-context/v1/accounts-index.json`).
Source repo: https://github.com/craft-birdeye/birdeye-business-context. Team guide: `docs/team-guide.md`.

## Goal

Every demo should feel like one real customer account at a time. Switching account must change
names, locations, reviews, dates, logo, colors, and tone, not only a label in the top bar.

## Steps

1. **Pick the account.** Fetch `accounts-index.json`. Use the app's active account id, the id
   named in the prompt, or `defaultAccountId` (`acct-evercoast`, displayed as Evercoast Dental Partners).
   The index is keyed by id: `index.accounts[id]`.
2. **Load its bundle.** Fetch `accounts/<id>.json` → `{ account, locations, contacts, reviews }`.
   For cross-account work, use the flat files (`accounts.json`, `locations.json`, `contacts.json`,
   `reviews.json`) and filter by `accountId`.
3. **Ground your output in it.**
   - One-line brief for prompts: `account.llmContext`.
   - Business info table: one row per `locations[]` entry. The count always equals
     `account.purchasedLocations`. Single-location accounts open the profile editor directly.
   - Contacts: `contacts[]`, with `primaryLocationId` / `locationIds` pointing at real locations.
   - Reviews: `reviews[]`, already distinct per account, with `reply` when `replyStatus` is `"edit"`.
   - Branding: `account.branding` (brand name, logo placeholder, primary/secondary/accent colors,
     `onPrimary` text color) and `account.tone` (voice, formality, reply sign-off).
   - Staff names and services to mention: `account.staff`, `account.services`.
   - Listings screens (schema 1.1.0): `locations[].listings` (per-site rating, review count, claimed /
     verified, `ratingDistribution`), `coordinates`, `categories`, `businessStatusLabel`, `specialHours`,
     `attributes`, `photoCount`; rollups in `locations[].reviewSummary` and `account.listingSummary`.
     A listing's `reviewCount` is the public total; only `sampledReviews` of them are in `reviews[]`.
4. **Dates.** All dates are ISO 8601 UTC inside the last ~4 months of the last build, except
   `specialHours[].date`, which can be up to 90 days ahead. For example,
   the committed snapshot (built 2026-10-21) has an Evercoast review dated `2026-10-19T17:10:00Z`; the hosted
   feed shifts every date weekly. Format them for display (`Oct 19, 2026`); never hard-code a calendar date.
5. **Inventing more rows.** If a screen needs more data than the feed has, invent it in the same
   account's world: its cities, its staff, its tone, `@example.com` emails, `(xxx) 555-01xx` phones.
   If the addition is generally useful, propose it to the repo (see the team guide).

## Tone cheatsheet

| Industry | Who the contacts are | Typical review topics |
|---|---|---|
| Dental and healthcare | Patients, leads | Hygiene recall, wait times, insurance surprises, kid-friendly care |
| Home services and contractors | Homeowners, property managers | Arrival windows, upfront pricing, emergency calls, cleanup |
| Legal and professional services | Clients, consultation leads | Responsiveness, billing clarity, outcomes, intake speed |
| Automotive | Drivers, fleet managers | Estimates vs final bill, updates, turnaround, honesty |
| Advertising and agency (and Channel partners) | Client brand marketers | Reporting, onboarding, crisis response, listings cleanup |

Segment ids (`account.segment`): `SMB` = single-location practices and shops; `ENT` (Enterprise) =
multi-location; `CH-SLV` (Channel) = agency and channel partners.

## Never

- Never use real businesses, people, addresses, phone numbers, or emails. The feed's validator
  rejects real brands and names (a hashed denylist), non-example.com emails, and phones outside 555-01xx.
- Never show one shared hard-coded list for every account.
- Never reference a location or city the account doesn't have (the validator checks reviews for this).
- Never copy rows from analytics or CRM exports.
