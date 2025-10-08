// app/api/bahan/[...parts]/route.ts
import { NextRequest } from "next/server";

const API = process.env.NEXT_PUBLIC_API_URL; // e.g. https://api.fortislab.id or http://localhost:4000

function notReady(msg: string, status = 500) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pickHeaders(req: NextRequest) {
  const h = new Headers();
  // forward common headers if exist
  const xo = req.headers.get("x-owner-id");
  if (xo) h.set("x-owner-id", xo);
  // allow JSON by default
  h.set("Content-Type", req.headers.get("content-type") || "application/json");
  return h;
}

async function passThrough(r: Response) {
  const text = await r.text(); // preserve as text; content-type we set below
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") || "application/json" },
  });
}

// GET supports:
//  - /api/bahan/logs/:id          →  GET ${API}/bahan/logs/:id
//  - /api/bahan/:id               →  GET ${API}/bahan/:id   (optional)
export async function GET(req: NextRequest, { params }: { params: { parts?: string[] } }) {
  if (!API) return notReady("Missing NEXT_PUBLIC_API_URL in env");
  const parts = params.parts || [];

  let url: string | null = null;
  if (parts[0] === "logs" && parts[1]) {
    url = `${API}/bahan/logs/${encodeURIComponent(parts[1])}`;
  } else if (parts.length === 1) {
    url = `${API}/bahan/${encodeURIComponent(parts[0])}`;
  }
  if (!url) return new Response("Not found", { status: 404 });

  const r = await fetch(url, { method: "GET", headers: pickHeaders(req) });
  return passThrough(r);
}

// PATCH supports:
//  - /api/bahan/:id               →  PATCH ${API}/bahan/:id
export async function PATCH(req: NextRequest, { params }: { params: { parts?: string[] } }) {
  if (!API) return notReady("Missing NEXT_PUBLIC_API_URL in env");
  const parts = params.parts || [];
  if (parts.length !== 1) return new Response("Not found", { status: 404 });

  const body = await req.text();
  const url = `${API}/bahan/${encodeURIComponent(parts[0])}`;
  const r = await fetch(url, { method: "PATCH", headers: pickHeaders(req), body });
  return passThrough(r);
}

// Preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-owner-id",
    },
  });
}
