"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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

/* ========= utils umum ========= */

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

      // Di sini HPP kita set 0 supaya TIDAK menimpa HPP dari /menu
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

async function tryLoadFromHpp(ownerId: string | null): Promise<Product[] | null> {
  const headers: any = {};
  if (ownerId) headers["x-owner-id"] = ownerId;

  const res: any = await apiGet("/hpp", { headers });

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
 *  (Sumber utama HPP & harga jual)
 * ========================= */

async function loadFromMenu(ownerId: string | null): Promise<Product[] | null> {
  const headers: any = {};
  if (ownerId) headers["x-owner-id"] = ownerId;

  const res: any = await apiGet("/menu", { headers });

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
        item.hpp_bahan_per_porsi ?? // nama baru (kalau BE pakai ini)
        item.hpp_bahan ?? // alias
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
        overhead: 0, // nanti di-enrich dari /hpp
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
 *  Fallback lama /menu
 * ========================= */

async function tryLoadFromMenuAsFallback(): Promise<Product[] | null> {
  try {
    const fromMenu = await loadFromMenu(null);
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
  const supabase = createClientComponentClient();
  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        // 🔐 Ambil owner_id dari Supabase Auth
        const { data } = await supabase.auth.getUser();
        const ownerId =
          (data?.user?.user_metadata as any)?.owner_id ?? null;

        console.log("[promo] ownerId from supabase:", ownerId);

        /* 1. UTAMA: /menu (punya owner ini) */
        let baseFromMenu: Product[] | null = null;
        try {
          baseFromMenu = await loadFromMenu(ownerId);
        } catch (err) {
          console.error("[promo] gagal load dari /menu (utama):", err);
        }

        if (baseFromMenu && baseFromMenu.length > 0) {
          let enriched = baseFromMenu;

          // Enrich overhead & profit dari /hpp (owner sama)
          try {
            const fromHpp = await tryLoadFromHpp(ownerId);
            if (fromHpp && fromHpp.length > 0) {
              console.log("[promo] enrich dengan data dari /hpp (owner match)");

              const mapHpp = new Map<string, Product>();
              fromHpp.forEach((p) => {
                mapHpp.set(p.id, p);
              });

              enriched = baseFromMenu.map((m) => {
                const extra = mapHpp.get(m.id);
                if (!extra) return m;

                return {
                  ...m,
                  overhead:
                    extra.overhead != null ? extra.overhead : m.overhead,
                  profitPercent:
                    extra.profitPercent != null
                      ? extra.profitPercent
                      : m.profitPercent,
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

        /* 2. Kalau /menu gagal: pakai behaviour lama
           prioritas /hpp → fallback /menu tanpa owner (dev mode) */

        try {
          const fromHpp = await tryLoadFromHpp(ownerId);
          if (fromHpp && !cancelled) {
            console.log("[promo] loaded products from /hpp (tanpa /menu)");
            setProducts(fromHpp);
            return;
          }
        } catch (err) {
          console.error("[promo] gagal load dari /hpp (tanpa /menu):", err);
        }

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
  }, [supabase]);

  return { products, loading };
}
