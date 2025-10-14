import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const api = process.env.NEXT_PUBLIC_API_URL ?? "https://api.fortislab.id"!;
  const body = await req.text();

export async function GET(_req: NextRequest, { params }: { params: { parts: string[] } }) {
  const [id, tail] = params.parts;
  if (tail !== "logs") return NextResponse.json({ ok: false, error: "Unsupported GET" }, { status: 404 });

  const res = await fetch(`${API}/bahan/logs/${id}`, { cache: "no-store" });
  const j = await res.json();
  return NextResponse.json(j, { status: res.status });
}

export async function PATCH(req: NextRequest, { params }: { params: { parts: string[] } }) {
  const [id] = params.parts;

  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${API}/bahan/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  return NextResponse.json(j, { status: res.status });
}
