const express = require("express");
const router = express.Router();

// === CEK KESEHATAN SERVER ===
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// === CEK VERSI API ===
router.get("/version", (req, res) => {
  res.json({
    ok: true,
    version: "1.0.4",
    last_update: "2025-10-23",
  });
});

module.exports = router;
