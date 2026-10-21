# Name collision checks (V2BIRD-35871)

Checked 2026-10-20/21 (IST) with web search. Method: search the exact name in quotes plus its industry and, where useful, its city; read the top results. **Verdict** is `collides` (real business or product uses it: rename), `clear` (no business found: keep), or `borderline` (similar real name: kept, flagged). Web search can miss small businesses, so `clear` means "nothing found", not a legal clearance.

## 1. Old account names (before this fix)

| Old name | Query | Result | Verdict | New name |
|---|---|---|---|---|
| #1: Prototype dental-group name (old id and display name) | QA finding | 44 of 45 office nicknames matched a real dental group's public office directory | collides | Evercoast Dental Partners, new id `acct-evercoast`, 45 new offices |
| #2: real dental practice, New Jersey | `"<old name>"` (2026-10-21) | A real dental practice of this exact name in New Jersey (practice address and dentists omitted); also a former consultancy of the same name, since merged into another firm | collides | Brisquen Dental Partners |
| #3: real orthodontic group, Minnesota, multi-office | `"<old name>"` (2026-10-21) | A real orthodontic practice of a near-identical name in Minnesota (several offices), launched 2023 | collides | Tovaline Orthodontics Group |
| #4: real dental practices, California and Florida | `"<old name>"` (2026-10-21) | Real dental practices of a near-identical name in California and in Florida (dentist omitted) | collides | Saltwick Dental Collective |
| #5: real dental practices, several states | `"<old name>"` | Real dental practices use this name. | collides | Thimbleleaf Family Dental |
| #6: real pediatric dental practices (similar name) | `"<old name>"` | Real pediatric dental practices use similar names. | collides | Puddlewick Kids Dentistry |
| #7: real dental practices (near-identical name) | `"<old name>"` | Real dental practices with a near-identical name. | collides | Brindlemoss Dental Studio |
| #8: real dental businesses (near-identical name) | `"<old name>"` | Real dental businesses with a near-identical name. | collides | Dentavane Dental Marketing |
| #9: real heating, plumbing and electrical contractor, Denver metro (similar name) | `"<old name>"` | QA-reported. A re-check (2026-10-21) surfaced a real plumbing, heating, cooling and electrical contractor with a similar name in the Denver metro, the same trades. | collides | Hearthquell Heating, Plumbing & Electrical |
| #10: real plumbing business, Arizona | `"<old name>"` | A real plumbing business of a near-identical name in Arizona. | collides | Pipewren Plumbing & Drain |
| #11: real electrical contractors (near-identical name) | `"<old name>"` | Real electrical contractors with a near-identical name. | collides | Quarrytide Electric |
| #12: real lawn-care businesses (near-identical name) | `"<old name>"` | Real lawn-care businesses with a near-identical name. | collides | a coined name (retired in fix 1b, see section 2), then Thatchwhim Outdoor Services |
| #13: real HVAC business, Virginia | `"<old name>"` | A real HVAC business of this exact name in Virginia. | collides | Coilhaven Heating & Cooling |
| #14: real handyman businesses (near-identical name) | `"<old name>"` | Real handyman businesses with a near-identical name. | collides | Patchwhit Handyman Co |
| #15: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Hollowbeck Pest Control |
| #16: real multi-brand franchise platform, North Carolina | `"<old name>"` (2026-10-21) | A real multi-brand franchise platform with a near-identical name in North Carolina | collides | Franquill Franchise Network |
| #17: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Varrowmere & Associates Law Firm |
| #18: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Firthgale Counsel LLP |
| #19: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Plainsby Litigation Group |
| #20: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Pellwrin Tax & Estates |
| #21: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Wickhallow Law Office |
| #22: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Valdrift Immigration Law |
| #23: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Gavelmoor Personal Injury |
| #24: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Counselvane Referral Network |
| #25: real marketing-attribution company | `"<old name>"` (2026-10-21) | A real marketing-attribution company of this name runs a digital-agency partner directory; same industry as the demo agency | collides | Northquell Digital Partners |
| #26: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Skelvane Media |
| #27: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Lumbrisk Reputation Co |
| #28: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Inkfallow Creative |
| #29: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Tallomere Partners |
| #30: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Hopskein Digital |
| #31: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Kindlewry Studio Marketing |
| #32: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Tramvelle Field Marketing |
| #33: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Torqvale Auto Care |
| #34: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Crestovar Motors Service Centers |
| #35: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Treadmarsh Tire & Auto |
| #36: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Amperlund EV Service Labs |
| #37: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Cornerwick Garage Auto Repair |
| #38: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Buffwren Detail Studio |
| #39: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Panelbrook Collision Center |
| #40: invented name, generic words (retired) | — | Not individually searched: generic words, likely shared by real businesses | renamed preemptively | Lotquill Dealer Marketing |

## 2. Candidate names rejected during the check

| Candidate | Query | Result | Verdict |
|---|---|---|---|
| #1: coined candidate | `"<candidate>"` + industry | Fictional Roseville practice used in a published template | collides, not used (added to denylist where distinctive) |
| #2: coined candidate | `"<candidate>"` + industry | AI software company | collides, not used (added to denylist where distinctive) |
| #3: coined candidate | `"<candidate>"` + industry | USBIT concept project | collides, not used (added to denylist where distinctive) |
| #4: coined candidate | `"<candidate>"` + industry | Real contractor-marketing firm and LLC | collides, not used (added to denylist where distinctive) |
| #5: coined candidate | `"<candidate>"` + industry | Homeowner-matching service | collides, not used (added to denylist where distinctive) |
| #6: coined candidate | `"<candidate>"` + industry | Contractor software | collides, not used (added to denylist where distinctive) |
| #7: coined candidate | `"<candidate>"` + industry | Indian company and app | collides, not used (added to denylist where distinctive) |
| #8: coined candidate | `"<candidate>"` + industry | Real companies of this name | collides, not used (added to denylist where distinctive) |
| #9: coined candidate | `"<candidate>"` + industry | Surname of a real attorney (name omitted) | collides, not used (added to denylist where distinctive) |
| #10: coined candidate | `"<candidate>"` + industry | Accounting firm | collides, not used (added to denylist where distinctive) |
| #11: coined candidate | `"<candidate>"` + industry | Slovak company | collides, not used (added to denylist where distinctive) |
| #12: coined candidate | `"<candidate>"` + industry | Software product | collides, not used (added to denylist where distinctive) |
| #13: coined candidate | `"<candidate>"` + industry | Maritime software | collides, not used (added to denylist where distinctive) |
| #14: coined candidate | `"<candidate>"` + industry | Registered domain in use | collides, not used (added to denylist where distinctive) |
| #15: coined candidate | `"<candidate>"` + industry | Too close to a real legal business's name | collides, not used (added to denylist where distinctive) |
| #16: coined candidate | `"<candidate>"` + industry | Research platform | collides, not used (added to denylist where distinctive) |
| #17: coined candidate | `"<candidate>"` + industry | Vape retailer | collides, not used (added to denylist where distinctive) |
| #18: coined candidate | `"<candidate>"` + industry | A real advisory firm of this name | collides, not used (added to denylist where distinctive) |
| #19: coined candidate | `"<candidate>"` + industry | A real media company of this name | collides, not used (added to denylist where distinctive) |
| #20: coined candidate | `"<candidate>"` + industry | B2B creative studio | collides, not used (added to denylist where distinctive) |
| #21: coined candidate | `"<candidate>"` + industry | Game setting and app | collides, not used (added to denylist where distinctive) |
| #22: coined candidate | `"<candidate>"` + industry | Canadian business | collides, not used (added to denylist where distinctive) |
| #23: coined candidate | `"<candidate>"` + industry | Trading platform | collides, not used (added to denylist where distinctive) |
| #24: coined candidate | `"<candidate>"` + industry | Data-center developer | collides, not used (added to denylist where distinctive) |
| #25: coined candidate | `"<candidate>"` + industry | Surname in use | collides, not used (added to denylist where distinctive) |
| #26: coined candidate | `"<candidate>"` + industry | Tutoring and solutions businesses | collides, not used (added to denylist where distinctive) |
| #27: coined candidate | `"<candidate>"` + industry | A real home builder of this name | collides, not used (added to denylist where distinctive) |
| #28: coined candidate | `"<candidate>"` + industry | Travel brand | collides, not used (added to denylist where distinctive) |
| #29: coined candidate | `"<candidate>"` + industry | Taxi-dispatch platform | collides, not used (added to denylist where distinctive) |
| #30: coined candidate | `"<candidate>"` + industry | A real company of this name | collides, not used (added to denylist where distinctive) |
| #31: coined candidate | `"<candidate>"` + industry | Sample business and nail-studio product line | collides, not used (added to denylist where distinctive) |
| #32: coined candidate | `"<candidate>"` + industry | Roofing service | collides, not used (added to denylist where distinctive) |
| #33: coined candidate | `"<candidate>"` + industry | Auto-shop software | collides, not used (added to denylist where distinctive) |
| #34: coined candidate | `"<candidate>"` + industry | A real company with a near-identical name | collides, not used (added to denylist where distinctive) |
| #35: coined candidate | `"<candidate>"` + industry | Too close to a real company's name | collides, not used (added to denylist where distinctive) |
| #36: coined brand chosen in fix 1 | `"<candidate>"` + city + industry (2026-10-21) | Search summary cites a registered business using the word on a public new-business list in Washington State; the PDF could not be opened to confirm (unknown). Also social profiles of a real person with that surname (name omitted) | collides (treated as collision; renamed to Thatchwhim) |

## 3. Final account names (all 40)

| Account id | Name | Brand | Query | Result | Verdict |
|---|---|---|---|---|---|
| `acct-evercoast` | Evercoast Dental Partners | Evercoast Dental | `"Evercoast"` + industry | Only an unrelated volumetric-video company using the word; no dental business. Spot-check `"Evercoast Dental"` + city + dentist (2026-10-21): no match, only a practice with a different name. | clear |
| `acct-brisquen-dental` | Brisquen Dental Partners | Brisquen Dental | `"Brisquen"` + industry | No business found. | clear |
| `acct-tovaline-ortho` | Tovaline Orthodontics Group | Tovaline Ortho | `"Tovaline"` + industry | No business found (a similar-sounding product name exists). | clear |
| `acct-saltwick-dental` | Saltwick Dental Collective | Saltwick Dental | `"Saltwick"` + industry | Only an SEO article about dental marketing; no practice. | clear |
| `acct-thimbleleaf-dental` | Thimbleleaf Family Dental | Thimbleleaf Family Dental | `"Thimbleleaf"` + industry | Only a street name; no business. | clear |
| `acct-puddlewick-kids` | Puddlewick Kids Dentistry | Puddlewick Kids Dentistry | `"Puddlewick"` + industry | No business found. | clear |
| `acct-brindlemoss-dental` | Brindlemoss Dental Studio | Brindlemoss Dental Studio | `"Brindlemoss"` + industry | No business found. | clear |
| `acct-dentavane-channel` | Dentavane Dental Marketing | Dentavane | `"Dentavane"` + industry | Borderline: a mobile-dental service with a similar name exists; different spelling and product. Kept, flagged for review. | borderline |
| `acct-hearthquell-home` | Hearthquell Heating, Plumbing & Electrical | Hearthquell | `"Hearthquell"` + industry | No business found. Spot-check `"Hearthquell" Denver heating plumbing` (2026-10-21): no match. | clear |
| `acct-pipewren-plumbing` | Pipewren Plumbing & Drain | Pipewren Plumbing | `"Pipewren"` + industry | No business. Spot-check `"Pipewren" plumbing Phoenix` (2026-10-21): appears only as an invented name-generator suggestion and a made-up brand in a tool demo. | clear |
| `acct-quarrytide-electric` | Quarrytide Electric | Quarrytide Electric | `"Quarrytide"` + industry | No business found. | clear |
| `acct-thatchwhim-outdoor` | Thatchwhim Outdoor Services | Thatchwhim | `"Thatchwhim"`, `"Thatchwhim Outdoor"` | No exact match (results are about an unrelated company with a shorter name) | clear |
| `acct-coilhaven-hvac` | Coilhaven Heating & Cooling | Coilhaven Heating & Cooling | `"Coilhaven"` + industry | No business found. | clear |
| `acct-patchwhit-handyman` | Patchwhit Handyman Co | Patchwhit Handyman | `"Patchwhit"` + industry | No business found. | clear |
| `acct-hollowbeck-pest` | Hollowbeck Pest Control | Hollowbeck Pest Control | `"Hollowbeck"` + industry | No business found (a similar surname exists). | clear |
| `acct-franquill-channel` | Franquill Franchise Network | Franquill Network | `"Franquill"` + industry | No business found (a similar-sounding business exists). | clear |
| `acct-varrowmere-law` | Varrowmere & Associates Law Firm | Varrowmere Law | `"Varrowmere"` + industry | Only a city in a novel. | clear |
| `acct-firthgale-counsel` | Firthgale Counsel LLP | Firthgale Counsel | `"Firthgale"` + industry | Only a username. | clear |
| `acct-plainsby-litigation` | Plainsby Litigation Group | Plainsby Litigation | `"Plainsby"` + industry | No business found. | clear |
| `acct-pellwrin-tax` | Pellwrin Tax & Estates | Pellwrin Tax | `"Pellwrin"` + industry | No business found. | clear |
| `acct-wickhallow-law` | Wickhallow Law Office | Wickhallow Law | `"Wickhallow"` + industry | Only a setting in a novel. | clear |
| `acct-valdrift-immigration` | Valdrift Immigration Law | Valdrift Immigration Law | `"Valdrift"` + industry | Only an artist page. | clear |
| `acct-gavelmoor-injury` | Gavelmoor Personal Injury | Gavelmoor Personal Injury | `"Gavelmoor"` + industry | Only a Scottish place name. | clear |
| `acct-counselvane-channel` | Counselvane Referral Network | Counselvane | `"Counselvane"` + industry | No business found. | clear |
| `acct-northquell` | Northquell Digital Partners | Northquell | `"Northquell"` + industry | Only a fan-fiction character. | clear |
| `acct-skelvane-media` | Skelvane Media | Skelvane | `"Skelvane"` + industry | Only a 3D model name. | clear |
| `acct-lumbrisk-reputation` | Lumbrisk Reputation Co | Lumbrisk | `"Lumbrisk"` + industry | No business found. | clear |
| `acct-inkfallow-creative` | Inkfallow Creative | Inkfallow | `"Inkfallow"` + industry | No business found. | clear |
| `acct-tallomere-partners` | Tallomere Partners | Tallomere | `"Tallomere"` + industry | No business found (a video game has a similar name). | clear |
| `acct-hopskein-digital` | Hopskein Digital | Hopskein Digital | `"Hopskein"` + industry | No business found. | clear |
| `acct-kindlewry-studio` | Kindlewry Studio Marketing | Kindlewry Studio | `"Kindlewry"` + industry | No business found. | clear |
| `acct-tramvelle-field` | Tramvelle Field Marketing | Tramvelle Field | `"Tramvelle"` + industry | No exact match. | clear |
| `acct-torqvale-auto` | Torqvale Auto Care | Torqvale | `"Torqvale"` + industry | No business found. | clear |
| `acct-crestovar-motors` | Crestovar Motors Service Centers | Crestovar Motors | `"Crestovar"` + industry | Only output of a fantasy name generator. | clear |
| `acct-treadmarsh-tire` | Treadmarsh Tire & Auto | Treadmarsh Tire | `"Treadmarsh"` + industry | Only a historical surname. | clear |
| `acct-amperlund-ev` | Amperlund EV Service Labs | Amperlund EV | `"Amperlund"` + industry | No business found. | clear |
| `acct-cornerwick-garage` | Cornerwick Garage Auto Repair | Cornerwick Garage | `"Cornerwick"` + industry | No business found. | clear |
| `acct-buffwren-detail` | Buffwren Detail Studio | Buffwren Detail Studio | `"Buffwren"` + industry | No business found. | clear |
| `acct-panelbrook-collision` | Panelbrook Collision Center | Panelbrook Collision | `"Panelbrook"` + industry | No business found. | clear |
| `acct-lotquill-channel` | Lotquill Dealer Marketing | Lotquill | `"Lotquill"` + industry | No business found. | clear |

## 4. Location and office names

224 locations: 45 Evercoast (`Evercoast Dental - <City>`), 95 other bare `<Brand> - <City>`, 20 `<Brand> - Main|HQ`, and 64 `<Brand> - <city + descriptor>`.

- **64 city + descriptor names: all 64 searched**, with the brand, in 19 brand-scoped queries (one per account, listing that account's office descriptors and cities). Results below, one row per office.
- **160 bare city / Main / HQ names: not searched one by one.** The full office name is `<brand> - <city>`, so it can only match a real business if the brand does; all 40 brands are searched in section 3. Spot-check: `"Evercoast Dental"` + city + dentist found no practice of that name.
- Evercoast's 45 old office nicknames (the real-directory names) are gone; the new list shares 0 of 45 cities with the old one.
- Street addresses are invented and were not searched (unknown).

| Office name | Query (brand-scoped, 2026-10-21) | Result | Verdict |
|---|---|---|---|
| Amperlund EV - San Jose Lab | `"Amperlund EV" "San Jose Lab"` | No Amperlund lab; only an unrelated battery lab in San Jose | clear |
| Counselvane - Partner desk - NYC | `"Counselvane" partner desk DC NYC Philly` | No Counselvane results at all | clear |
| Counselvane - Partner desk - Philly | `"Counselvane" partner desk DC NYC Philly` | No Counselvane results at all | clear |
| Counselvane - Partner desk - DC | `"Counselvane" partner desk DC NYC Philly` | No Counselvane results at all | clear |
| Crestovar Motors - Salt Lake Service | `"Crestovar Motors" Salt Lake Service West Valley St George` | No Crestovar; only real dealer service centers with other names | clear |
| Crestovar Motors - West Valley | `"Crestovar Motors" Salt Lake Service West Valley St George` | No Crestovar; only real dealer service centers with other names | clear |
| Crestovar Motors - St George | `"Crestovar Motors" Salt Lake Service West Valley St George` | No Crestovar; only real dealer service centers with other names | clear |
| Dentavane - Client hub - Charlotte | `"Dentavane" client hub Charlotte Dallas Tampa` | No Dentavane hub; one social post uses the word | clear |
| Dentavane - Client hub - Tampa | `"Dentavane" client hub Charlotte Dallas Tampa` | No Dentavane hub; one social post uses the word | clear |
| Dentavane - Client hub - Dallas | `"Dentavane" client hub Charlotte Dallas Tampa` | No Dentavane hub; one social post uses the word | clear |
| Firthgale Counsel - Vancouver WA | `"Firthgale Counsel" Vancouver WA` | No Firthgale; only counseling practices with other names | clear |
| Franquill Network - Franchise ops - Houston | `"Franquill" franchise ops Austin Houston San Antonio Oklahoma City` | Only a similar-sounding franchise-recruitment business (different name) | clear |
| Franquill Network - Franchise ops - Austin | `"Franquill" franchise ops Austin Houston San Antonio Oklahoma City` | Only a similar-sounding franchise-recruitment business (different name) | clear |
| Franquill Network - Franchise ops - San Antonio | `"Franquill" franchise ops Austin Houston San Antonio Oklahoma City` | Only a similar-sounding franchise-recruitment business (different name) | clear |
| Franquill Network - Franchise ops - Oklahoma City | `"Franquill" franchise ops Austin Houston San Antonio Oklahoma City` | Only a similar-sounding franchise-recruitment business (different name) | clear |
| Inkfallow - Portland HQ | `"Inkfallow" creative Portland Boise Seattle Salt Lake` | No Inkfallow; closest is an agency with a similar name | clear |
| Inkfallow - Seattle desk | `"Inkfallow" creative Portland Boise Seattle Salt Lake` | No Inkfallow; closest is an agency with a similar name | clear |
| Inkfallow - Boise desk | `"Inkfallow" creative Portland Boise Seattle Salt Lake` | No Inkfallow; closest is an agency with a similar name | clear |
| Inkfallow - Salt Lake desk | `"Inkfallow" creative Portland Boise Seattle Salt Lake` | No Inkfallow; closest is an agency with a similar name | clear |
| Lotquill - Dealer hub - Chicago | `"Lotquill" dealer hub Chicago Cleveland Columbus Indianapolis` | No Lotquill; generic "dealer hub" platforms only | clear |
| Lotquill - Dealer hub - Cleveland | `"Lotquill" dealer hub Chicago Cleveland Columbus Indianapolis` | No Lotquill; generic "dealer hub" platforms only | clear |
| Lotquill - Dealer hub - Indianapolis | `"Lotquill" dealer hub Chicago Cleveland Columbus Indianapolis` | No Lotquill; generic "dealer hub" platforms only | clear |
| Lotquill - Dealer hub - Columbus | `"Lotquill" dealer hub Chicago Cleveland Columbus Indianapolis` | No Lotquill; generic "dealer hub" platforms only | clear |
| Lumbrisk - Boston HQ | `"Lumbrisk" reputation Boston Portland Maine` | No Lumbrisk business | clear |
| Lumbrisk - Portland ME | `"Lumbrisk" reputation Boston Portland Maine` | No Lumbrisk business | clear |
| Northquell - Charlotte Studio | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Raleigh Satellite | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Durham Satellite | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Atlanta Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Nashville Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Richmond Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Charleston Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Greenville Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Northquell - Wilmington Client Hub | `"Northquell" digital Charlotte Atlanta Raleigh Durham Nashville client hub` | Only fan-fiction uses of Northquell | clear |
| Pellwrin Tax - DC Office | `"Pellwrin Tax" DC office` | No Pellwrin; closest is a firm with a different name | clear |
| Pipewren Plumbing - Phoenix Central | `"Pipewren" Phoenix Central Mesa East Scottsdale North Glendale West` | No business; Pipewren appears only as a name-generator suggestion and a made-up brand in a vendor demo page | clear |
| Pipewren Plumbing - Mesa East | `"Pipewren" Phoenix Central Mesa East Scottsdale North Glendale West` | No business; Pipewren appears only as a name-generator suggestion and a made-up brand in a vendor demo page | clear |
| Pipewren Plumbing - Scottsdale North | `"Pipewren" Phoenix Central Mesa East Scottsdale North Glendale West` | No business; Pipewren appears only as a name-generator suggestion and a made-up brand in a vendor demo page | clear |
| Pipewren Plumbing - Glendale West | `"Pipewren" Phoenix Central Mesa East Scottsdale North Glendale West` | No business; Pipewren appears only as a name-generator suggestion and a made-up brand in a vendor demo page | clear |
| Quarrytide Electric - San Diego HQ | `"Quarrytide Electric" San Diego` | No Quarrytide; only electricians with other names | clear |
| Skelvane - Austin HQ | `"Skelvane" media Austin Dallas Houston Denver San Antonio studio` | Only a 3D model and an unrelated blog with a similar name | clear |
| Skelvane - Dallas studio | `"Skelvane" media Austin Dallas Houston Denver San Antonio studio` | Only a 3D model and an unrelated blog with a similar name | clear |
| Skelvane - Houston studio | `"Skelvane" media Austin Dallas Houston Denver San Antonio studio` | Only a 3D model and an unrelated blog with a similar name | clear |
| Skelvane - San Antonio desk | `"Skelvane" media Austin Dallas Houston Denver San Antonio studio` | Only a 3D model and an unrelated blog with a similar name | clear |
| Skelvane - Denver desk | `"Skelvane" media Austin Dallas Houston Denver San Antonio studio` | Only a 3D model and an unrelated blog with a similar name | clear |
| Tallomere - Chicago HQ | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Detroit desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Indy desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Columbus desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Milwaukee desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Minneapolis desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - St Louis desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Tallomere - Kansas City desk | `"Tallomere" partners Chicago Columbus Detroit Milwaukee Minneapolis Kansas City` | Only a video game with a similar name (different spelling) | clear |
| Thatchwhim - Charlotte HQ | `"<old brand>"` + city + industry (old brand); `"Thatchwhim Outdoor"` (new brand) | Old brand: possible registered business using the word (Washington State), unconfirmed. New brand: no match | old brand collides (renamed); new name clear |
| Tramvelle Field - Orlando hub | `"Tramvelle" field marketing Atlanta Jacksonville Orlando Tampa hub` | No Tramvelle; only field-marketing job ads | clear |
| Tramvelle Field - Tampa hub | `"Tramvelle" field marketing Atlanta Jacksonville Orlando Tampa hub` | No Tramvelle; only field-marketing job ads | clear |
| Tramvelle Field - Jacksonville hub | `"Tramvelle" field marketing Atlanta Jacksonville Orlando Tampa hub` | No Tramvelle; only field-marketing job ads | clear |
| Tramvelle Field - Atlanta hub | `"Tramvelle" field marketing Atlanta Jacksonville Orlando Tampa hub` | No Tramvelle; only field-marketing job ads | clear |
| Treadmarsh Tire - Houston West | `"Treadmarsh Tire" Houston West` | No Treadmarsh; closest is a tire business with a different name | clear |
| Varrowmere Law - Dallas Office | `"Varrowmere" law Dallas Plano Fort Worth Irving Frisco office` | No Varrowmere firm; only other law firms and a novel | clear |
| Varrowmere Law - Plano Office | `"Varrowmere" law Dallas Plano Fort Worth Irving Frisco office` | No Varrowmere firm; only other law firms and a novel | clear |
| Varrowmere Law - Fort Worth Office | `"Varrowmere" law Dallas Plano Fort Worth Irving Frisco office` | No Varrowmere firm; only other law firms and a novel | clear |
| Varrowmere Law - Irving Office | `"Varrowmere" law Dallas Plano Fort Worth Irving Frisco office` | No Varrowmere firm; only other law firms and a novel | clear |
| Varrowmere Law - Frisco Office | `"Varrowmere" law Dallas Plano Fort Worth Irving Frisco office` | No Varrowmere firm; only other law firms and a novel | clear |

## 5. Person names


Inventory (before fix 1b): **734 distinct full names** (first + last) from contacts (330 rows), reviewers (338), staff (64), employees named in reviews (59), location owner/createdBy (9), and names inside review text (1 extra: Gary Lindqvist). Plus 59 single first names (`Marisol`, `Austin`), which can't identify a person and were **not checked**.

Method:
1. **Public-figure check, all 734:** exact-title lookup of every full name on English Wikipedia (MediaWiki API, redirects followed, 50 names per request). 33 had a page.
2. **Contextual web search, 33 names:** all 22 staff with a full name in the dental and legal accounts (`"<name>"` + profession + city), the 2 staff surnames built from coined brands (one combined query), a seeded random sample of 8 contacts/reviewers (`random.seed(35871)`, name + city), and the 1 name found only in review text.
3. **Not searched contextually: 701 of 734** (Wikipedia check only). That covers 40 of 64 staff (agency, home-services, automotive, channel accounts) and 631 of 639 contacts/reviewers without a Wikipedia hit. Their status in context is **unknown**.

Policy: rename when the name has a Wikipedia article about a real person (or a disambiguation page, meaning several notable people), redirects to a real person, is a famous or TV fictional character, or matches an identifiable person in the same profession or city. Renames keep the first name and change only the surname.

Privacy (QA fix 1c): this file is public and is copied to Pages, so it never names a real person. Retired names that collided with real people appear only in `scripts/lib/denylist.mjs` (so the validator can block them); here they are shown as *retired name*. Results describe the real person only as "real person, same profession and city" (or by occupation for Wikipedia subjects), never by name, employer, address, or relatives. Queries are shown as templates.


### 5a. Wikipedia hits (33)

| # | Where used | Check | Result | Verdict |
|---|---|---|---|---|
| 1 | reviewer, Dental and healthcare, Tempe, AZ | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Alejandra Fuenmira |
| 2 | contact, Home services and contractors, Thornton, CO | Wikipedia exact title | Wikipedia article: filmmaker | collides; *retired name* renamed to Alex Riveland |
| 3 | contact, Advertising and agency, Wilmington, NC | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Brandon Colbrith |
| 4 | contact, Advertising and agency, Greenville, SC | Wikipedia exact title | Wikipedia article: actor (redirect from a near-identical spelling) | collides; *retired name* renamed to Chloe Bennisfield |
| 5 | contact, Home services and contractors, Lakewood, CO | Wikipedia exact title | Wikipedia article: screenwriter and actor | collides; *retired name* renamed to Chris Langthwick |
| 6 | staff, Advertising and agency, Boston, MA | Wikipedia exact title | Wikipedia article: disambiguation page (several notable people) | collides; *retired name* renamed to Colleen Murtagny |
| 7 | staff, Dental and healthcare, Atlanta, GA | Wikipedia exact title | Wikipedia article: fictional TV character (redirect to a character list) | collides (fictional TV character); *retired name* renamed to Dana Cruzalva |
| 8 | contact, Legal and professional services, Frisco, TX | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Derek Colvarth |
| 9 | contact, Dental and healthcare, Austin, TX | Wikipedia exact title | Wikipedia article: athlete (redirect) | collides; *retired name* renamed to Felix Garcellan |
| 10 | staff, Legal and professional services, Boston, MA | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Grant Hollisford |
| 11 | reviewer, Legal and professional services, Irving, TX | Wikipedia exact title | Wikipedia article: professional wrestler (redirect) | collides; *retired name* renamed to Harold Jennaway |
| 12 | contact, Automotive, Thornton, CO | Wikipedia exact title | Wikipedia article: politician | collides; *retired name* renamed to Helena Lindwerth |
| 13 | contact, Advertising and agency, Charleston, SC | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Ian Burkhallow |
| 14 | reviewer, Legal and professional services, Fort Worth, TX | Wikipedia exact title | Wikipedia article: fictional TV character (redirect to a character list) | collides (fictional TV character); *retired name* renamed to Ingrid Solmarth |
| 15 | contact, Home services and contractors, Denver, CO | Wikipedia exact title | Wikipedia article: clergyman (redirect) | collides; *retired name* renamed to Jamie Ortevale |
| 16 | contact, Home services and contractors, Englewood, CO | Wikipedia exact title | Redirect to an article about a city park, not a person | clear; kept as Jordan Park |
| 17 | staff, Advertising and agency, Charlotte, NC | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Marcus Leovanne |
| 18 | staff, Legal and professional services, Washington, DC | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Marcus Webbersley |
| 19 | staff, Dental and healthcare, Naperville, IL | Wikipedia exact title | Wikipedia article: fictional TV character (redirect to a character list) | collides (fictional TV character); *retired name* renamed to Mateo Ruizandre |
| 20 | contact, Advertising and agency, Richmond, VA | Wikipedia exact title | Wikipedia article: disambiguation page (several notable people) | collides; *retired name* renamed to Mei Lintrove |
| 21 | contact, Dental and healthcare, Austin, TX | Wikipedia exact title | Wikipedia article: article about a criminal case naming a real person (redirect) | collides; *retired name* renamed to Miles Cupwright |
| 22 | contact, Home services and contractors, Thornton, CO | Wikipedia exact title | Wikipedia article: athlete | collides; *retired name* renamed to Morgan Ellisworth |
| 23 | contact, Advertising and agency, Charlotte, NC | Wikipedia exact title | Wikipedia article: disambiguation page (several notable people) | collides; *retired name* renamed to Omar Hassanvale |
| 24 | contact, Legal and professional services, Dallas, TX | Wikipedia exact title | Wikipedia article: music producer | collides; *retired name* renamed to Owen Bradwellin |
| 25 | reviewer, Legal and professional services, Dallas, TX | Wikipedia exact title | Wikipedia article: disambiguation page (redirect) | collides; *retired name* renamed to Patrick Delanmere |
| 26 | staff, Legal and professional services, Boston, MA | Wikipedia exact title | Wikipedia article: musician (redirect to a band article) | collides; *retired name* renamed to Paul Reyesmont |
| 27 | staff, Dental and healthcare, Nashville, TN | Wikipedia exact title | Wikipedia article: real person (redirect) | collides; *retired name* renamed to Paul Vargasse |
| 28 | staff, Legal and professional services, Dallas, TX | Wikipedia exact title | Wikipedia article: film director | collides; *retired name* renamed to Raj Methuran |
| 29 | staff, Advertising and agency, Chicago, IL | Wikipedia exact title | Wikipedia article: author | collides; *retired name* renamed to Ravi Subrahvel |
| 30 | contact, Dental and healthcare, Bellevue, WA | Wikipedia exact title | Wikipedia article: disambiguation page (redirect) | collides; *retired name* renamed to Sofia Alvarenne |
| 31 | contact, Advertising and agency, Raleigh, NC | Wikipedia exact title | Wikipedia article: fictional TV character (redirect to a character list) | collides (fictional TV character); *retired name* renamed to Sofia Martivell |
| 32 | staff, Automotive, Milwaukee, WI | Wikipedia exact title | Wikipedia article: professional wrestler | collides; *retired name* renamed to Stan Kowalbrook |
| 33 | contact, Legal and professional services, Minneapolis, MN | Wikipedia exact title | Wikipedia article: historian (redirect) | collides; *retired name* renamed to Vivian Galbrecken |

### 5b. Contextual web searches (33 names, 31 queries, 2026-10-21)

Query template: `"<name>"` + profession + city for staff, `"<name>"` + city for contacts and reviewers.

| # | Name (current) | Where used | Result | Verdict |
|---|---|---|---|---|
| 1 | Hana Okafor | staff, Dental and healthcare, San Diego, CA | One person of that name in an unrelated field; no dentist | clear |
| 2 | Leah Moreno | staff, Dental and healthcare, Scottsdale, AZ | Other people of that name in unrelated fields and places; no dentist | clear |
| 3 | Ben Achterberg | staff, Dental and healthcare, Scottsdale, AZ | Another person of that name in an unrelated business and state; no dentist | clear |
| 4 | Kiran Ballard | staff, Dental and healthcare, Naperville, IL | Only a patent listing; no orthodontist | clear |
| 5 | *retired name* (now Mateo Ruizandre) | staff, Dental and healthcare, Naperville, IL | No orthodontist of that name in the area | clear in context; renamed for 5a |
| 6 | Naomi Feld | staff, Dental and healthcare, San Francisco, CA | Other people of that name in unrelated fields and places; no dentist | clear |
| 7 | Arjun Patil | staff, Dental and healthcare, San Francisco, CA | Other people of that name in unrelated fields; no dentist | clear |
| 8 | Anika Bose | staff, Dental and healthcare, Austin, TX | Another person of that name, a student; no dentist | clear |
| 9 | Priya Sandhu | staff, Dental and healthcare, Portland, OR | Other people of that name in other professions and countries; no pediatric dentist in the city | clear |
| 10 | Owen Lacey | staff, Dental and healthcare, Portland, OR | Only an online username and a similar name in another profession; no dentist | clear |
| 11 | Celeste Haywood | staff, Dental and healthcare, Nashville, TN | Other people of that name in other professions and states; no dentist | clear |
| 12 | Lena Ortiz | staff, Legal and professional services, Dallas, TX | Another person of that name in another profession and state; no attorney | clear |
| 13 | *retired name* (now David Kwanlow) | staff, Legal and professional services, Dallas, TX | real person, same profession and city (city unconfirmed); name, firm, and website omitted | collides (same profession); renamed to David Kwanlow |
| 14 | Miriam Lowe | staff, Legal and professional services, Seattle, WA | Other people of that name in other states; a law firm with a different name; no attorney | clear |
| 15 | Anders Holt | staff, Legal and professional services, Seattle, WA | Other people of that name in other countries and states; an attorney in the city has a different first name (name omitted); no attorney of this name | clear |
| 16 | Jae-won Park | staff, Legal and professional services, Seattle, WA | Other people of that name in another field and country; an attorney with a similar, different name in another city (name omitted) | clear |
| 17 | Walt Brennan | staff, Legal and professional services, Chicago, IL | Other people of that name in unrelated fields; no attorney | clear |
| 18 | Sasha Ivers | staff, Legal and professional services, Chicago, IL | Other people of that name in unrelated fields and states; no attorney | clear |
| 19 | Tom Delacroix | staff, Legal and professional services, Chicago, IL | Another person of that name in another country and field; no attorney | clear |
| 20 | Ruth Adeyemi | staff, Legal and professional services, Washington, DC | Another person of that name in another field and state; no attorney | clear |
| 21 | Nora Whitcomb | staff, Legal and professional services, Seattle, WA | Another person of that name, a student in another state; a fictional story; no attorney | clear |
| 22 | *retired name* (now Ana Delgarrow) | staff, Legal and professional services, San Jose, CA | real person, same profession (practising in another state); name and firm omitted | collides (same profession); renamed to Ana Delgarrow |
| 23 | Dale Gavelmoor + Catherine Varrowmere | staff, Legal and professional services, Phoenix, AZ | No match for either | clear |
| 24 | Gary Lindqvist | review-text, ?, ? | Appears only on pages of an unverifiable archive site; no identifiable real person | clear (unknown site) |
| 25 | Marisa Underhill | reviewer, Home services and contractors, Columbus, OH | People of that name in other states; none in the city | clear |
| 26 | Dashiell Guerrero | contact, Home services and contractors, Rock Hill, SC | A near-identical name on a student roster in another state; none in the city | clear |
| 27 | Uma Nakashima | reviewer, Home services and contractors, El Cajon, CA | A performer in another country; none in the city | clear |
| 28 | Simone Grant | contact, Legal and professional services, Irving, TX | People of that name in other cities and states; none in the city | clear |
| 29 | Fletcher Dunmore | reviewer, Home services and contractors, Arvada, CO | No person of that name | clear |
| 30 | Cyrus Osgood | reviewer, Home services and contractors, Asheville, NC | Only 19th-century records in another state; none in the city | clear |
| 31 | *retired name* (now Carmen Rourkland) | contact, Dental and healthcare, Tampa, FL | real person, same city (from a people-search record; name and relatives omitted) | collides (same city (people-search record)); renamed to Carmen Rourkland |
| 32 | Lorena Vance-Ortiz | contact, Automotive, Austin, TX | No person of that name | clear |

### 5c. Replacement names

All 36 replacement full names, and the final 734-name list, were re-run through the Wikipedia check: 1 hit (Jordan Park, a park, kept). The 14 replacement staff names were also web-searched in 5 OR-queries (`"<name>" OR "<name>" OR "<name>"`): no match for any. The other 22 replacement contact/reviewer names had the Wikipedia check only.

The 36 replacement names (the retired names they replace are in `scripts/lib/denylist.mjs` only): Alejandra Fuenmira, Alex Riveland, Ana Delgarrow, Brandon Colbrith, Carmen Rourkland, Chloe Bennisfield, Chris Langthwick, Colleen Murtagny, Dana Cruzalva, David Kwanlow, Derek Colvarth, Eleanor Vanstrell, Felix Garcellan, Grant Hollisford, Harold Jennaway, Helena Lindwerth, Ian Burkhallow, Ingrid Solmarth, Jamie Ortevale, Marcus Leovanne, Marcus Webbersley, Mateo Ruizandre, Mei Lintrove, Miles Cupwright, Morgan Ellisworth, Omar Hassanvale, Owen Bradwellin, Patrick Delanmere, Paul Reyesmont, Paul Vargasse, Raj Methuran, Ravi Subrahvel, Sofia Alvarenne, Sofia Martivell, Stan Kowalbrook, Vivian Galbrecken.

## 6. Counts

| Category | Total | Searched | Not searched | Collisions found and renamed |
|---|---|---|---|---|
| Old account names | 40 | 15 (incl. the 5 QA names, searched in fix 1b) | 25 (24 renamed preemptively + the prototype dental-group name, a QA finding) | 15 of 15 searched collide |
| Coined brand candidates | 75 | 75 | 0 | 36 rejected (35 in fix 1, 1 in fix 1b) |
| Final account names | 40 | 40 | 0 | 0 (1 borderline: Dentavane) |
| Office names, city + descriptor | 64 | 64 (19 brand-scoped queries) | 0 | 0 beyond the retired fix-1 brand |
| Office names, bare city / Main / HQ | 160 | 0 individually (brand checked) | 160 | n/a |
| Person full names, Wikipedia check | 734 | 734 | 0 | 32 (of 33 hits) |
| Person full names, contextual web search | 734 | 33 | 701 (status unknown) | 3 (5b rows 13, 22, 31; names in the denylist only) |
| Single first names | 59 | 0 | 59 | n/a |
| Replacement names (people + brand) | 37 | 37 Wikipedia + 15 web | 0 | 0 |

Total people renamed in fix 1b: 36 (32 Wikipedia, 1 famous fictional character (the protagonist of a well-known horror novel), 3 contextual).

## 7. What the validator enforces

The denylist (`scripts/lib/denylist.mjs`) holds the real names behind this document (the real dental group and its office nicknames, the retired account names, the rejected candidates, the retired person names, and well-known brands) only as salted SHA-256 hashes; the plain-text list is kept privately by the maintainers and is not in this repo. The validator hashes every 1-5 word n-gram of each checked string, the run-together form used in ids, slugs, hosts, and file names, and example.com host-label prefixes, and looks them up. It applies to ids, externalIds, paths, file names, slugs, email/website hosts, and `account.crm` as well as display text. Only `$schema` is exempt. `account.crm` must also be one of the products in `KNOWN_CRM_PRODUCTS` (same file). This document names real businesses and people only generically ("real dental practice, New Jersey"; "real person, same profession and city").

Reviews may name only cities where their account has a location. The check knows every city in `scripts/lib/geo.mjs` plus the 1,678 US places of 20,000+ people in `scripts/lib/us-places-20k.json` (U.S. Census Bureau SUB-EST2023, public domain). Names of four letters or more are matched as whole, case-sensitive words, longest first. The 199 single-word place names that are also a common English word (SCOWL size-50 list) or a common first name (U.S. Census Bureau 1990 first-name files, top 1,000) are listed in `scripts/lib/city-stoplist.json` with the reason and 2023 population for each; they count only next to a place word ("from Tyler", "visited Mobile", "flew into Mesa", "Mobile, AL"), and not when the next word shows an ordinary use ("in Superior form") or a longer name ("Mission Bay"). Stoplisted cities above `BIG_CITY_EXEMPT_MAX` = 500,000 people (7 of them; 17 are above 250,000) are flagged even with no place word; Balaji K confirmed this setting on 2026-10-21. A person's full name written out (staff, reviewer, `employeesMentioned`) is ignored, unless the "name" is itself a place (an `employeesMentioned` entry "Santa Fe" does not hide "in Santa Fe"); a single name word only exempts a stoplisted name with no place word next to it. Known limits: a cue-less mention of a smaller ambiguous name ("Tyler has nothing like this") passes, and a big-city word used as a name ("a referral from Dallas, my coworker") is flagged.

## 8. Names added in 1.1.0 (listings enrichment)

No new person or business names. The 1.1.0 fields reuse the existing invented brands, offices, and staff:

| New text | Where | Collision check |
|---|---|---|
| Listing URLs `https://{site}.example.com/biz/{slug}` | `locations[].listings[].url` | `example.com` is reserved (RFC 2606) and never resolves; slugs come from the brand and office names already checked in sections 3 and 4 |
| Secondary categories and attributes | `locations[].categories`, `attributes` | Generic category and attribute phrases in the style of public listing sites; no names, so no web check needed |
| Review and reply templates (`source/review-templates.json`) | re-rated reviews, templated replies | Slots only (`{brand}`, `{staff}`, `{first}`, ...); a scan for capitalised words finds only "Saturday" |
| Site labels Google, Facebook, Yelp | `display.sites` | Real platforms named as review sources, as in 1.0.0 `reviews[].site`; not invented names |
