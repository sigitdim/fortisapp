import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id").replace(/\/+$/, "");

function buildUrl(parts: string[] | undefined, req: Request) {
  const url = new URL(req.url);
  const path = (parts && parts.length ? parts.join("/") : "").replace(/^\/+/, "");
  return `${API_BASE}/${path}${url.search || ""}`;
}

function fwdHeaders(req: Request) {
  const h = new Headers();
  for (const k of ["content-type", "authorization", "x-owner-id"]) {
    const v = req.headers.get(k);
    if (v) h.set(k, v);
  }
  return h;
}

async function proxy(method: string, req: Request, ctx: any) {
  const parts: string[] | undefined = ctx?.params?.parts;
  const url = buildUrl(parts, req);
  const init: RequestInit = { method, headers: fwdHeaders(req), cache: "no-store" };
  if (method !== "GET" && method !== "HEAD") init.body = await req.text();

  const upstream = await fetch(url, init);
  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json";
  return new NextResponse(text, { status: upstream.status, headers: { "content-type": ct } });
}

export async function GET(req: Request, ctx: any)    { return proxy("GET", req, ctx); }
export async function POST(req: Request, ctx: any)   { return proxy("POST", req, ctx); }
export async function PUT(req: Request, ctx: any)    { return proxy("PUT", req, ctx); }
export async function PATCH(req: Request, ctx: any)  { return proxy("PATCH", req, ctx); }
export async function DELETE(req: Request, ctx: any) { return proxy("DELETE", req, ctx); }
export async function OPTIONS(req: Request, ctx: any){ return proxy("OPTIONS", req, ctx); }
