// Seeded, deterministic enrichment for schema 1.1.0 (proposals 1 and 2 of V2BIRD-35871).
// Every draw comes from its own keyed stream (seed + row id + purpose), so editing one row never
// reshuffles another. All parameters live in source/distributions.json; sources in docs/distributions.md.
// Node built-ins only.

const DAY = 86400000;

export function fnv(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function profileKeyFor(D, a) {
  const p = D.profileFor;
  return a.segment === p.channelSegment || a.industryId === p.agencyIndustry ? p.agencyProfile : a.industryId;
}
export const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const round1 = (x) => Math.round(x * 10) / 10;

/** Star histogram for a listing: tilt the profile's star shares toward `targetMean`, keep at least the sampled counts. */
export function listingHistogram(starShare, count, targetMean, sampledByStar) {
  const stars = [1, 2, 3, 4, 5];
  const base = stars.map((s) => Math.max(starShare[s], 1e-6));
  const mean = (lam) => { const w = base.map((b, i) => b * Math.exp(lam * stars[i])); const t = w.reduce((x, y) => x + y, 0); return [w.map((x) => x / t), w.reduce((x, y, i) => x + y * stars[i], 0) / t]; };
  let lo = -20, hi = 20;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (mean(mid)[1] < targetMean) lo = mid; else hi = mid; }
  const w = mean((lo + hi) / 2)[0];
  const c = stars.map((s) => sampledByStar[s] ?? 0);
  let rest = count - c.reduce((x, y) => x + y, 0);
  if (rest < 0) throw new Error("listing count below sampled reviews");
  const raw = w.map((x) => x * rest), fl = raw.map(Math.floor);
  let left = rest - fl.reduce((x, y) => x + y, 0);
  const order = raw.map((x, i) => [x - fl[i], i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  for (const [, i] of order) { if (left <= 0) break; fl[i]++; left--; }
  const out = {}; stars.forEach((s, i) => { out[String(s)] = c[i] + fl[i]; });
  return out;
}
export function histogramRating(h) {
  const n = Object.values(h).reduce((x, y) => x + y, 0);
  return n ? round1(Object.entries(h).reduce((x, [s, k]) => x + Number(s) * k, 0) / n) : null;
}

/** US holidays used for specialHours, for one calendar year, as { name: "YYYY-MM-DD" }. */
export function holidaysForYear(y) {
  const d = (m, day) => new Date(Date.UTC(y, m - 1, day));
  const nth = (m, wd, n) => { const f = d(m, 1); const off = (wd - f.getUTCDay() + 7) % 7; return d(m, 1 + off + 7 * (n - 1)); };
  const last = (m, wd) => { const l = new Date(Date.UTC(y, m, 0)); const off = (l.getUTCDay() - wd + 7) % 7; return new Date(l.getTime() - off * DAY); };
  const iso = (x) => x.toISOString().slice(0, 10);
  return {
    "New Year's Day": iso(d(1, 1)), "Memorial Day": iso(last(5, 1)), "Independence Day": iso(d(7, 4)), "Labor Day": iso(nth(9, 1, 1)),
    "Thanksgiving Day": iso(nth(11, 4, 4)), "Christmas Eve": iso(d(12, 24)), "Christmas Day": iso(d(12, 25)), "New Year's Eve": iso(d(12, 31)),
  };
}
export function specialHoursWindow(D, buildDate) {
  const b = Date.parse(`${buildDate}T00:00:00Z`), h = D.common.holidays;
  return [new Date(b - h.windowDaysBefore * DAY).toISOString().slice(0, 10), new Date(b + h.windowDaysAfter * DAY).toISOString().slice(0, 10)];
}
export function haversineKm(lat1, lng1, lat2, lng2) {
  const r = (x) => (x * Math.PI) / 180, R = 6371.0088;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function makeEnricher({ D, T, CENTERS, buildDate }) {
  const C = D.common, V = D.display;
  const u = (key) => mulberry32(fnv(`${D.seed}|${key}`))();
  const normal = (key) => { const a = Math.max(u(key + ":a"), 1e-12), b = u(key + ":b"); return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b); };
  const pickWeighted = (weights, key) => { const e = Object.entries(weights).filter(([k]) => k !== "src"); const t = e.reduce((x, [, w]) => x + w, 0); let r = u(key) * t; for (const [k, w] of e) { r -= w; if (r < 0) return k; } return e.at(-1)[0]; };
  const pick = (arr, key) => arr[Math.floor(u(key) * arr.length)];
  const shuffle = (arr, key) => arr.map((x, i) => [u(`${key}:${i}`), x]).sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  const stochRound = (x, key) => Math.floor(x) + (u(key) < x - Math.floor(x) ? 1 : 0);
  const profile = (a) => D.profiles[profileKeyFor(D, a)];

  /** Proposal 1: reshape non-scenario review samples toward the profile's star shares, photos, reply rates and lags. */
  function curateReviews(srcAccounts, srcLocations, srcReviews) {
    const cur = D.curation;
    const locById = new Map(srcLocations.map((l) => [l.id, l]));
    const out = srcReviews.map((r) => ({ ...r, reply: r.reply ? { ...r.reply } : undefined }));
    const usedText = new Set(out.map((r) => r.text));
    const stats = { converted: 0, repliesAdded: 0 };
    const reshaped = new Set();
    for (const a of srcAccounts) {
      if (a.quickScenario && !cur.reshapeQuickScenarioAccounts) continue;
      reshaped.add(a.id);
      const pk = profileKeyFor(D, a), p = D.profiles[pk], sh = p.starShare;
      const revs = out.filter((r) => r.accountId === a.id).sort((x, y) => x.number - y.number);
      const n = revs.length;
      const lows = shuffle(revs.filter((r) => r.rating <= 2), `${a.id}:lows`);
      const threes = shuffle(revs.filter((r) => r.rating === 3), `${a.id}:threes`);
      const kLow = Math.min(lows.length, Math.max(cur.minLowStarReviewsPerAccount, stochRound(n * (sh[1] + sh[2]), `${a.id}:klow`)));
      const k3 = Math.min(threes.length, stochRound(n * sh[3], `${a.id}:k3`));
      const convert = [...lows.slice(kLow), ...threes.slice(k3)];
      const templates = T.reviews[pk];
      const usedTpl = new Set();
      for (const r of convert) {
        const loc = locById.get(r.locationId);
        let star = u(`${r.id}:star`) < sh[4] / (sh[4] + sh[5]) ? 4 : 5;
        const fill = (t) => t.replaceAll("{brand}", a.brandName)
          .replaceAll("{place}", a.purchasedLocations > 1 ? `the ${loc.shortName} location` : a.brandName)
          .replaceAll("{staff}", staff).replaceAll("{service}", service);
        const staff = pick(a.staff, `${r.id}:staff`), service = pick(a.services, `${r.id}:service`);
        let text = null, tplIdx = -1;
        for (const s of [star, star === 4 ? 5 : 4]) {
          for (const [t, i] of shuffle(templates.map((t, i) => [t, i]).filter(([t]) => t.stars === s), `${r.id}:tpl`)) {
            const cand = fill(t.text);
            if (!usedTpl.has(i) && !usedText.has(cand)) { text = cand; tplIdx = i; star = s; break; }
          }
          if (text) break;
        }
        if (!text) throw new Error(`no unused review template for ${r.id}`);
        usedTpl.add(tplIdx); usedText.add(text);
        r.rating = star; r.text = text;
        r.employeesMentioned = text.includes(staff) ? [staff] : [];
        delete r.reply; r.replyStatus = "post"; r._converted = true;
        stats.converted++;
      }
    }
    // reply rates: keep authored replies, add templated ones so each star's rate approaches replyRateByStar
    const pool = out.filter((r) => reshaped.has(r.accountId));
    const pAdd = {};
    for (const s of [1, 2, 3, 4, 5]) {
      const rows = pool.filter((r) => r.rating === s), have = rows.filter((r) => r.reply).length;
      const target = C.replyRateByStar[s] * rows.length;
      const open = rows.length - have;
      pAdd[s] = open ? Math.max(0, Math.min(1, (target - have) / open)) : 0;
    }
    const acct = new Map(srcAccounts.map((a) => [a.id, a]));
    for (const r of pool) {
      const a = acct.get(r.accountId);
      // review photos
      const hasPhotos = u(`${r.id}:photos`) < C.reviewPhotos.shareWithPhotos;
      r.photoCount = hasPhotos ? Number(pickWeighted(C.reviewPhotos.countWeights, `${r.id}:photoCount`)) : 0;
      if (!r.reply && u(`${r.id}:reply`) < pAdd[r.rating]) {
        const tone = r.rating >= 4 ? "positive" : r.rating === 3 ? "constructive" : "negative";
        const first = r.reviewer.split(/\s+/)[0];
        const body = pick(T.replies[tone][a.tone.formality], `${r.id}:replyTpl`).replaceAll("{first}", first).replaceAll("{signoff}", a.tone.replySignoff);
        r.reply = { text: `${body}\n\n${a.tone.replySignoff}`, author: a.tone.replySignoff };
        r.replyStatus = "edit";
        stats.repliesAdded++;
      }
      if (r.reply) {
        // lag in hours, from the bucketed distribution; the generator withholds replies that would land after the build time
        const b = C.replyLagHours.buckets, k = Number(pickWeighted(Object.fromEntries(b.map((x, i) => [i, x.share])), `${r.id}:lagBucket`));
        const lo = k ? b[k - 1].maxHours : 0.25, hi = b[k].maxHours;
        const { daysAgo, ...rest } = r.reply;
        r.reply = { ...rest, lagHours: Math.round((lo + (hi - lo) * u(`${r.id}:lag`)) * 12) / 12 };
      }
      delete r._converted;
    }
    return { reviews: out, stats, reshaped };
  }

  /** Proposal 2: invented listing-level fields for one location. `sampled` = this location's reviews (dated). */
  function enrichLocation(l, a, sampled) {
    const p = profile(a);
    const primary = a.profile.categories[0];
    const secPool = (p.secondaryCategories[primary] ?? []).filter((c) => c !== primary);
    const nSec = Math.min(secPool.length, Number(pickWeighted(C.secondaryCategoryCountWeights, `${l.id}:nsec`)));
    const secondary = shuffle(secPool, `${l.id}:sec`).slice(0, nSec);

    const [clat, clng] = CENTERS[l.locationLine];
    const { minKm, maxKm } = C.coordinates;
    const rKm = Math.sqrt(u(`${l.id}:r`) * (maxKm ** 2 - minKm ** 2) + minKm ** 2), th = 2 * Math.PI * u(`${l.id}:theta`);
    const lat = clat + (rKm / 111.32) * Math.cos(th);
    const lng = clng + (rKm / (111.32 * Math.cos((clat * Math.PI) / 180))) * Math.sin(th);

    const status = l.status === "Inactive" && !l.isHeadquarters ? pickWeighted(C.businessStatusWhenInactive, `${l.id}:status`) : "open";

    const [from, to] = specialHoursWindow(D, buildDate);
    const y = Number(buildDate.slice(0, 4));
    const specialHours = [];
    if (status !== "permanentlyClosed") {
      for (const yy of [y - 1, y, y + 1]) for (const [name, date] of Object.entries(holidaysForYear(yy))) {
        if (date < from || date > to || !C.holidays.list.includes(name)) continue;
        if (p.holidayPolicy.closed.includes(name)) specialHours.push({ date, name, closed: true });
        else if (p.holidayPolicy.reduced[name]) { const [open, close] = p.holidayPolicy.reduced[name]; specialHours.push({ date, name, closed: false, open, close }); }
      }
      specialHours.sort((x, z) => x.date.localeCompare(z.date));
    }

    const excluded = new Set(V.attributeGroupsExcluded ?? []);
    const attributes = p.attributes.filter((x) => !excluded.has(x.group) && u(`${l.id}:attr:${x.label}`) < x.p).map(({ group, label }) => ({ group, label }));

    const ph = C.listingPhotos;
    const photoCount = Math.max(ph.min, Math.min(ph.max, Math.round(Math.exp(Math.log(ph.median * p.photoMultiplier.value) + ph.sigma * normal(`${l.id}:photos`)))));

    const gMedian = p.googleReviewCountMedianByCategory[primary]?.value;
    if (!gMedian) throw new Error(`no googleReviewCountMedianByCategory for "${primary}" (${a.id})`);
    const gCount = Math.round(Math.exp(Math.log(gMedian) + C.listingReviewCountSigma.value * normal(`${l.id}:gcount`)));
    const listings = [];
    for (const { id: site } of V.sites) {
      const mine = sampled.filter((r) => r.site === site);
      if (!mine.length && u(`${l.id}:${site}:listed`) >= C.siteListedProbability[site]) continue;
      let count = site === "google" ? gCount : Math.round(gCount * (C.siteShare[site] / C.siteShare.google) * Math.exp(C.otherSiteCountSigma.value * normal(`${l.id}:${site}:count`)));
      count = Math.max(count, mine.length);
      const sd = D.common.listingRatingSd;
      const cap = count > sd.maxWhenOverReviews.reviews ? sd.maxWhenOverReviews.max : sd.max;
      const target = Math.max(sd.min, Math.min(cap, p.listingRatingMedian.value + C.siteRatingOffset[site] + sd.value * normal(`${l.id}:${site}:rating`)));
      const byStar = {}; for (const r of mine) byStar[r.rating] = (byStar[r.rating] ?? 0) + 1;
      const ratingDistribution = listingHistogram(p.starShare, count, target, byStar);
      const claimed = u(`${l.id}:${site}:claimed`) < C.claimed[site][l.status];
      listings.push({
        site,
        url: V.listingUrlTemplate.replace("{site}", site).replace("{slug}", slugify(l.name)),
        claimed,
        verified: claimed && u(`${l.id}:${site}:verified`) < C.claimed.verifiedIfClaimed,
        rating: histogramRating(ratingDistribution),
        reviewCount: count,
        ratingDistribution,
        sampledReviews: mine.length,
      });
    }
    const total = listings.reduce((x, s) => x + s.reviewCount, 0);
    const sum = listings.reduce((x, s) => x + Object.entries(s.ratingDistribution).reduce((y, [k, n]) => y + Number(k) * n, 0), 0);
    return {
      coordinates: { lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5 },
      categories: { primary, secondary },
      businessStatus: status,
      businessStatusLabel: V.businessStatus[status],
      specialHours,
      attributes,
      photoCount,
      listings,
      reviewSummary: { totalReviews: total, averageRating: total ? round1(sum / total) : null, sampledReviews: sampled.length, listedSites: listings.length },
    };
  }

  function accountSummary(locs) {
    const ls = locs.flatMap((l) => l.listings);
    const total = ls.reduce((x, s) => x + s.reviewCount, 0);
    const sum = ls.reduce((x, s) => x + Object.entries(s.ratingDistribution).reduce((y, [k, n]) => y + Number(k) * n, 0), 0);
    return {
      locations: locs.length,
      openLocations: locs.filter((l) => l.businessStatus === "open").length,
      listings: ls.length,
      claimedListings: ls.filter((s) => s.claimed).length,
      verifiedListings: ls.filter((s) => s.verified).length,
      totalReviews: total,
      averageRating: total ? round1(sum / total) : null,
      photoCount: locs.reduce((x, l) => x + l.photoCount, 0),
    };
  }
  return { curateReviews, enrichLocation, accountSummary };
}
