import { API_BASE } from './api';
import type { DeckSummary } from './api';

const STORAGE_KEY = 'cue_session_token';

export function getSessionToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function setSessionToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

function clearSessionToken() {
  localStorage.removeItem(STORAGE_KEY);
}

// Spread into a fetch's headers — empty object (no-op) when logged out.
export function authHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function requestMagicLink(email: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!r.ok) throw new Error('Could not send login link — try again.');
}

// Consumes the one-time token from the emailed link, stores the resulting
// session, and returns the now-logged-in user's email.
export async function verifyMagicLink(token: string): Promise<string> {
  const r = await fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`);
  if (!r.ok) throw new Error('That login link is invalid or has expired.');
  const data = await r.json();
  setSessionToken(data.sessionToken);
  return data.email as string;
}

// Resolves the stored session token to an email, or null if logged out /
// the token's no longer valid (in which case it's cleared).
export async function getMe(): Promise<string | null> {
  if (!getSessionToken()) return null;
  const r = await fetch(`${API_BASE}/api/me`, { headers: authHeaders() });
  if (!r.ok) {
    clearSessionToken();
    return null;
  }
  const data = await r.json();
  return data.email as string;
}

export async function logout(): Promise<void> {
  const token = getSessionToken();
  if (token) {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', headers: authHeaders() }).catch(() => {});
  }
  clearSessionToken();
}

export async function getMyDecks(): Promise<DeckSummary[]> {
  const r = await fetch(`${API_BASE}/api/me/decks`, { headers: authHeaders() });
  if (!r.ok) throw new Error('Failed to load your decks.');
  const data = await r.json();
  return data.decks ?? [];
}
