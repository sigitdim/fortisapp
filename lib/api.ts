export const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    // credentials/headers bisa ditambah di sini kalau perlu
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    // mode: 'cors' // default sudah cors di browser
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}
