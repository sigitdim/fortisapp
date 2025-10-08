import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const body = await req.text();

  const upstream = await fetch(`${api}/bahan/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}
