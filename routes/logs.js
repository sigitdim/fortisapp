const express = require("express");
const { supabase } = require("../supabase.js");
const r = express.Router();

const isUuid = v =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);

r.get("/hpp", async (req, res, next) => {
  try {
    const owner_id = req.query.owner_id;
    if (!isUuid(owner_id)) {
      const e = new Error("owner_id must be a valid UUID");
      e.statusCode = 400;
      throw e;
    }

    const { data, error } = await supabase
      .from("hpp_logs_new")
      .select("id, created_at, input, result, produk_id, bahan_id, old_hpp, new_hpp, diff, cause, changed_by, owner_id")
      .eq("owner_id", owner_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
});

module.exports = r;
