// Copy-paste helper for prototypes and agents. No dependencies, works in browsers and Node 18+.
// Source: https://github.com/craft-birdeye/birdeye-business-context/blob/main/examples/business-context.js

export const BUSINESS_CONTEXT_BASE = "https://craft-birdeye.github.io/birdeye-business-context/v1";
// Committed snapshot on main; used only if Pages is unreachable. Its dates may be older.
const FALLBACK_BASE = "https://raw.githubusercontent.com/craft-birdeye/birdeye-business-context/main/v1";

const cache = new Map();

async function getJson(path) {
  if (!cache.has(path)) {
    cache.set(path, (async () => {
      for (const base of [BUSINESS_CONTEXT_BASE, FALLBACK_BASE]) {
        try {
          const res = await fetch(`${base}/${path}`);
          if (res.ok) return await res.json();
        } catch { /* try the next base */ }
      }
      cache.delete(path);
      throw new Error(`business-context: could not load ${path}`);
    })());
  }
  return cache.get(path);
}

/** Switcher list: { defaultAccountId, order, segments, industries, accounts: { [id]: summary + branding } } */
export const loadAccountsIndex = () => getJson("accounts-index.json");

/** Everything for one account: { account, locations, contacts, reviews }. Falls back to the default account. */
export async function loadAccount(accountId) {
  const index = await loadAccountsIndex();
  const id = index.accounts[accountId] ? accountId : index.defaultAccountId;
  return getJson(`accounts/${id}.json`);
}

/** Display helper: "2026-10-19T17:10:00Z" -> "Oct 19, 2026" */
export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** Apply an account's brand colors as CSS variables. */
export function applyBranding(branding, el = document.documentElement) {
  const c = branding.colors;
  el.style.setProperty("--brand-primary", c.primary);
  el.style.setProperty("--brand-secondary", c.secondary);
  el.style.setProperty("--brand-accent", c.accent);
  el.style.setProperty("--brand-on-primary", c.onPrimary);
}
