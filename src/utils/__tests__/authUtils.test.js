import { describe, it, expect, beforeEach } from 'vitest';
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  getToken,
  saveToken,
  clearToken,
  getStoredUser,
  saveUser,
  clearUser,
} from '@/utils/authUtils';

function makeToken(exp) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS256' })}.${base64url({ exp })}.sig`;
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('token storage', () => {
  it('saves and reads back a valid (non-expired) token', () => {
    const token = makeToken(Math.floor(Date.now() / 1000) + 3600);
    saveToken(token);
    expect(getToken()).toBe(token);
  });

  it('does not persist a falsy token', () => {
    saveToken(null);
    expect(window.sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('returns null and self-clears when the stored token is already expired', () => {
    const expired = makeToken(Math.floor(Date.now() / 1000) - 3600);
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, expired);
    expect(getToken()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(getToken()).toBeNull();
  });

  it('clearToken removes the stored token', () => {
    saveToken(makeToken(Math.floor(Date.now() / 1000) + 3600));
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('user storage', () => {
  it('saves and reads back a user object', () => {
    const user = { id: 'u1', phone: '+919876543210' };
    saveUser(user);
    expect(getStoredUser()).toEqual(user);
  });

  it('does not persist a falsy user', () => {
    saveUser(null);
    expect(window.sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('returns null for missing user data', () => {
    expect(getStoredUser()).toBeNull();
  });

  it('self-heals from corrupted JSON rather than throwing', () => {
    window.sessionStorage.setItem(AUTH_USER_KEY, '{not-json');
    expect(getStoredUser()).toBeNull();
    expect(window.sessionStorage.getItem(AUTH_USER_KEY)).toBeNull();
  });

  it('clearUser removes the stored user', () => {
    saveUser({ id: 'u1' });
    clearUser();
    expect(getStoredUser()).toBeNull();
  });
});
