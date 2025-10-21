import type { NextApiRequest, NextApiResponse } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  try {
    const { id } = req.query;
    const target = `${API}/bahan/logs/${encodeURIComponent(String(id))}${req.url?.includes("?") ? req.url?.slice(req.url.indexOf("?")) : ""}`;
    const r = await fetch(target, { headers: { "x-owner-id": OWNER_ID }, cache: "no-store" });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("content-type", r.headers.get("content-type") ?? "application/json");
    return res.send(text);
  } catch (e: any) {
    return res.status(502).json({ ok: false, proxy_error: String(e) });
  }
}
