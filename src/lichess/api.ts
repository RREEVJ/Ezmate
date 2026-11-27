import { forget, HOST, token } from './auth.ts';

export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(HOST + path, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, Accept: 'application/x-ndjson, application/json' },
  });
  if (res.status === 401) { forget(); throw new Error('Session expired, log in again'); }
  if (res.status === 429) throw new Error('Rate limited, wait one minute');
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.error === 'string' ? body.error : JSON.stringify(body?.error ?? '');
    throw new Error(`Lichess ${res.status} ${detail}`);
  }
  return res;
}

export const post = (path: string, data?: Record<string, string>, signal?: AbortSignal) =>
  api(path, { method: 'POST', body: data && new URLSearchParams(data), signal });

/** newline-delimited JSON; blank lines are keep-alives */
export async function readLines<T>(res: Response, onData: (data: T) => void) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    const lines = (buf + value).split('\n');
    buf = lines.pop()!;
    for (const line of lines) if (line.trim()) onData(JSON.parse(line));
  }
}
