const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================
// POST /inventory/in
// ===============================
router.post("/in", async (req, res) => {
  try {
    const { bahan_id, qty, catatan } = req.body;
    const owner_id = req.headers["x-owner-id"];

    if (!bahan_id || !qty) {
      return res.status(400).json({ ok: false, error: "bahan_id dan qty wajib diisi" });
    }

    const { error } = await supabase.from("stok_logs").insert([
      {
        bahan_id,
        qty,
        type: "in",
        catatan: catatan || null,
        owner_id,
      },
    ]);

    if (error) throw error;
    return res.json({ ok: true, message: "stok masuk dicatat" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// POST /inventory/out
// ===============================
router.post("/out", async (req, res) => {
  try {
    const { bahan_id, qty, catatan } = req.body;
    const owner_id = req.headers["x-owner-id"];

    if (!bahan_id || !qty) {
      return res.status(400).json({ ok: false, error: "bahan_id dan qty wajib diisi" });
    }

    const { error } = await supabase.from("stok_logs").insert([
      {
        bahan_id,
        qty,
        type: "out",
        catatan: catatan || null,
        owner_id,
      },
    ]);

    if (error) throw error;
    return res.json({ ok: true, message: "stok keluar dicatat" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ===============================
// GET /inventory/summary
// ===============================
router.get("/summary", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];

    // bersihin kutip atau backslash nyasar
    if (owner_id) {
      owner_id = owner_id.replace(/["\\]/g, "").trim();
    }

    const { data, error } = await supabase
      .from("v_stok_summary")
      .select("*")
      .eq("owner_id", owner_id);

    if (error) throw error;
    return res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
