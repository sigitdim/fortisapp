"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export type PricingRow = {
  produk_id: string;
  nama_produk: string;
  hpp_total_per_porsi: number | null;
  harga_rekomendasi: number | null;
  harga_jual_user: number | null;
  profit_user_per_porsi: number | null;
  margin_user_persen: number | null;
};

function num(v: any) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function usePricingView() {
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.from("v_pricing_final").select("*");
    if (error) setErr(error.message);

    const normalized = (data ?? []).map((r: any) => ({
      produk_id: r.produk_id ?? r.id,
      nama_produk: r.nama_produk ?? r.produk ?? "",
      hpp_total_per_porsi: num(r.hpp_total_per_porsi ?? r.hpp_total),
      harga_rekomendasi: num(r.harga_rekomendasi),
      harga_jual_user: num(r.harga_jual_user ?? r.harga_jual),
      profit_user_per_porsi: num(r.profit_user_per_porsi ?? r.profit),
      margin_user_persen: num(r.margin_user_persen ?? r.margin),
    })) as PricingRow[];

    setRows(normalized);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  return { rows, loading, err, refetch: fetchData, setRows };
}
