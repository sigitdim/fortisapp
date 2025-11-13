import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const { pathname } = req.nextUrl;

  // ✅ Izinkan halaman reset-password & auth callback tanpa login
  if (
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/"
  ) {
    return res;
  }

  // ✅ Jalankan middleware Supabase normal untuk refresh session cookie
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession(); // refresh/set cookie

  return res;
}

// ✅ Tetap pertahankan config matcher lama
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
