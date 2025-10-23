const express = require("express");
const { supabase } = require("../supabase");
const requireOwner = require("../middleware/requireOwner");

const router = express.Router();

// === GET semua komposisi per produk ===
router.get("/:produk_id", requireOwner, async (req, res) => {
  try {
    const { produk_id } = req.params;
    const { owner_id } = req;

    const { data, error } = await supabase
      .from("komposisi")
      .select(`
        id,
        produk_id,
        bahan_id,
        qty,
        bahan:bahan_id (nama_bahan, satuan)
      `)
      .eq("produk_id", produk_id)
      .eq("owner_id", owner_id);

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// === POST tambah bahan ke resep ===
router.post("/", requireOwner, async (req, res) => {
  try {
    const { produk_id, bahan_id, qty, unit } = req.body;
    const owner_id = req.owner_id;

    if (!produk_id || !bahan_id || qty == null || qty < 0) {
      return res.status(400).json({ ok: false, error: "invalid input" });
    }

    // 🔎 Cek duplikat komposisi
    const { data: exist } = await supabase
      .from("komposisi")
      .select("id")
      .eq("produk_id", produk_id)
      .eq("bahan_id", bahan_id)
      .eq("owner_id", owner_id)
      .maybeSingle();

    if (exist) {
      return res.status(409).json({ ok: false, error: "komposisi sudah ada" });
    }

    // ambil unit dari tabel bahan kalau kosong
    let finalUnit = unit;
    if (!finalUnit) {
      const { data: b, error: eBahan } = await supabase
        .from("bahan")
        .select("satuan")
        .eq("id", bahan_id)
        .eq("owner_id", owner_id)
        .single();

      if (eBahan || !b) {
        return res.status(400).json({ ok: false, error: "bahan tidak ditemukan" });
      }
      finalUnit = b.satuan || "unit";
    }

    // insert data baru
    const { error } = await supabase.from("komposisi").insert({
      produk_id,
      bahan_id,
      qty,
      unit: finalUnit,
      owner_id,
    });

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// === PUT update qty ===
router.put("/:id", requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { qty } = req.body;
    const { owner_id } = req;

    const { error } = await supabase
      .from("komposisi")
      .update({ qty })
      .eq("id", id)
      .eq("owner_id", owner_id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// === DELETE bahan dari resep ===
router.delete("/:id", requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { owner_id } = req;

    const { error } = await supabase
      .from("komposisi")
      .delete()
      .eq("id", id)
      .eq("owner_id", owner_id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
