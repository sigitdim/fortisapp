"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * Komponen ringan:
 * - kalau URL TIDAK punya ?produk_id=... → ambil 1 produk pertama dan redirect
 * - kalau sudah ada, tidak ngapa-ngapain
 */
export default function AutoSelectProduk() {
  const router = useRouter();
  const sp = useSearchParams();
  const produkId = sp.get("produk_id") || "";

  useEffect(() => {
    if (produkId) return;

    (async () => {
      // Ambil 1 produk paling awal (global). 
      // Kalau mau filter per owner, tambahkan .match({ owner_id: <OWNER_ID> })
      const { data: first, error } = await supabase
        .from("produk")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("AutoSelectProduk error:", error.message);
        return;
      }
      if (first?.id) {
        router.replace(`/pricing?produk_id=${encodeURIComponent(first.id)}`);
      }
    })();
  }, [produkId, router]);

  return null;
}
