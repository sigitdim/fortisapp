const express = require("express");
const router = express.Router();
const fetch = (...a) => import("node-fetch").then(({ default: f }) => f(...a));
const { supabase } = require("../supabase");

// === VERIFY LICENSE ===
router.get("/verify", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    if (!owner_id) return res.status(400).json({ ok: false, error: "Missing owner_id" });

    const { data: user, error } = await supabase
      .from("profiles")
      .select("license_code, product_id")
      .eq("id", owner_id)
      .single();

    if (error || !user?.license_code) return res.json({ ok: true, isActive: false });

    const r = await fetch("https://api.mayar.id/saas/v1/license/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        licenseCode: user.license_code,
        productId: user.product_id,
      }),
    });

    const out = await r.json();
    return res.json({
      ok: true,
      isActive: !!out?.isLicenseActive,
      expiresAt: out?.licenseCode?.expiredAt || null,
      raw: out,
    });
  } catch (e) {
    console.error("verify err:", e);
    res.status(500).json({ ok: false });
  }
});

// === ACTIVATE LICENSE ===
router.post("/activate", async (req, res) => {
  const { licenseCode, productId } = req.body || {};
  const r = await fetch("https://api.mayar.id/saas/v1/license/activate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ licenseCode, productId }),
  });
  res.status(r.status).json(await r.json());
});

// === DEACTIVATE LICENSE ===
router.post("/deactivate", async (req, res) => {
  const { licenseCode, productId } = req.body || {};
  const r = await fetch("https://api.mayar.id/saas/v1/license/deactivate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ licenseCode, productId }),
  });
  res.status(r.status).json(await r.json());
});

module.exports = router;
