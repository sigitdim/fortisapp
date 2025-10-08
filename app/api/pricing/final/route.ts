// app/api/pricing/final/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const BE_BASE = "https://api.fortislab.id"; // backend production

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const produk_id = url.searchParams.get("produk_id");
    if (!produk_id) {
      return NextResponse.json({ error: "produk_id wajib diisi" }, { status: 400 });
    }

    // Ambil session Supabase dari cookies (user login)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
        },
      }
    );

    const { data, error: authErr } = await supabase.auth.getUser();
    if (authErr)
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    const ownerId = data.user?.id;
    if (!ownerId)
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // Lanjut call ke backend
    const r = await fetch(`${BE_BASE}/pricing/final?produk_id=${produk_id}`, {
      headers: { "x-owner-id": ownerId },
      cache: "no-store",
    });

    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") || "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Proxy error" },
      { status: 500 }
    );
  }
}
