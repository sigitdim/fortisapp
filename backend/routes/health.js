const express = require("express");
const router = express.Router();

// ===============================
// GET /health — cek kondisi server
// ===============================
router.get("/health", (req, res) => {
  try {
    // Cache 5 menit (data jarang berubah)
    res.set("Cache-Control", "max-age=300");

    res.json({
      ok: true,
      status: "running",
      uptime_seconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error /health:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// GET /version — versi API aktif
// ===============================
router.get("/version", (req, res) => {
  try {
    // Cache 5 menit — info versi jarang berubah
    res.set("Cache-Control", "max-age=300");

    res.json({
      ok: true,
      version: "1.0.8-rc",
      last_update: "2025-10-28",
    });
  } catch (err) {
    console.error("Error /version:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;
