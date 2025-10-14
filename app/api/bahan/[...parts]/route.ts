// app/api/bahan/[...parts]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: { parts: string[] } }) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "https://api.fortislab.id";
  const [id, tail] = params.parts ?? [];

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  // /api/bahan/:id/logs  -> proxy ke BE
  if (tail === "logs") {
    const r = await fetch(`${api}/bahan/logs/${id}`, { cache: "no-store" });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status });
  }

  return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: { parts: string[] } }) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? "https://api.fortislab.id";
  const [id] = params.parts ?? [];
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const bodyText = await req.text();
  const r = await fetch(`${api}/bahan/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: bodyText,
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
