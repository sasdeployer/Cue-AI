// Client-side, encrypted-at-rest storage for a visitor's own OpenAI/Anthropic
// API key (bring-your-own-key). There are no accounts, so this is scoped to
// one browser: a random AES-GCM device key lives in localStorage, and each
// provider key is encrypted with it before being stored alongside. This
// protects against casual exposure (a glance at dev tools, a screenshot, a
// log scrape) — it is NOT protection against a fully compromised machine,
// which no purely client-side scheme (no account, no server secret) can be.
// The raw key is only ever decrypted in memory to attach to an outgoing
// request header; it's never sent anywhere for storage.

export type Provider = 'openai' | 'anthropic';

const DEVICE_KEY_STORAGE = 'cue_device_key';
const PROVIDER_STORAGE: Record<Provider, string> = {
  openai: 'cue_byok_openai',
  anthropic: 'cue_byok_anthropic',
};
const HEADER_NAME: Record<Provider, string> = {
  openai: 'X-User-OpenAI-Key',
  anthropic: 'X-User-Anthropic-Key',
};

function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function base64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getDeviceKey(): Promise<CryptoKey> {
  let raw = localStorage.getItem(DEVICE_KEY_STORAGE);
  if (!raw) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    raw = bufToBase64(bytes);
    localStorage.setItem(DEVICE_KEY_STORAGE, raw);
  }
  return crypto.subtle.importKey('raw', base64ToBuf(raw) as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext) as BufferSource,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bufToBase64(combined);
}

async function decrypt(stored: string): Promise<string> {
  const key = await getDeviceKey();
  const combined = base64ToBuf(stored);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

export async function setProviderKey(provider: Provider, rawKey: string): Promise<void> {
  const trimmed = rawKey.trim();
  if (!trimmed) return;
  localStorage.setItem(PROVIDER_STORAGE[provider], await encrypt(trimmed));
}

export function clearProviderKey(provider: Provider): void {
  localStorage.removeItem(PROVIDER_STORAGE[provider]);
}

export function hasProviderKey(provider: Provider): boolean {
  return !!localStorage.getItem(PROVIDER_STORAGE[provider]);
}

async function getProviderKey(provider: Provider): Promise<string | null> {
  const stored = localStorage.getItem(PROVIDER_STORAGE[provider]);
  if (!stored) return null;
  try {
    return await decrypt(stored);
  } catch {
    // device key changed/corrupted storage — drop the unreadable entry
    clearProviderKey(provider);
    return null;
  }
}

// Masked for display once saved — e.g. "sk-...WXYZ" — never show the full key again.
export function maskKey(rawKey: string): string {
  const tail = rawKey.slice(-4);
  return `${rawKey.slice(0, 3)}···${tail}`;
}

// Spread into a fetch's headers — empty for whichever provider has no key set.
export async function byokHeaders(): Promise<Record<string, string>> {
  const [openai, anthropic] = await Promise.all([getProviderKey('openai'), getProviderKey('anthropic')]);
  const headers: Record<string, string> = {};
  if (openai) headers[HEADER_NAME.openai] = openai;
  if (anthropic) headers[HEADER_NAME.anthropic] = anthropic;
  return headers;
}
