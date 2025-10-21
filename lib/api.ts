// lib/api.ts
export type ApiOpts = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  cache?: RequestCache;
};

function buildUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return path.startsWith("http") ? path : `${base}${path}`;
}

export async function api(path: string, opts: ApiOpts = {}) {
  const url = buildUrl(path);
  const hdrs: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  // inject owner id jika tersedia
  if (!hdrs["x-owner-id"] && process.env.NEXT_PUBLIC_OWNER_ID) {
    hdrs["x-owner-id"] = process.env.NEXT_PUBLIC_OWNER_ID;
  }

  const res: any = await fetch(url, {
    method: opts.method || "GET",
    headers: hdrs,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? "no-store",
  });

  // ---- safe read content-type (tanpa asumsi Headers.get) ----
  let contentType = "";
  try {
    const h = (res as any).headers;
    if (h && typeof h.get === "function") {
      contentType = h.get("content-type") || "";
    } else if (h && typeof h === "object") {
      contentType = (h["content-type"] as string) || (h["Content-Type"] as string) || "";
    }
  } catch { /* ignore */ }

  // kalau error, keluarkan body agar mudah debug
  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch { /* ignore */ }
    throw new Error(`${res.status} ${text}`.trim());
  }

  // parse aman
  if (contentType.includes("application/json")) {
    return res.json();
  }
  try {
    const t = await res.text();
    return JSON.parse(t);
  } catch {
    return res.text();
  }
}

export async function apiGet<T = any>(path: string, headers?: Record<string, string>): Promise<T> {
  return api(path, { headers }) as Promise<T>;
}

export async function fetchProdukList(): Promise<{ id: string; nama: string }[]> {
  const j: any = await api("/produk");
  const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
  return arr.map((p: any) => ({
    id: p.id || p.produk_id,
    nama: p.nama || p.nama_produk || p.name,
  }));
}
