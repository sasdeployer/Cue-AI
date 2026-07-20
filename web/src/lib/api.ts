export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

export interface DeckSummary {
  id: string;
  title: string;
  prompt: string;
  createdAt: string;
}

export interface Deck {
  id: string;
  owner: string;
  title: string;
  prompt: string;
  appTsx: string;
  tokensCss: string;
  isPublic: boolean;
  createdAt: string;
}

export interface GenerateResult {
  id: string;
  title: string;
  message: string;
  appTsx: string;
  tokensCss: string;
}

export async function listDecks(): Promise<DeckSummary[]> {
  const r = await fetch(`${API_BASE}/api/decks`);
  if (!r.ok) throw new Error('failed to load gallery');
  const data = await r.json();
  return data.decks ?? [];
}

export async function getDeck(id: string): Promise<Deck> {
  const r = await fetch(`${API_BASE}/api/decks/${id}`);
  if (!r.ok) throw new Error('deck not found');
  return r.json();
}

export interface GenerateHandlers {
  onDelta?: (text: string) => void;
  onDone?: (result: GenerateResult) => void;
  onError?: (message: string) => void;
  signal?: AbortSignal;
}

/**
 * Stream a deck generation. Reads the SSE response body and dispatches
 * delta / done / error events.
 */
export async function generateDeck(prompt: string, h: GenerateHandlers): Promise<void> {
  const resp = await fetch(`${API_BASE}/api/decks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt }),
    signal: h.signal,
  });

  if (!resp.ok || !resp.body) {
    let msg = 'generation failed';
    try {
      const j = await resp.json();
      msg = j.error ?? msg;
    } catch { /* ignore */ }
    h.onError?.(msg);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const dispatch = (block: string) => {
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return;
    let payload: any;
    try { payload = JSON.parse(data); } catch { return; }
    if (event === 'delta') h.onDelta?.(payload.text ?? '');
    else if (event === 'done') h.onDone?.(payload as GenerateResult);
    else if (event === 'error') h.onError?.(payload.error ?? 'error');
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      dispatch(block);
    }
  }
  if (buffer.trim()) dispatch(buffer);
}
