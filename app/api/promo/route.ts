// app/api/promo/route.ts
import { NextRequest, NextResponse } from "next/server";
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";

export async function GET(req: NextRequest) {
  const r = await fetch(`${API}/promo${new URL(req.url).search}`, {
    headers: { "x-owner-id": req.headers.get("x-owner-id") || "" },
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await fetch(`${API}/promo`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-owner-id": req.headers.get("x-owner-id") || "",
    },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return NextResponse.json(j, { status: r.status });
}
