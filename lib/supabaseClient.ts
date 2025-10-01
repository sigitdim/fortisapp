import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  console.error("Supabase ENV missing", { urlPresent: !!url, anonPresent: !!anon });
  throw new Error("Missing Supabase credentials. Isi .env.local lalu restart dev server.");
}

export const supabase = createClient(url, anon);
console.log("ENV URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("ENV KEY prefix =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,10));
