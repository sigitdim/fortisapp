const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Konfigurasi default ---
const LOW_STOCK_THRESHOLD_DEFAULT = 10;
const RECENT_DAYS = 7;
const LIMIT_MARGIN = 5;
const LIMIT_LOW_STOCK = 10;
const LIMIT_RECENT = 20;

// --- Helper ambil owner_id dari header ---
function getOwnerId(req) {
  const ownerId = req.header("x-owner-id");
  return ownerId && ownerId.trim() !== "" ? ownerId : null;
}

// --- ROUTE: /dashboard/overview ---
router.get("/overview", async (req, res) => {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) {
      return res.status(400).json({ ok: false, error: "x-owner-id header wajib" });
    }

    const lowStockThr = Number(req.query.low_stock) || LOW_STOCK_THRESHOLD_DEFAULT;
    const sinceIso = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // =======================================================
    // 1️⃣ DATA MARGIN PRODUK (v_pricing_final)
    // =======================================================
    const selectPricing = `
       nama_produk,
       hpp,
       harga_rekomendasi,
       owner_id
     `;

    const { data: marginAll, error: errMargin } = await supabase
      .from("v_pricing_final")
      .select(selectPricing)
      .eq("owner_id", ownerId);

    if (errMargin) throw errMargin;

    // hitung margin manual (karena view gak punya margin_pct)
    const withMargin = (marginAll || []).map((p) => {
  const harga = Number(p.harga_rekomendasi) || 0;
  const hpp = Number(p.hpp) || 0;
  const marginPct = harga > 0 ? ((harga - hpp) / harga) * 100 : 0;
  return {
    nama_produk: p.nama_produk,
    hpp,
    harga_jual: harga,
    margin_pct: Number(marginPct.toFixed(1))
  };
});

    const marginTop = [...withMargin].sort((a, b) => b.margin_pct - a.margin_pct).slice(0, LIMIT_MARGIN);
    const marginBottom = [...withMargin].sort((a, b) => a.margin_pct - b.margin_pct).slice(0, LIMIT_MARGIN);

    // =======================================================
    // 2️⃣ DATA STOK RENDAH (v_stok_summary)
    // =======================================================
    const { data: lowStock, error: errLow } = await supabase
      .from("v_stok_summary")
      .select("nama_bahan, stok_total, satuan, owner_id")
      .eq("owner_id", ownerId)
      .lte("stok_total", lowStockThr)
      .order("stok_total", { ascending: true })
      .limit(LIMIT_LOW_STOCK);

    // =======================================================
    // 3️⃣ MUTASI STOK TERAKHIR (stok_logs)
    // =======================================================
    const baseSelectLogs = `
      id, bahan_id, qty, type, catatan, created_at, owner_id,
      bahan:bahan_id ( nama_bahan )
    `;

    const { data: recentLogs, error: errLogs } = await supabase
      .from("stok_logs")
      .select(baseSelectLogs)
      .eq("owner_id", ownerId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(LIMIT_RECENT * 2); // ambil 2x limit biar bisa filter in/out
    if (errLogs) throw errLogs;

      const recentIn = recentLogs.filter((r) => r.type === "IN").slice(0, LIMIT_RECENT);
      const recentOut = recentLogs.filter((r) => r.type === "OUT").slice(0, LIMIT_RECENT);

    // =======================================================
    // 4️⃣ REKOMENDASI PROMO (rule-based)
    // =======================================================
    const promoRecommendations = [];

    for (const p of withMargin) {
      const margin = p.margin_pct;
      let rekomendasi = "";
      let alasan = "";

      if (margin >= 60) {
        rekomendasi = "Diskon 20–30%";
        alasan = "Margin tinggi, aman dipotong harga untuk menarik volume penjualan.";
      } else if (margin >= 35 && margin < 60) {
        rekomendasi = "Bundling dengan produk pelengkap (snack / kue)";
        alasan = "Margin sedang, bundling efektif menaikkan nilai transaksi.";
      } else if (margin >= 20 && margin < 35) {
        rekomendasi = "Buy 1 Get 1 kecil / Bonus topping";
        alasan = "Margin terbatas, cocok untuk promo mini.";
      } else {
        rekomendasi = "Tebus murah (add-on di kasir)";
        alasan = "Margin rendah, cocok jadi pemancing agar stok berputar.";
      }

      promoRecommendations.push({
        nama_produk: p.nama_produk,
        margin_pct: p.margin_pct,
        rekomendasi,
        alasan
      });
    }

    // =======================================================
    // 5️⃣ BENTUK RESPONSE
    // =======================================================
    const shapeRecent = (rows) =>
      (rows || []).map((r) => ({
        bahan_nama: r.bahan?.nama_bahan || null,
        qty: r.qty,
        type: r.type,
        catatan: r.catatan,
        created_at: r.created_at
      }));

    const payload = {
      margin_top: marginTop,
      margin_bottom: marginBottom,
      low_stock: lowStock || [],
      recent_stock_in: shapeRecent(recentIn),
      recent_stock_out: shapeRecent(recentOut),
      promo_recommendations: promoRecommendations,
      meta: {
        low_stock_threshold: lowStockThr,
        recent_days: RECENT_DAYS,
        generated_at: new Date().toISOString()
      }
    };

    return res.json({ ok: true, data: payload });
  } catch (e) {
    console.error("GET /dashboard/overview error:", e);
    return res.status(500).json({
      ok: false,
      error: e.message || "internal_error"
    });
  }
});

module.exports = router;

