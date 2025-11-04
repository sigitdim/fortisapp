import { NextResponse } from "next/server";

// NO-OP: selalu biarkan request lewat
export function middleware() {
  return NextResponse.next();
}

// Tidak ada route yang di-match (benar-benar off)
export const config = { matcher: [] };
