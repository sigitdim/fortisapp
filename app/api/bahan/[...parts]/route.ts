import { NextRequest, NextResponse } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL!;
const ownerId = () =>
  process.env.NEXT_PUBLIC_OWNER_ID || "00000000-0000-0000-0000-000000000000";

async function forward(req: NextRequest, path: string) {
  // penting: prefix /bahan supaya cocok dengan route BE
  const url = `${API}/bahan${path}`;
  const method = req.method;
  const headers: HeadersInit = {
    "content-type": "application/json",
    "x-owner-id": ownerId(),
  };
  const body =
    ["POST", "PUT", "PATCH"].includes(method) ? await req.text() : undefined;

  const res = await fetch(url, { method, headers, body, cache: "no-store" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { parts: string[] } }) {
  const path = "/" + params.parts.join("/");
  return forward(req, path);
}
export async function PATCH(req: NextRequest, { params }: { params: { parts: string[] } }) {
  const path = "/" + params.parts.join("/");
  return forward(req, path);
}
export const dynamic = "force-dynamic";
