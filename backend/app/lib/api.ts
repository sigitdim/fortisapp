/* eslint-disable @typescript-eslint/no-explicit-any */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
const OWNER = process.env.NEXT_PUBLIC_OWNER_ID!;

type Opts = RequestInit & { json?: any };

export async function api(path: string, opts: Opts = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: Record<string,string> = {
    'x-owner-id': OWNER,
    'Content-Type': 'application/json',
    ...(opts.headers as any),
  };
  const body = opts.json !== undefined ? JSON.stringify(opts.json) : opts.body;
  const res = await fetch(url, { ...opts, headers, body, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`HTTP ${res.status} ${res.statusText} → ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}
