"use server";

import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const from = requestUrl.searchParams.get("from");

  const origin = requestUrl.origin; // contoh: https://app.fortislab.id

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (from === "register") {
    return NextResponse.redirect(`${origin}/login?new=1`);
  }

  return NextResponse.redirect("https://app.fortislab.id/dashboard");
}
