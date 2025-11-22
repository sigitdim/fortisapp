"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export type Product = {
  id: string;
  name: string;
  hpp: number; // HPP / porsi (bahan) → DISAMAKAN dengan Daftar Menu
  overhead: number; // overhead_per_porsi (kalau ada dari /hpp)
  hargaJual: number; // harga_jual (utamanya dari /menu)
  profitPercent?: number; // profit_persen (opsional, dari /hpp)
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

/* =========================
 *  MAPPER UNTUK /hpp
 * ========================= */

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

      // CATATAN PENTING:
      // Di sini kita TIDAK lagi menganggap hpp_per_porsi sebagai "HPP / porsi (bahan)"
      // karena HPP bahan sudah kita ambil dari /menu.
      // /hpp sekarang hanya dipakai untuk OVERHEAD + PROFIT + fallback harga_jual.

      const overheadRaw =
        item.overhead_per_porsi ??
        item.overhead_porsi ??
        item.overhead ??
        0;

      const hargaJualRaw =
        item.harga_jual ??
        item.harga_jual_user ??
        item.harga ??
        item.price ??
        0;

      const profitPercentRaw =
        item.profit_persen ??
        item.profit_percent ??
        item.margin_persen ??
        undefined;

      const product: Product = {
        id: String(id),
        name: String(name),
        // HPP sengaja 0 di sini, supaya tidak meng-overwrite HPP dari /menu
        hpp: 0,
        overhead: toNumberLike(overheadRaw),
        hargaJual: toNumberLike(hargaJualRaw),
        profitPercent:
          profitPercentRaw !== undefined
            ? toNumberLike(profitPercentRaw)
            : undefined,
      };

      if (idx === 0) {
        console.log("[promo] sample /hpp item (raw):", item);
        console.log("[promo] sample /hpp item (mapped-from-/hpp):", product);
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

/* =========================
 *  MAPPER UNTUK /menu
 *  (Sumber utamanya HPP & harga jual)
 * ========================= */

async function loadFromMenu(): Promise<Product[] | null> {
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

  return raw
    .map((item, idx) => {
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

      // HPP / Porsi (Bahan) — DISAMAKAN dengan Daftar Menu
      const hppRaw =
        item.hpp_bahan_per_porsi ?? // kalau BE nanti pakai nama ini
        item.hpp_bahan ?? // alias lain yang mungkin dipakai
        item.total_hpp ?? // existing
        item.hpp_per_porsi ?? // existing
        item.hpp ??
        0;

      const hargaJualRaw =
        item.harga_jual ??
        item.harga ??
        item.harga_jual_user ??
        0;

      const product: Product = {
        id: String(id),
        name: String(name),
        hpp: toNumberLike(hppRaw),
        // overhead default 0, nanti diisi dari /hpp kalau ada
        overhead: 0,
        hargaJual: toNumberLike(hargaJualRaw),
      };

      if (idx === 0) {
        console.log("[promo] sample /menu item (raw):", item);
        console.log("[promo] sample /menu item (mapped):", product);
      }

      return product;
    })
    .filter(Boolean) as Product[];
}

/* =========================
 *  Fallback lama dari /menu
 *  (dipakai kalau /menu dipanggil sbg fallback saja)
 * ========================= */

async function tryLoadFromMenuAsFallback(): Promise<Product[] | null> {
  try {
    const fromMenu = await loadFromMenu();
    return fromMenu && fromMenu.length ? fromMenu : null;
  } catch (err) {
    console.error("[promo] gagal loadFromMenu (fallback):", err);
    return null;
  }
}

/* =========================
 *  HOOK UTAMA
 * ========================= */

export function useProdukList() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        /* 1. UTAMA: ambil data base dari /menu
         *    → ini yang dipakai Daftar Menu, jadi HPP & Harga Jual akan SAMA.
         */
        let baseFromMenu: Product[] | null = null;
        try {
          baseFromMenu = await loadFromMenu();
        } catch (err) {
          console.error("[promo] gagal load dari /menu (utama):", err);
        }

        // Kalau /menu berhasil, kita pakai itu sebagai base, lalu enrich dari /hpp
        if (baseFromMenu && baseFromMenu.length > 0) {
          let enriched = baseFromMenu;

          try {
            const fromHpp = await tryLoadFromHpp();
            if (fromHpp && fromHpp.length > 0) {
              console.log("[promo] enrich dengan data dari /hpp");

              const mapHpp = new Map<string, Product>();
              fromHpp.forEach((p) => {
                mapHpp.set(p.id, p);
              });

              enriched = baseFromMenu.map((m) => {
                const extra = mapHpp.get(m.id);
                if (!extra) return m;

                return {
                  ...m,
                  // overhead & profitPercent ambil dari /hpp kalau ada
                  overhead:
                    extra.overhead != null ? extra.overhead : m.overhead,
                  profitPercent:
                    extra.profitPercent != null
                      ? extra.profitPercent
                      : m.profitPercent,
                  // hargaJual dari /hpp hanya dipakai kalau di /menu masih 0
                  hargaJual:
                    m.hargaJual && m.hargaJual > 0
                      ? m.hargaJual
                      : extra.hargaJual || m.hargaJual,
                };
              });
            }
          } catch (err) {
            console.error("[promo] gagal enrich dari /hpp:", err);
          }

          if (!cancelled) {
            setProducts(enriched);
          }
          return;
        }

        /* 2. Kalau /menu gagal total (misal endpoint belum siap),
         *    baru kita balik ke behaviour lama:
         *    prioritas /hpp → fallback /menu.
         */

        // 2a. PRIORITAS: /hpp
        try {
          const fromHpp = await tryLoadFromHpp();
          if (fromHpp && !cancelled) {
            console.log("[promo] loaded products from /hpp (tanpa /menu)");
            setProducts(fromHpp);
            return;
          }
        } catch (err) {
          console.error("[promo] gagal load dari /hpp (tanpa /menu):", err);
        }

        // 2b. Fallback terakhir: /menu (versi lama)
        try {
          const fromMenuFallback = await tryLoadFromMenuAsFallback();
          if (fromMenuFallback && !cancelled) {
            console.log("[promo] loaded products from /menu (fallback akhir)");
            setProducts(fromMenuFallback);
            return;
          }
        } catch (err) {
          console.error("[promo] gagal load dari /menu (fallback akhir):", err);
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

