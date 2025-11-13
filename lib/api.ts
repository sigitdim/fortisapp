type ApiOptions = RequestInit & { asJson?: boolean };
type AnyObj = Record<string, any>;

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id"
).replace(/\/+$/, "");

/* ===== owner id reader (works in browser, safe on server) ===== */
function readOwnerId(): string {
  try {
    if (typeof window !== "undefined") {
      const ls = window.localStorage?.getItem("fortisapp.owner_id");
      if (ls) return ls;
      const m = document.cookie.match(/(?:^|;\\s*)fortis_owner_id=([^;]+)/);
      if (m) return decodeURIComponent(m[1]);
    }
  } catch {}
  return process.env.NEXT_PUBLIC_OWNER_ID || "";
}

/* ===== legacy: buildHeaders ===== */
export function buildHeaders(extra?: HeadersInit): HeadersInit {
  const ownerId = readOwnerId();
  const base: HeadersInit = {
    "Content-Type": "application/json",
    "x-owner-id": ownerId,
  };
  return { ...(base as any), ...(extra as any) };
}

/* ===== legacy: api (NO MORE FE proxy, direct to BE) ===== */
export async function api(path: string, opts: ApiOptions = {}) {
  const { asJson = false, headers, ...rest } = opts;
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${pathPart}`;
  const res = await fetch(url, { ...rest, headers: buildHeaders(headers) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return asJson ? (res.json() as any) : (res as any);
}

/* ===== legacy: getJson/apiGet/apiPost/... (loose types) ===== */
export async function getJson<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  return api(path, { method: "GET", asJson: true, ...(init || {}) });
}
export async function apiGet<T = any>(
  path: string,
  init?: RequestInit
): Promise<T> {
  return getJson<T>(path, init);
}
export async function apiPost<T = any>(
  path: string,
  body?: any
): Promise<T> {
  return api(path, {
    method: "POST",
    body: body == null ? undefined : JSON.stringify(body),
    asJson: true,
  });
}
export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  return api(path, {
    method: "PUT",
    body: body == null ? undefined : JSON.stringify(body),
    asJson: true,
  });
}
export async function apiDelete<T = any>(
  path: string,
  body?: any
): Promise<T> {
  return api(path, {
    method: "DELETE",
    body: body == null ? undefined : JSON.stringify(body),
    asJson: true,
  });
}

/* ===== new alias kept for convenience ===== */
export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  return api(path, { asJson: true, ...opts }) as Promise<T>;
}

/* ===== extras used around the app (pricing/setup/inventory) ===== */
function toQuery(q?: AnyObj) {
  if (!q || typeof q !== "object") return "";
  const sp = new URLSearchParams();
  Object.entries(q).forEach(([k,v]) => { if (v!=null) sp.append(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchProdukList<T = any>(query?: AnyObj, overridePath?: string): Promise<T> {
  const candidates = overridePath ? [overridePath] : ["/produk/list","/products/list","/produk","/products"];
  let lastErr: any = null;
  for (const p of candidates) {
    try { return (await api(`${p}${toQuery(query)}`, { method:"GET", asJson:true })) as T; }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("fetchProdukList failed");
}

export async function setupUpsert<T = any>(resource: string, payload: any, method: "POST"|"PUT"="POST"): Promise<T> {
  return method === "PUT" ? apiPut<T>(`/setup/${resource}`, payload) : apiPost<T>(`/setup/${resource}`, payload);
}
export async function setupUpdateById<T = any>(resource: string, id: string, payload: any): Promise<T> {
  return apiPut<T>(`/setup/${resource}/${id}`, payload);
}
export async function getHpp<T = any>(q?: AnyObj): Promise<T> {
  return apiGet<T>(`/report/hpp${toQuery(q)}`);
}
export async function inventorySummary<T = any>(q?: AnyObj): Promise<T> {
  return apiGet<T>(`/inventory/summary${toQuery(q)}`);
}
export async function bahanLogs<T = any>(id: string): Promise<T> {
  return apiGet<T>(`/bahan/${id}/logs`);
}

/* ===== common aliases some files may expect ===== */
export { fetchProdukList as fetchProductList, fetchProdukList as getProdukList, fetchProdukList as getProductList };
export { getJson as fetchJson, apiPost as postJson, apiPut as putJson, apiDelete as deleteJson };
export { getHpp as fetchHpp };

/* ===== default export for default import style ===== */
const _default = {
  buildHeaders, api,
  getJson, apiGet, apiPost, apiPut, apiDelete, apiFetch,
  fetchProdukList, fetchProductList: fetchProdukList, getProdukList: fetchProdukList, getProductList: fetchProdukList,
  setupUpsert, setupUpdateById,
  getHpp, fetchHpp: getHpp,
  inventorySummary, bahanLogs,
  fetchJson: getJson, postJson: apiPost, putJson: apiPut, deleteJson: apiDelete,
};
export default _default;
