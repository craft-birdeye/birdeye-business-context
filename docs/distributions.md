# Distributions behind the 1.1.0 fields

`source/distributions.json` holds the aggregate parameters that `scripts/generate.mjs` (via `scripts/lib/enrich.mjs`) uses to
reshape the review sample and fill the 1.1.0 location fields. This page lists where each number comes from.

Rules:

- **Aggregates only.** No real business, review, reviewer, address, or phone is stored in this repo. Sources were read for
  published totals, medians, and shares; nothing row-level was copied.
- **Deterministic.** Every draw is seeded with `seed` (`birdeye-business-context/distributions/1.1`) plus the row id, so a
  weekly rebuild changes only dates, not shapes.
- **Honest labels.** Every value carries a `src` string in the JSON. `estimate` means we chose the number; a source key means
  the number is a published figure; both together means a published figure was adapted (rounded, blended, or split) by us.
- **Hand-written scenarios are untouched.** Quick-scenario accounts keep their authored reviews, ratings, replies, and photos
  (`curation.reshapeQuickScenarioAccounts: false`).

## Sources

All sources were read on 2026-10-21 (IST). Every one is a sample with its own bias; none is a census of US listings.

| Key | Source | What we use | Caveats |
|---|---|---|---|
| `birdeye-sor-2025` | Birdeye, *State of Online Reviews 2025* (https://birdeye.com/resources/guides/state-of-online-reviews-2025/; summary at https://www.localogy.com/2025/04/whats-the-state-of-online-reviews-in-2025/) | Google = 81% of reviews (2024); 81% of reviews include a comment | Birdeye customer base, 150k+ businesses; Birdeye is the product this repo demos |
| `birdeye-sor-2026` | Birdeye, *State of Online Reviews 2026* (https://birdeye.com/blog/state-of-online-reviews/) | 75.5% of reviews get a response (2025); Google 79.4% per location; 79.8% include comments | Enterprise multi-location customers; same caveat as above |
| `feedback-guru-2025` | Feedback Guru, *Google Reviews by Industry* (https://www.feedback-guru.com/google-reviews) and the dentist page (https://www.feedback-guru.com/google-reviews/dentists) | Median rating and median review count per industry; share below 4.0; share at a perfect 5.0 | 56,629 reviewed US businesses via the Places API, Dec 2024 to Jan 2025; Florida over-represented |
| `locus-2026` | Locus Intelligence, *Local search benchmarks by industry* (https://locus-intelligence.com/for/), plus https://locus-intelligence.com/for/orthodontist/ and https://locus-intelligence.com/for/pediatric-dentist/ | Median reviews and rating of listings that rank on Google Maps, per category | Ranking listings only (top 20 in 40 large US cities), so skewed toward busier listings; re-measured quarterly, figures read as of Aug to Sep 2026 |
| `trustreviews-2026` | TrustReviews, *Google Review Statistics 2026* (https://thetrustreviews.com/faq/google-review-data-study/) | Star shares (5.6% one-star, 87.8% five-star); median review length by star; owner reply rate by star | 306,017 reviews on 1,106 profiles of businesses that came to a review-removal company: biased toward profiles with negative reviews |
| `votednumberone-2025` | Voted Number One, *Average Google Rating: 2025 Report* (https://votednumberone.com/average-google-rating/) | B2B and professional services median Google rating 4.9 | 1,560 US businesses; methodology thinly described |
| `brightlocal-reviews-2018` | BrightLocal, *Google Reviews Study* (https://www.brightlocal.com/research/google-reviews-study/) | Marketing and PR are among the five industries with the fewest Google reviews | 2018 data; used for direction only, not a number |
| `brightlocal-gbp-insights-2019` | BrightLocal, *Google My Business Insights Study* (https://www.brightlocal.com/research/google-my-business-insights-study/) | Median 11 photos per listing that has at least one photo; 6% have one photo, 24% have 2 to 5 | 45,264 listings, Sep 2017 to Dec 2018, US/CA/AU/UK |
| `reviewtrackers-2022` | ReviewTrackers, *Online Reviews Statistics and Trends 2022* (https://www.reviewtrackers.com/reports/online-reviews-survey/) | 53% of reviewers expect a reply within 7 days, 1 in 3 within 3 days | Consumer survey, expectations not observed behaviour |
| `reviewtrackers-2023` | ReviewTrackers, *State of Online Reputation Analysis 2023* (https://www.reviewtrackers.com/reports/online-reputation-analysis/) | Average reply time by industry, about 2 to 10 days; healthcare and legal about 4 | Industry averages only, no distribution |
| `raval-ftc-2024` | Devesh Raval (FTC Bureau of Economics), *Do Bad Businesses Get Good Reviews? Evidence Across Several Online Review Platforms*, working paper dated 23 May 2024 (https://deveshraval.github.io/reviews.pdf) | Direction only: Google and Facebook ratings run higher than Yelp, most of all for low-quality businesses | Author's views, not the FTC's; we take no number from it |
| `osm-nominatim` | OpenStreetMap Nominatim (https://nominatim.openstreetmap.org/), queried 2026-10-21 | City-center coordinates in `scripts/lib/centers.mjs` | Data (c) OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright); only rounded city centers kept |

## Parameters

Status: **cited** = published figure used as is (rounded); **adapted** = published figure blended, split, or capped by us;
**estimate** = our choice, no source gives it.

| Parameter (`source/distributions.json`) | Value | Status | Source |
|---|---|---|---|
| `common.siteShare.google` | 0.81 | cited | `birdeye-sor-2025` |
| `common.siteShare.facebook` / `.yelp` | 0.10 / 0.09 | estimate | split of the remaining 19% |
| `common.siteListedProbability` | Google 1, Facebook 0.85, Yelp 0.75 | estimate | a site is always listed when a sampled review is there |
| `common.siteRatingOffset` | Google 0, Facebook +0.05, Yelp -0.5 | adapted | direction `raval-ftc-2024`; size estimate |
| `common.listingReviewCountSigma` | 1.0 (log-normal) | estimate | spread around the cited medians |
| `common.listingRatingSd` | sd 0.18, clamp 3.6 to 5.0; above 20 reviews capped at 4.95 | estimate | checked against `feedback-guru-2025` (2 to 4% below 4.0; 20 to 23% at 5.0) |
| `common.otherSiteCountSigma` | 0.5 | estimate | |
| `common.listingPhotos` | median 11, sigma 1.34, 1 to 400 | adapted | median `brightlocal-gbp-insights-2019`; sigma fitted to its 6% and 24% shares |
| `common.reviewPhotos` | 12% of reviews have photos; 1 to 4 photos | estimate | |
| `common.reviewLengthMedianChars` | 1★ 315, 2★ 298, 3★ 116, 4★ 48, 5★ 119 | cited | `trustreviews-2026`; the generator never emits rating-only reviews because screens need text (`birdeye-sor-2025`: 81% include a comment) |
| `common.replyRateByStar` | 1-2★ 0.90, 3★ 0.80, 4★ 0.70, 5★ 0.72 | adapted | overall level from `birdeye-sor-2026` (75.5%); split by star estimate |
| `common.replyLagHours` | 20% within 4 h, 35% within 24 h, 25% within 72 h, 15% within 7 days, 5% within 14 days | estimate | context `reviewtrackers-2022`, `reviewtrackers-2023` |
| `common.claimed`, `verifiedIfClaimed` | by site and status, e.g. Google Active 1.0; verified 0.95 of claimed | estimate | Locus reports 89% of ranking dentist profiles claimed (https://locus-intelligence.com/for/dentist/review-management/), consistent with our range |
| `common.coordinates` | jitter 0.3 to 12 km; validator allows 25 km | estimate | centers `osm-nominatim` |
| `common.secondaryCategoryCountWeights` | 0: 25%, 1: 40%, 2: 25%, 3: 10% | estimate | |
| `common.holidays` | 8 US holidays, window -30 to +90 days | estimate | |
| `common.businessStatusWhenInactive` | open 50%, temporarily closed 35%, permanently closed 15% | estimate | Active, Demo, and Needs setup locations and headquarters are always open |
| `curation.minLowStarReviewsPerAccount` | 1 | estimate | demo floor: every Reviews inbox has a 1-2★ review to answer |
| `profiles.*.starShare` | see below | adapted | J-shape from `trustreviews-2026`, tilted to each industry's median rating |
| `profiles.*.listingRatingMedian` | dental 4.85, home 4.85, legal 4.9, agency 4.9, auto 4.7 | adapted | blend of `feedback-guru-2025`, `locus-2026`, `votednumberone-2025` |
| `profiles.*.googleReviewCountMedianByCategory` | e.g. Dentist 300, Orthodontist 204, Plumber 167, Law firm 75 | mixed | cited per category in the JSON; HVAC, handyman, detailing, body shop, franchise support, lawyer referral, and the attorney sub-types are estimates |
| `profiles.*.photoMultiplier` | 0.5 to 1.5 | estimate | |
| `profiles.*.hoursPatterns` | | estimate | the patterns already in `source/locations.json` |
| `profiles.*.holidayPolicy` | | estimate | |
| `profiles.*.secondaryCategories` | | estimate | generic category names in the style of public listing sites |
| `profiles.*.attributes` | | estimate | generic attribute names in the style of public listing sites |

Star shares per profile (all adapted):

| Profile | 1★ | 2★ | 3★ | 4★ | 5★ |
|---|---|---|---|---|---|
| dental-healthcare | 5% | 2% | 3% | 10% | 80% |
| home-services | 5% | 2% | 3% | 10% | 80% |
| legal | 5% | 2% | 2% | 9% | 82% |
| agency (also Channel accounts) | 4% | 2% | 3% | 11% | 80% |
| automotive | 7% | 3% | 4% | 13% | 73% |

## Ratings shape, before and after

Review sample in `v1/reviews.json` (338 reviews, all accounts including the untouched quick scenarios):

| | 1★ | 2★ | 3★ | 4★ | 5★ | Mean | 1-2★ share |
|---|---|---|---|---|---|---|---|
| 1.0.0 | 31 (9.2%) | 58 (17.2%) | 35 (10.4%) | 72 (21.3%) | 142 (42.0%) | 3.70 | 26.3% |
| 1.1.0 | 12 (3.6%) | 35 (10.4%) | 14 (4.1%) | 78 (23.1%) | 199 (58.9%) | 4.23 | 13.9% |

The sample still carries more 1-2★ reviews than a real profile, on purpose: quick-scenario accounts are about negative
reviews and stay as authored, and every other account keeps at least one 1-2★ review so its inbox has something to answer.
The listing totals (`locations[].listings`) are where the realistic shape lives: 615 listings and 75,939 public reviews,
3.0% 1★, 1.2% 2★, 1.9% 3★, 8.0% 4★, 85.9% 5★; median listing rating 4.8; 26.9% at 5.0; 2.1% below 4.0. Compare
`trustreviews-2026` (5.6% one-star, 87.8% five-star) and `feedback-guru-2025` (dentists: median 4.9, 23.2% at 5.0, 2.5% below 4.0).
These are 2026-10-21 build figures; dates shift weekly, shapes do not.

## Design decisions

These choices change what a screen shows. They were proposed as open questions with options, and Balaji K
confirmed the recommended option for all seven on 2026-10-21. They live in `display` (or the profile
vocabularies) of `source/distributions.json`, so a later change does not touch the generator.

| # | Decision | Setting |
|---|---|---|
| 1 | Listing sites | Google, Facebook, Yelp (Google alone is about 80% of reviews by `birdeye-sor-2025` and `birdeye-sor-2026`) |
| 2 | Business status labels | Codes `open`, `temporarilyClosed`, `permanentlyClosed` with labels "Open", "Temporarily closed", "Permanently closed"; non-open only on Inactive locations, never on headquarters |
| 3 | Attribute vocabulary | 5 to 8 generic attributes per profile (accessibility, payments, service options); identity attributes (group "From the business") are excluded via `display.attributeGroupsExcluded` |
| 4 | Listing URL format | `https://{site}.example.com/biz/{slug}` (reserved domain, never resolves) |
| 5 | Rating precision | One decimal (`display.ratingDecimals: 1`); null when a listing has no reviews |
| 6 | Special hours | 8 US holidays, from 30 days before to 90 days after the build date, so some dates are in the future |
| 7 | Secondary category names | Generic names in the style of public listing sites (for example "Emergency dental service") |

Options that were considered and not chosen: an industry-specific site per profile or Google only (1); product
wording such as "Active / Paused / Closed" or no label field (2); including identity attributes or copying the
product's listings-editor list (3); a single placeholder page or no URL (4); two decimals (5); upcoming dates
only or non-holiday closures (6); the product's own category taxonomy (7).
