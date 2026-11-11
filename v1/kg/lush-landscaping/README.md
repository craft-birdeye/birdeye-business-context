# Lush Landscaping — Knowledge Graph (Plan B)

Synthetic Knowledge Graph for the invented business **Lush Landscaping** (`lushlandscaping.com`). Names, services, and keywords match the Myna page-metadata fixture: business name `Lush Landscaping`, location `loc-main-st` / `Lush Landscaping — Main St`, and the fixture keywords (backyard landscaping, vegetable garden design, above ground pool installation, outdoor living spaces, how to start a garden, above ground pool, vegetable garden).

This is not Birdeye customer data. Street addresses are invented. Phones use `555-01xx`. People and users are invented. Emails are `@lushlandscaping.example`. Every location is a town under 500,000 people (Census Vintage 2025). Dates fall on 2026-07-15 through 2026-11-11.

`single-location.json` is the one-location variant: the same `loc-main-st` object as in `locations.json`.

## Files

| File | Rows | Schema |
|---|---|---|
| `locations.json` | 8 locations | `v1/kg/schemas/locations.schema.json` |
| `single-location.json` | 1 location (`loc-main-st`) | `v1/kg/schemas/single-location.schema.json` |
| `people.json` | 14 providers | `v1/kg/schemas/people.schema.json` |
| `groups.json` | 3 regions + 1 brand | `v1/kg/schemas/groups.schema.json` |
| `relationships.json` | 32 typed links | `v1/kg/schemas/relationships.schema.json` |
| `suggestions.json` | 9 field changes (3 pending, 3 approved, 3 rejected) | `v1/kg/schemas/suggestions.schema.json` |
| `users.json` | 8 users | `v1/kg/schemas/users.schema.json` |

Each location is grouped like a Birdeye Business Profile: `basics` (name, location code, categories, description, services, keywords), `contact` (address, phone, website), `hours` (regular weekly plus special dates), `social`, and `customFields` (`{key, label, value}`).

## Id conventions

Ids are stable strings and do not change meaning.

| Prefix | Use |
|---|---|
| `loc-*` | Location, including a department location |
| `ppl-*` | Provider (person) |
| `grp-*` | Region or the brand group |
| `usr-*` | Governance user |
| `sug-*` | Business Profile field-change suggestion |
| `rel-*` | Typed relationship |

`loc-main-st` is the Main St yard. `loc-main-design` is the design studio inside that yard (`department-of` / `has department`). Every location belongs to exactly one region. The three regions are part of `grp-lush`.

## Relationship types

Links are typed only. A row is `{id, type, from, to, forwardLabel, reverseLabel}`. There is no strength and no source.

| type | from | to | forwardLabel | reverseLabel |
|---|---|---|---|---|
| `works-at` | person | location | works at | employs |
| `belongs-to` | location | region | belongs to | contains |
| `part-of` | region | brand group | part of | includes |
| `department-of` | location | location | department of | has department |

Every `works-at` row matches `people.json` `locationIds`, and every `locationIds` entry has a `works-at` row.

## Raw URLs

On the `kg-plan-b` branch:

`https://raw.githubusercontent.com/craft-birdeye/birdeye-business-context/kg-plan-b/v1/kg/lush-landscaping/<file>.json`

Schemas:

`https://raw.githubusercontent.com/craft-birdeye/birdeye-business-context/kg-plan-b/v1/kg/schemas/<file>.schema.json`

`node scripts/validate-kg.mjs` checks the files against those schemas, resolves every reference, checks people and relationship links, checks the date window, and rejects any city over 500,000.
