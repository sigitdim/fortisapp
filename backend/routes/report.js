const express = require("express");
const { supabase } = require("../supabase.js");
const requireOwner = require("../middleware/requireOwner.js");

const router = express.Router();

// ===============================
// GET /report/hpp
// ===============================
router.get("/hpp", requireOwner, async (req, res) => {
  try {
    const owner_id = req.owner_id;
    const { limit = 50, cursor, since, until } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 500);

    // parse cursor buat pagination
    let cursorProdukId = null;
    if (cursor) cursorProdukId = String(cursor);

    // === filter waktu ===
    let startDate = null;
    let endDate = null;

    if (since) {
      const match = String(since).match(/^(\d+)(d|w|m)$/i);
      if (match) {
        const amount = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const now = new Date();
        startDate = new Date(now);

        if (unit === "d") startDate.setDate(now.getDate() - amount);
        if (unit === "w") startDate.setDate(now.getDate() - amount * 7);
        if (unit === "m") startDate.setMonth(now.getMonth() - amount);
      } else {
        startDate = new Date(since);
      }
    }

    if (until) {
      endDate = new Date(until);
    }

    // === ambil data HPP dasar per produk ===
    let hppQuery = supabase
      .from("v_hpp_final_new")
      .select("owner_id, produk_id, nama_produk, total_biaya_bahan, jumlah_bahan, updated_at")
      .eq("owner_id", owner_id)
      .order("updated_at", { ascending: false })
      .limit(safeLimit);

    // filter tanggal
    if (startDate) hppQuery = hppQuery.gte("updated_at", startDate.toISOString());
    if (endDate) hppQuery = hppQuery.lte("updated_at", endDate.toISOString());

    // pagination
    if (cursorProdukId) {
      hppQuery = hppQuery.gt("produk_id", cursorProdukId);
    }

    const { data: hppRows, error: hppError } = await hppQuery;
    if (hppError) throw hppError;

    // === ambil data pricing / margin ===
    const { data: pricingRows, error: pricingError } = await supabase
      .from("v_pricing_final")
      .select("*")
      .eq("owner_id", owner_id);

    if (pricingError) throw pricingError;

    // bikin index pricing by produk_id
    const pricingByProduk = {};
    for (const p of pricingRows || []) pricingByProduk[p.produk_id] = p;

    // gabung hasilnya
    const merged = (hppRows || []).map((row) => {
      const extra = pricingByProduk[row.produk_id] || {};
      return {
        owner_id: row.owner_id,
        produk_id: row.produk_id,
        nama_produk: row.nama_produk,
        total_biaya_bahan: Number(row.total_biaya_bahan || 0),
        jumlah_bahan: Number(row.jumlah_bahan || 0),
        hpp_per_porsi: extra.hpp || extra.hpp_per_porsi || null,
        harga_jual: extra.harga_jual || extra.harga_rekomendasi || null,
        margin_nominal: extra.margin_nominal || null,
        margin_pct: extra.margin_pct || null,
        updated_at: row.updated_at,
      };
    });

    // === auto log ke hpp_logs_new ===
    try {
      const logsPayload = (hppRows || []).map((row) => ({
        produk_id: row.produk_id,
        owner_id,
        new_hpp: Number(row.total_biaya_bahan || 0),
        total_hpp: Number(row.total_biaya_bahan || 0),
        cause: "report_hpp_recalc",
        changed_by: "system",
      }));

      if (logsPayload.length > 0) {
        const { error: logErr } = await supabase
          .from("hpp_logs_new")
          .insert(logsPayload);
        if (logErr) console.error("hpp_logs_new insert error:", logErr.message);
      }
    } catch (e) {
      console.error("hpp_logs_new insert failed:", e.message);
    }

    // pagination next cursor
    let next_cursor = null;
    if (hppRows && hppRows.length > 0) {
      const last = hppRows[hppRows.length - 1];
      next_cursor = last.produk_id;
    }

    // Cache 60 Detik
    res.set("Cache-Control", "max-age=60");

    return res.json({
      ok: true,
      data: merged,
      next_cursor,
      filter_used: { since: since || null, until: until || null },
    });
  } catch (err) {
    console.error("GET /report/hpp error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// GET /report/export
// ===============================
router.get("/export", requireOwner, async (req, res) => {
  try {
    const owner_id = req.owner_id;
    const { format = "json", limit = 500 } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 500, 1000);

    // ambil data dari v_pricing_final (karena udah gabung harga & hpp)
    const { data, error } = await supabase
      .from("v_pricing_final")
      .select("produk_id, nama_produk, hpp, harga_rekomendasi, owner_id")
      .eq("owner_id", owner_id)
      .limit(safeLimit);

    if (error) throw error;

    const processed = (data || []).map((r) => {
      const hpp = Number(r.hpp || 0);
      const harga = Number(r.harga_rekomendasi || 0);
      const margin_nominal = harga - hpp;
      const margin_pct = harga > 0 ? margin_nominal / harga : 0;

      return {
        produk_id: r.produk_id,
        nama_produk: r.nama_produk,
        hpp,
        harga_jual: harga,
        margin_nominal,
        margin_pct,
      };
    });

    // === kalau format CSV
    if (format === "csv") {
      const header = Object.keys(processed[0] || {}).join(",");
      const rows = processed.map((r) => Object.values(r).join(",")).join("\n");
      const csv = `${header}\n${rows}`;

      // auto log ke hpp_logs_new
      await supabase.from("hpp_logs_new").insert({
        owner_id,
        cause: "export_report",
        changed_by: "system",
        created_at: new Date().toISOString(),
        total_hpp: processed.reduce((sum, r) => sum + r.hpp, 0),
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="report_hpp_export.csv"'
      );
      return res.send(csv);
    }

    // === default JSON
    return res.json({
      ok: true,
      data: processed,
      total: processed.length,
    });
  } catch (err) {
    console.error("GET /report/export error:", err);
    return res.status(500).json({
      ok: false,
      message: err.message || "internal_error",
    });
  }
});


module.exports = router;


