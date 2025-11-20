"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type Product = {
  id: string;
  name: string;
  hpp: number;         // hpp_per_porsi (bahan + overhead)
  overhead: number;    // overhead_per_porsi
  hargaJual: number;   // harga_jual
  profitPercent?: number; // profit_persen (opsional)
};

export const fallbackProducts: Product[] = [
  {
    id: "fallback-1",
    name: "Contoh Menu",
    hpp: 10000,
    overhead: 3000,
    hargaJual: 20000,
    profitPercent: 50,
  },
];

function toNumberLike(value: any): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const str = String(value);
  const digits = str.replace(/[^0-9\-]/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10);
}

function mapRawToProducts(raw: any[]): Product[] {
  return raw
    .map((item, idx) => {
      // id & nama menu
      const id =
        item.id ??
        item.menu_id ??
        item.produk_id ??
        item.product_id ??
        item.kode;

      const name =
        item.nama ??
        item.nama_menu ??
        item.nama_produk ??
        item.name ??
        item.product_name ??
        item.menu_name;

      if (!id || !name) return null;

      // Sesuai kontrak BE baru:
      // - hpp_per_porsi
      // - overhead_per_porsi
      // - harga_jual
      // - profit_persen
      const hpp =
        item.hpp_per_porsi ??
        item.hpp_final_per_porsi ??
        item.total_hpp_per_porsi ??
        item.hpp ??
        0;

      const overhead =
        item.overhead_per_porsi ??
        item.overhead_porsi ??
        item.overhead ??
        0;

      const hargaJual =
        item.harga_jual ??
        item.harga_jual_user ??
        item.harga ??
        item.price ??
        0;

      const profitPercent =
        item.profit_persen ??
        item.profit_percent ??
        item.margin_persen ??
        undefined;

      const product: Product = {
        id: String(id),
        name: String(name),
        hpp: toNumberLike(hpp),
        overhead: toNumberLike(overhead),
        hargaJual: toNumberLike(hargaJual),
        profitPercent:
          profitPercent !== undefined ? toNumberLike(profitPercent) : undefined,
      };

      if (idx === 0) {
        console.log("[promo] sample /hpp item (raw):", item);
        console.log("[promo] sample /hpp item (mapped):", product);
      }

      return product;
    })
    .filter(Boolean) as Product[];
}

async function tryLoadFromHpp(): Promise<Product[] | null> {
  const res: any = await apiGet("/hpp");

  const candidates = [
    res,
    res?.data,
    res?.items,
    res?.menus,
    res?.result,
    res?.rows,
  ];

  const raw = candidates.find((v) => Array.isArray(v)) as any[] | undefined;
  if (!raw || raw.length === 0) return null;

  const mapped = mapRawToProducts(raw);
  return mapped.length ? mapped : null;
}

async function tryLoadFromMenuAsFallback(): Promise<Product[] | null> {
  // fallback: pakai /menu kalau /hpp belum ready
  const res: any = await apiGet("/menu");

  const candidates = [
    res,
    res?.data,
    res?.items,
    res?.menus,
    res?.result,
    res?.rows,
  ];

  const raw = candidates.find((v) => Array.isArray(v)) as any[] | undefined;
  if (!raw || raw.length === 0) return null;

  // di /menu biasanya hanya ada HPP bahan; overhead = 0
  return raw
    .map((item) => {
      const id =
        item.id ??
        item.menu_id ??
        item.produk_id ??
        item.product_id ??
        item.kode;

      const name =
        item.nama ??
        item.nama_menu ??
        item.nama_produk ??
        item.name ??
        item.product_name ??
        item.menu_name;

      if (!id || !name) return null;

      const hpp =
        item.total_hpp ??
        item.hpp_per_porsi ??
        item.hpp ??
        0;

      const hargaJual =
        item.harga_jual ??
        item.harga ??
        item.harga_jual_user ??
        0;

      return {
        id: String(id),
        name: String(name),
        hpp: toNumberLike(hpp),
        overhead: 0,
        hargaJual: toNumberLike(hargaJual),
      } as Product;
    })
    .filter(Boolean) as Product[];
}

export function useProdukList() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // 1. PRIORITAS: /hpp (SSOT dari BE)
        try {
          const fromHpp = await tryLoadFromHpp();
          if (fromHpp && !cancelled) {
            console.log("[promo] loaded products from /hpp");
            setProducts(fromHpp);
            return;
          }
        } catch (err) {
          console.error("[promo] gagal load dari /hpp:", err);
        }

        // 2. Fallback: /menu (HPP bahan saja, tanpa overhead)
        try {
          const fromMenu = await tryLoadFromMenuAsFallback();
          if (fromMenu && !cancelled) {
            console.log("[promo] loaded products from /menu (fallback)");
            setProducts(fromMenu);
            return;
          }
        } catch (err) {
          console.error("[promo] gagal load dari /menu (fallback):", err);
        }
      } catch (err) {
        console.error("[promo] useProdukList error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}
