// src/utils/jwt.js
//
// Minimal, dependency-free JWT payload reader. This NEVER verifies the
// token's signature (that's the backend's job, and we have no way to do
// it safely on the client anyway without exposing a secret) — it only
// base64url-decodes the payload so the UI can know when the token
// expires and proactively log the user out instead of waiting for the
// next API call to fail.
//
// Nothing here should ever be treated as a trust boundary. It is purely
// a UX optimization on top of server-side enforcement.

/**
 * Decode a JWT's payload without verifying its signature.
 * @param {string} token
 * @returns {object|null} decoded payload, or null if the token is malformed
 */
export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @returns {number|null} expiry as epoch milliseconds, or null if unknown
 */
export function getTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}

/**
 * @param {string} token
 * @param {number} [skewMs=0] - treat the token as expired this many ms early,
 *   to leave headroom for clock drift / in-flight requests.
 * @returns {boolean} true if the token is missing, malformed, or expired
 */
export function isTokenExpired(token, skewMs = 5000) {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (payload === null) return true; // couldn't decode at all — never trust it

  if (typeof payload.exp !== 'number') return false; // no exp claim — can't tell, assume valid
  return Date.now() >= payload.exp * 1000 - skewMs;
}
