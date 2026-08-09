// src/features/products/utils/searchTermTranslation.js
//
// Honest scoping note: product names in this app are stored (and
// validated) as English-only text — see the backend's
// product.validation.js, which rejects Devanagari characters outright,
// and the Product schema, which has a single `name: String` field with
// no per-language variants. The search endpoint does a literal
// case-insensitive substring match against that one field
// (paginateWithCache -> `{ contains: searchQuery, mode: 'insensitive' }`).
//
// That means there is no way to do genuine free-text Hindi/Marathi
// search against arbitrary product names — the data to match against
// simply isn't there. What *is* real, data-backed multilingual support:
// the app's own i18n files already carry verified Hindi and Marathi
// translations for the fixed set of vehicle categories (see
// i18n/{en,hi,mr}.json -> "categories"). Since most searches in this
// domain are really "show me parts for my <vehicle>", translating those
// known category words to their English equivalent before querying
// covers the overwhelming majority of real Hindi/Marathi searches
// without guessing at translations we can't verify.
//
// Both English search (pass the query straight through) and this
// category-vocabulary translation are combined into a small ordered list
// of candidate queries that the search page tries in turn.
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import mr from '@/i18n/mr.json';

const normalize = (s) =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

// Build { normalizedTerm -> canonicalEnglishSearchTerms[] } from every
// language's category labels, e.g. "ट्रक" -> ["Truck"], "two-wheeler" ->
// ["Two Wheeler", "Two-Wheeler"] (both forms offered since we don't know
// which spelling appears in actual product names).
function buildDictionary() {
  const dict = new Map();
  const categoryKeys = Object.keys(en.categories || {});

  for (const key of categoryKeys) {
    const enLabel = en.categories[key];
    if (!enLabel) continue;

    const searchTerms = new Set([enLabel]);
    if (enLabel.includes('-')) searchTerms.add(enLabel.replace(/-/g, ' '));
    const terms = Array.from(searchTerms);

    for (const langPack of [en, hi, mr]) {
      const label = langPack.categories?.[key];
      if (!label) continue;
      const normalized = normalize(label);
      if (!normalized) continue;
      const existing = dict.get(normalized) || [];
      dict.set(normalized, Array.from(new Set([...existing, ...terms])));
    }
  }
  return dict;
}

const TERM_DICTIONARY = buildDictionary();

// Product names are validated English-only on the backend (see the file
// header) — Devanagari text can never appear in a match, so a query made
// up entirely of Devanagari characters is guaranteed to return 0 results
// as-typed. Detecting that lets us skip firing that doomed request
// entirely instead of burning a round trip before falling back to the
// translated term.
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const isPureDevanagari = (s) => DEVANAGARI_RE.test(s) && !/[a-zA-Z]/.test(s);

/**
 * Turn a raw user query into an ordered list of distinct search strings
 * to try against the API, most-likely-to-match first:
 *   1. The exact query as typed — UNLESS it's pure Devanagari, which can
 *      never match a product name, in which case it's skipped so we
 *      don't waste a request on a search that's guaranteed to be empty.
 *   2. The whole query translated, if it exactly matches a known
 *      category term in any language (e.g. "ट्रॅक्टर" -> "Tractor").
 *   3. Any individual word within the query that matches a known
 *      category term, translated (handles a category word mixed into a
 *      longer phrase).
 *
 * @param {string} rawQuery
 * @returns {string[]} deduplicated, non-empty candidate queries. Can be
 *   empty (e.g. untranslatable Devanagari text) — callers should treat
 *   that the same as a confirmed no-results search, not an error.
 */
export function buildSearchCandidates(rawQuery) {
  const trimmed = String(rawQuery ?? '').trim();
  if (!trimmed) return [];

  const skipRawCandidate = isPureDevanagari(trimmed);
  const candidates = skipRawCandidate ? [] : [trimmed];

  const wholeMatch = TERM_DICTIONARY.get(normalize(trimmed));
  if (wholeMatch) candidates.push(...wholeMatch);

  const words = trimmed.split(/\s+/);
  if (words.length > 1) {
    for (const word of words) {
      const wordMatch = TERM_DICTIONARY.get(normalize(word));
      if (wordMatch) candidates.push(...wordMatch);
    }
  }

  // Dedupe case-insensitively while preserving first-seen order/casing.
  const seen = new Set();
  return candidates.filter((c) => {
    const key = c.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
