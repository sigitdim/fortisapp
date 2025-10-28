const express = require("express");
const router = express.Router();
const { supabase } = require("../supabase");
const requireOwner = require("../middleware/requireOwner");

router.get("/", requireOwner, async (req, res) => {
  const { owner_id } = req;
  const { produk_id } = req.query;

  let query = supabase
    .from("v_resep_detail")
    .select("*")
    .eq("owner_id", owner_id);

  if (produk_id) query = query.eq("produk_id", produk_id);

  const { data, error } = await query;

  if (error) return res.status(400).json({ ok: false, error });
  res.json({ ok: true, data });
});

module.exports = router;
