const express = require("express");
const { supabase } = require("../supabase.js");
const requireOwner = require("../middleware/requireOwner.js");

const router = express.Router();

/**
 * DELETE /inventory/history/:id
 * header: x-owner-id
 */
router.delete("/history/:id", requireOwner, async (req, res) => {
  try {
    const owner_id = req.owner_id;
    const { id } = req.params;

    // hapus transaksi dari tabel log
    const { data, error } = await supabase
      .from("bahan_logs")
      .delete()
      .eq("id", id)
      .eq("owner_id", owner_id)
      .select();

    if (error) throw error;

    return res.json({
      ok: true,
      deleted: data?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "internal_error",
    });
  }
});

module.exports = router;
