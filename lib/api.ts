export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.fortislab.id";

export async function apiGet<T>(path: string, ownerId?: string | null, init?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-owner-id": ownerId ?? "",
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`GET ${path} -> ${r.status} ${r.statusText} ${text}`);
  }
  return (await r.json()) as T;
}
