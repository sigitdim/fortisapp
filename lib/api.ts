/**
 * API helper (COMPAT ALL-IN-ONE, CALLABLE)
 * Mendukung SEMUA pola project lama:
 * - default export callable:  api("/path", opts)
 * - named export callable:    import { api } from "@/lib/api"; api("/path", opts)
 * - named helpers:            apiFetch/getJson/postJson/putJson/patchJson/delJson
 * - short alias:              apiGet/apiPost/apiPut/apiPatch/apiDel
 * - legacy:                   buildHeaders, fetchProdukList (return ARRAY), setupUpsert, setupUpdateById
 * - types:                    Produk
 */

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
export const OWNER_ID  = process.env.NEXT_PUBLIC_OWNER_ID  || "";

export type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: any;
  cache?: RequestCache;
  next?: any;
  signal?: AbortSignal;
};

export type Produk = { id: string; nama: string };

function buildUrl(path: string) {
  return path.startsWith("http") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`;
}

/** Dipakai di beberapa file lama */
export function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-owner-id": OWNER_ID,
    ...(extra || {}),
  };
}

/** Core fetch */
export async function apiFetch<T = any>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = buildUrl(path);
  const { method = "GET", headers = {}, body, ...rest } = opts;

  const res = await fetch(url, {
    method,
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${method} ${url} -> ${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return (ct.includes("application/json") ? res.json() : res.text()) as any;
}

/* ---- Helpers klasik ---- */
export async function getJson<T = any>(path: string, opts: Omit<FetchOpts, "method" | "body"> = {}) {
  return apiFetch<T>(path, { ...opts, method: "GET" });
}
export async function postJson<T = any>(path: string, body?: any, opts: Omit<FetchOpts, "method"> = {}) {
  return apiFetch<T>(path, { ...opts, method: "POST", body });
}
export async function putJson<T = any>(path: string, body?: any, opts: Omit<FetchOpts, "method"> = {}) {
  return apiFetch<T>(path, { ...opts, method: "PUT", body });
}
export async function patchJson<T = any>(path: string, body?: any, opts: Omit<FetchOpts, "method"> = {}) {
  return apiFetch<T>(path, { ...opts, method: "PATCH", body });
}
export async function delJson<T = any>(path: string, opts: Omit<FetchOpts, "method" | "body"> = {}) {
  return apiFetch<T>(path, { ...opts, method: "DELETE" });
}

/* ---- Short alias yang sering dipakai ---- */
export const apiGet   = getJson;
export const apiPost  = postJson;
export const apiPut   = putJson;
export const apiPatch = patchJson;
export const apiDel   = delJson;

/* ---------- Compat khusus: fetchProdukList (RETURN ARRAY) ---------- */
async function tryFirst(paths: string[]): Promise<any[]> {
  for (const p of paths) {
    try {
      const r = await getJson<any>(p);
      const arr = Array.isArray(r) ? r : (r?.data ?? []);
      if (Array.isArray(arr)) return arr;
    } catch {/* next */}
  }
  return [];
}
/** Dipanggil sebagai: import { fetchProdukList } from "@/lib/api" */
export async function fetchProdukList(query: Record<string, any> = {}): Promise<any[]> {
  const q = new URLSearchParams();
  Object.entries(query).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== "") q.set(k, String(v)); });
  const suf = q.toString() ? `?${q.toString()}` : "";
  return tryFirst([ `/produk${suf}`, `/products${suf}`, `/pricing/produk${suf}` ]);
}

/* ---------- Compat setup helpers ---------- */
export async function setupUpsert(resource: string, body: any) {
  // ex: setupUpsert("bahan", { nama_bahan, satuan, harga })
  return postJson(`/setup/${resource}`, body);
}
export async function setupUpdateById(resource: string, id: string, body: any) {
  // ex: setupUpdateById("bahan", bahan_id, payload)
  return putJson(`/setup/${resource}/${id}`, body);
}

/* ---------- Callable export: api(...) ---------- */
function callableApi<T = any>(path: string, opts?: FetchOpts): Promise<T> {
  return apiFetch<T>(path, opts);
}
/* tambahkan properti agar api.xxx tetap ada */
(callableApi as any).apiFetch = apiFetch;
(callableApi as any).getJson = getJson;
(callableApi as any).postJson = postJson;
(callableApi as any).putJson = putJson;
(callableApi as any).patchJson = patchJson;
(callableApi as any).delJson = delJson;
(callableApi as any).apiGet = apiGet;
(callableApi as any).apiPost = apiPost;
(callableApi as any).apiPut = apiPut;
(callableApi as any).apiPatch = apiPatch;
(callableApi as any).apiDel = apiDel;
(callableApi as any).buildHeaders = buildHeaders;
(callableApi as any).fetchProdukList = fetchProdukList;
(callableApi as any).setupUpsert = setupUpsert;
(callableApi as any).setupUpdateById = setupUpdateById;
(callableApi as any).BASE_URL = BASE_URL;
(callableApi as any).OWNER_ID = OWNER_ID;

/* Named + default export */
export { callableApi as api };
export default callableApi;
