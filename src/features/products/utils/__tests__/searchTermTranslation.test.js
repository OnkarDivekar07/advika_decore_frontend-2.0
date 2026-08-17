import { describe, it, expect } from 'vitest';
import { buildSearchCandidates } from '@/features/products/utils/searchTermTranslation';

describe('buildSearchCandidates', () => {
  it('returns an empty array for an empty/whitespace query', () => {
    expect(buildSearchCandidates('')).toEqual([]);
    expect(buildSearchCandidates('   ')).toEqual([]);
    expect(buildSearchCandidates(undefined)).toEqual([]);
  });

  it('passes a plain English query straight through as the only candidate', () => {
    expect(buildSearchCandidates('brake pad')).toEqual(['brake pad']);
  });

  it('translates a whole-query Hindi category word to its English equivalent, keeping the original first', () => {
    // "ट्रक" -> Truck (see hi.json's categories.truck)
    const candidates = buildSearchCandidates('ट्रक');
    // Pure Devanagari can never match a product name, so the raw term is
    // skipped and only the translated candidate remains.
    expect(candidates).toEqual(['Truck']);
  });

  it('translates a two-wheeler style category with a hyphen into both hyphenated and spaced forms', () => {
    const candidates = buildSearchCandidates('दोपहिया वाहन');
    expect(candidates).toContain('Two-Wheeler');
    expect(candidates).toContain('Two Wheeler');
  });

  it('translates a category word embedded within a longer mixed-language phrase', () => {
    const candidates = buildSearchCandidates('ट्रक clutch plate');
    expect(candidates[0]).toBe('ट्रक clutch plate'); // raw query tried first (has Latin chars)
    expect(candidates).toContain('Truck');
  });

  it('is case/whitespace-insensitive when matching known category terms', () => {
    const candidates = buildSearchCandidates('  TRACTOR  ');
    // "tractor" already matches the English category term itself.
    expect(candidates[0]).toBe('TRACTOR');
  });

  it('deduplicates candidates case-insensitively while preserving first-seen order', () => {
    const candidates = buildSearchCandidates('Truck');
    // "Truck" (raw) should not be duplicated by its own translation match.
    expect(candidates.filter((c) => c.toLowerCase() === 'truck')).toHaveLength(1);
  });

  it('returns an empty array for a query with no known translation and only Devanagari (no results possible)', () => {
    const candidates = buildSearchCandidates('असंबंधित');
    expect(candidates).toEqual([]);
  });

  it('does not treat an unrelated English word as a category match', () => {
    const candidates = buildSearchCandidates('windshield wiper');
    expect(candidates).toEqual(['windshield wiper']);
  });
});
