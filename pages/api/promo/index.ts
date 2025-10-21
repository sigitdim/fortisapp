import type { NextApiRequest, NextApiResponse } from "next";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID || "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Method Not Allowed" });
  try {
    const r = await fetch(`${API}/promo`, {
      method: "POST",
      headers: { "content-type":"application/json", "x-owner-id": OWNER_ID },
      body: JSON.stringify(req.body ?? {})
    });
    const text = await r.text();
    res.status(r.status);
    res.setHeader("content-type", r.headers.get("content-type") ?? "application/json");
    return res.send(text);
  } catch (e:any) {
    return res.status(502).json({ ok:false, proxy_error:String(e) });
  }
}
