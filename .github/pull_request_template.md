## What changed

<!-- e.g. Added acct-juniper-vet (SMB, 1 location, Boise) / fixed a review / new city in geo.mjs -->

## Checklist

- [ ] Edited `source/*.json` (not `v1/` by hand)
- [ ] Ran `node scripts/generate.mjs` and committed `v1/`, `docs/accounts/`
- [ ] `node scripts/validate.mjs` passes locally
- [ ] Everything is invented: example.com emails, (xxx) 555-01xx phones, no real brands or people
- [ ] New cities added to `scripts/lib/geo.mjs` with a real ZIP, timezone, and area code
- [ ] Any new `crm` product added to `KNOWN_CRM_PRODUCTS` in `scripts/lib/denylist.mjs`
- [ ] Collision-check notes name no real person (write "real person, same profession and city")
