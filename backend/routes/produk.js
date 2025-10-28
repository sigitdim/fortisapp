const express = require("express");
const { supabase } = require("../supabase.js");

const router = express.Router();

// ===============================
// GET /produk/:produk_id/komposisi
// ===============================
router.get("/:produk_id/komposisi", async (req, res) => {
  try {
    const { produk_id } = req.params;
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });

    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { data, error } = await supabase
      .from("v_biaya_bahan_per_produk")
      .select("nama_bahan, qty, satuan, total_biaya")
      .eq("owner_id", owner_id)
      .eq("produk_id", produk_id)
      .order("nama_bahan", { ascending: true });

    if (error) throw error;

    const result = data.map((row) => ({
      bahan_id: row.bahan_id,
      bahan_nama: row.nama_bahan,
      qty: row.qty,
      unit: row.satuan,
      subtotal: row.total_biaya,
    }));

// Cache 30 Detik
res.set("Cache-Control", "max-age=30");

    res.json({ ok: true, data: result });
  } catch (e) {
    console.error("Error /produk/:produk_id/komposisi:", e);
    res.json({ ok: false, message: e.message });
  }
});

module.exports = router;
