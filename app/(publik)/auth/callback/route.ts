"use server";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const from = requestUrl.searchParams.get("from");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Kalau berasal dari halaman register
  if (from === "register") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/login?new=1`);
  }

  // Default: redirect ke dashboard
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
}
