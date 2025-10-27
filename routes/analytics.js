const express = require("express");
const { supabase } = require("../supabase.js");
const requireOwner = require("../middleware/requireOwner.js");

const router = express.Router();

/**
 * GET /analytics/owner?start=YYYY-MM-DD&end=YYYY-MM-DD&grain=day|week|month&top=10
 * header wajib: x-owner-id
 *
 * FE-ready version (v1.0.6)
 */
router.get("/owner", requireOwner, async (req, res) => {
  try {
    const owner_id = req.owner_id;
    const { start, end, grain = "day", top = 10 } = req.query;

    // === 1. ambil data pricing (hpp & harga rekomendasi)
    const { data: pricingData, error: pricingError } = await supabase
      .from("v_pricing_final")
      .select("produk_id, nama_produk, hpp, harga_rekomendasi")
      .eq("owner_id", owner_id);

    if (pricingError) throw pricingError;

    if (!pricingData || pricingData.length === 0) {
      return res.json({
        ok: true,
        data: {
          total_hpp: 0,
          avg_margin_pct: 0,
          total_produk: 0,
          total_transaksi: 0,
          trend: [],
          top_produk: [],
        },
      });
    }

    // === 2. hitung margin dan agregat
    let total_hpp = 0;
    let total_margin_pct = 0;
    const produkProcessed = [];

    for (const row of pricingData) {
      const hpp = Number(row.hpp || 0);
      const harga = Number(row.harga_rekomendasi || 0);
      const margin_nominal = harga > 0 ? harga - hpp : 0;
      const margin_pct = harga > 0 ? margin_nominal / harga : 0;

      produkProcessed.push({
        produk: row.nama_produk,
        hpp,
        harga_jual: harga,
        margin_nominal,
        margin_pct,
      });

      total_hpp += hpp;
      total_margin_pct += margin_pct;
    }

    const total_produk = produkProcessed.length;
    const avg_margin_pct =
      total_produk > 0 ? total_margin_pct / total_produk : 0;

    // === 3. ambil top produk
    const top_produk = produkProcessed
      .sort((a, b) => b.margin_pct - a.margin_pct)
      .slice(0, Number(top) || 10);

    // === 4. ambil trend dari hpp_logs_new
    let trend = [];
    if (start && end) {
      // grain = day|week|month
      let dateExpr = "DATE(created_at)";
      if (grain === "week") dateExpr = "TO_CHAR(created_at, 'IYYY-IW')";
      if (grain === "month") dateExpr = "TO_CHAR(created_at, 'YYYY-MM')";

      const { data: trendData, error: trendError } = await supabase
        .from("hpp_logs_new")
        .select(`created_at, total_hpp`)
        .eq("owner_id", owner_id)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true });

      if (trendError) throw trendError;

      // group manual by dateExpr
      const grouped = {};
      for (const row of trendData) {
        const dateKey =
          grain === "day"
            ? row.created_at.split("T")[0]
            : grain === "week"
            ? new Date(row.created_at).toISOString().slice(0, 10)
            : new Date(row.created_at).toISOString().slice(0, 7);

        grouped[dateKey] = (grouped[dateKey] || 0) + Number(row.total_hpp || 0);
      }

      trend = Object.entries(grouped).map(([label, value]) => ({
        label,
        value,
      }));
    }

    // === 5. total_transaksi (dummy 0, belum ada tabel sales)
    const total_transaksi = 0;

    return res.json({
      ok: true,
      data: {
        total_hpp,
        avg_margin_pct,
        total_produk,
        total_transaksi,
        trend,
        top_produk,
      },
    });
  } catch (err) {
    console.error("ERR /analytics/owner:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "internal_error",
    });
  }
});

module.exports = router;
