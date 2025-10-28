import { API_URL, OWNER_ID } from "./env";


export async function apiGet<T>(path: string): Promise<T> {
const r = await fetch(`${API_URL}${path}`, {
headers: {
"Content-Type": "application/json",
"x-owner-id": OWNER_ID,
},
cache: "no-store",
});
if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`);
return r.json();
}


export async function apiPost<T>(path: string, body: unknown): Promise<T> {
const r = await fetch(`${API_URL}${path}`, {
method: "POST",
headers: {
"Content-Type": "application/json",
"x-owner-id": OWNER_ID,
},
body: JSON.stringify(body),
});
if (!r.ok) {
const text = await r.text().catch(() => "");
throw new Error(`POST ${path} failed: ${r.status} ${text}`);
}
return r.json();
}
