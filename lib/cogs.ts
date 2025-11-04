import { apiGet, apiPost } from "./api";

export async function fetchCogs<T = unknown>(q?: Record<string, any>): Promise<T> {
  const usp = new URLSearchParams();
  Object.entries(q || {}).forEach(([k, v]) => (v == null ? null : usp.append(k, String(v))));
  const qs = usp.toString() ? `?${usp.toString()}` : "";
  return apiGet<T>(`/report/hpp${qs}`);
}

export async function saveBom<T = unknown>(payload: any): Promise<T> {
  return apiPost<T>("/setup/bom", payload);
}

const _default = { fetchCogs, saveBom };
export default _default;
