import { describe, it, expect } from 'vitest';
import { decodeJwtPayload, getTokenExpiryMs, isTokenExpired } from '@/utils/jwt';

// Builds an unsigned (fake) JWT with the given payload — good enough since
// this module never verifies signatures, only decodes the payload.
function makeToken(payload, { header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url(header)}.${base64url(payload)}.fake-signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed token payload', () => {
    const token = makeToken({ userId: 'u1', exp: 1893456000 });
    expect(decodeJwtPayload(token)).toEqual({ userId: 'u1', exp: 1893456000 });
  });

  it('returns null for a non-string token', () => {
    expect(decodeJwtPayload(null)).toBeNull();
    expect(decodeJwtPayload(undefined)).toBeNull();
    expect(decodeJwtPayload(123)).toBeNull();
  });

  it('returns null for a token that does not have 3 parts', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
  });

  it('returns null for a token with an unparseable payload', () => {
    expect(decodeJwtPayload('a.not-base64-json.c')).toBeNull();
  });
});

describe('getTokenExpiryMs', () => {
  it('returns the exp claim converted to epoch milliseconds', () => {
    const token = makeToken({ exp: 1893456000 });
    expect(getTokenExpiryMs(token)).toBe(1893456000 * 1000);
  });

  it('returns null when there is no exp claim', () => {
    const token = makeToken({ userId: 'u1' });
    expect(getTokenExpiryMs(token)).toBeNull();
  });

  it('returns null for a malformed token', () => {
    expect(getTokenExpiryMs('garbage')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('treats a missing token as expired', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('')).toBe(true);
  });

  it('treats a malformed token as expired (never trust what cannot be decoded)', () => {
    expect(isTokenExpired('garbage')).toBe(true);
  });

  it('treats a token with a future exp as valid', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600; // +1h
    const token = makeToken({ exp: futureExp });
    expect(isTokenExpired(token)).toBe(false);
  });

  it('treats a token with a past exp as expired', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600; // -1h
    const token = makeToken({ exp: pastExp });
    expect(isTokenExpired(token)).toBe(true);
  });

  it('applies the skew window so a token expiring within it counts as expired', () => {
    const almostExpiredExp = Math.floor(Date.now() / 1000) + 2; // 2s from now
    const token = makeToken({ exp: almostExpiredExp });
    expect(isTokenExpired(token, 5000)).toBe(true); // 5s skew > 2s remaining
  });

  it('treats a token with no exp claim as valid (cannot tell, assume valid)', () => {
    const token = makeToken({ userId: 'u1' });
    expect(isTokenExpired(token)).toBe(false);
  });
});
