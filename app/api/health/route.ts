import { NextResponse } from "next/server";

export async function GET() {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "https://api.fortislab.id"!;
  const r = await fetch(`${api}/health`, { headers: { "Content-Type": "application/json" } });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" },
  });
}
