const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================
// POST /inventory/in (FINAL)
// ===============================
router.post("/in", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id) return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { bahan_id, qty, catatan } = req.body || {};
    if (!bahan_id || qty === undefined) {
      return res.status(400).json({ ok: false, message: "bahan_id dan qty wajib diisi" });
    }
    if (Number(qty) <= 0) {
      return res.status(400).json({ ok: false, message: "qty harus > 0" });
    }

    // validasi bahan milik owner
    const { data: bahan, error: eBahan } = await supabase
      .from("bahan")
      .select("id, owner_id")
      .eq("id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (eBahan) return res.status(400).json({ ok: false, message: "bahan_id tidak valid untuk owner ini" });

    const { data, error } = await supabase
      .from("stok_logs")
      .insert([{ owner_id, bahan_id, qty: Number(qty), type: "IN", catatan: catatan || null }])
      .select("id, type, bahan_id, qty")
      .single();

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// POST /inventory/out (FINAL)
// ===============================
router.post("/out", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id) return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { bahan_id, qty, catatan } = req.body || {};
    if (!bahan_id || qty === undefined) {
      return res.status(400).json({ ok: false, message: "bahan_id dan qty wajib diisi" });
    }
    if (Number(qty) <= 0) {
      return res.status(400).json({ ok: false, message: "qty harus > 0" });
    }

    // validasi bahan milik owner
    const { data: bahan, error: eBahan } = await supabase
      .from("bahan")
      .select("id, owner_id")
      .eq("id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (eBahan) return res.status(400).json({ ok: false, message: "bahan_id tidak valid untuk owner ini" });

    const { data, error } = await supabase
      .from("stok_logs")
      .insert([{ owner_id, bahan_id, qty: Number(qty), type: "OUT", catatan: catatan || null }])
      .select("id, type, bahan_id, qty")
      .single();

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// GET /inventory/summary (final format)
// ===============================
router.get("/summary", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id) {
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    }

    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { data, error } = await supabase
      .from("v_stok_summary")
      .select("bahan_id, nama_bahan, satuan, stok_total")
      .eq("owner_id", owner_id)
      .order("nama_bahan", { ascending: true });

    if (error) throw error;

    const result = data.map(row => ({
      bahan_id: row.bahan_id,
      saldo: row.stok_total,
      satuan: row.satuan,
      nama: row.nama_bahan,
    }));

    return res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// GET /inventory/history
// ===============================
router.get("/history", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });

    const { limit = 50, bahan_id, type, since, until } = req.query;

    // validasi limit
    const safeLimit = Math.min(parseInt(limit) || 50, 500);

    // query dasar
    let query = supabase
      .from("stok_logs")
      .select(
        `id, created_at, type, bahan_id, qty, catatan, bahan:bahan_id (nama_bahan, satuan)`
      )
      .eq("owner_id", owner_id)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    // filter tambahan (opsional)
    if (bahan_id) query = query.eq("bahan_id", bahan_id);
    if (type) query = query.eq("type", type.toUpperCase());
    if (since) query = query.gte("created_at", since);
    if (until) query = query.lte("created_at", until);

    const { data, error } = await query;
    if (error) throw error;

    const result = data.map((row) => ({
      id: row.id,
      created_at: row.created_at,
      tipe: row.type,
      bahan_id: row.bahan_id,
      qty: row.qty,
      satuan: row.bahan?.satuan,
      catatan: row.catatan,
      bahan_nama: row.bahan?.nama_bahan,
    }));

    return res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
