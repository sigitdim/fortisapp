const express = require("express");
const axios = require("axios");
const { supabase } = require("../supabase");

const router = express.Router();

router.post("/mayar", async (req, res) => {
  try {
    // --- Verifikasi token dari header Mayar ---
    const incomingToken = req.headers["x-webhook-token"];
    if (incomingToken !== process.env.MAYAR_WEBHOOK_TOKEN) {
      console.log("❌ Invalid webhook token:", incomingToken);
      return res.status(401).json({ ok: false, error: "Unauthorized webhook" });
    }

    const payload = req.body;
    console.log("✅ Webhook Mayar diterima:", payload);

// === Handle event payment.received ===
const event = payload?.event;
const data = payload?.data;

if (event === "payment.received" && data?.transactionStatus === "SUCCESS") {
  console.log("✅ Webhook sukses, update profile user...");

  await supabase
    .from("profiles")
    .update({
      plan_status: "pro",
      activated_at: new Date().toISOString(),
      license_code: data?.id || data?.transactionId || null,
      product_id: data?.productId || null,
      expires_at: data?.expiredAt || null,
    })
    .eq("email", data?.customerEmail);

  return res.json({ ok: true, message: "User upgraded to PRO" });
} else {
  switch (event) {
    case "license.activated":
      await supabase
        .from("profiles")
        .update({ plan_status: "pro" })
        .eq("email", data?.customerEmail);
      console.log("🔓 License activated");
      break;

    case "license.deactivated":
    case "membership.expired":
      await supabase
        .from("profiles")
        .update({ plan_status: "free", expires_at: null })
        .eq("email", data?.customerEmail);
      console.log("🔒 License deactivated/expired");
      break;

    default:
      console.log("ℹ️ Event Mayar lain diabaikan:", event);
  }

  return res.json({ ok: true, message: `Event ${event} handled` });
}


    // --- Ambil data utama ---
    const licenseCode = payload?.licenseCode || payload?.data?.licenseCode;
    const productId = payload?.productId || payload?.data?.productId;
    const customerEmail = payload?.customerEmail || payload?.data?.customerEmail;

    if (!licenseCode || !productId || !customerEmail) {
      return res.status(400).json({ ok: false, error: "Data webhook tidak lengkap" });
    }

    // --- Aktivasi license di Mayar ---
    const activate = await axios.post(
      "https://api.mayar.id/saas/v1/license/activate",
      { licenseCode, productId },
      {
        headers: {
          Authorization: `Bearer ${process.env.MAYAR_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("🔓 License activated:", activate.data);

    // --- Update akun user di Supabase ---
    const { data: user } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (!user) {
      console.log("⚠️ User tidak ditemukan untuk email:", customerEmail);
      return res.status(404).json({ ok: false, error: "User tidak ditemukan" });
    }

    await supabase
      .from("profiles")
      .update({
        plan_status: "pro",
        ai_active: true,
        license_code: licenseCode,
        product_id: productId,
        activated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    console.log("✅ User berhasil diupdate:", customerEmail);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.data || err.message);
    res.status(500).json({ ok: false, error: "Gagal proses webhook" });
  }
});

module.exports = router;

