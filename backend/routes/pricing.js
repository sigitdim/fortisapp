// routes/pricing.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

// 🔑 ENV Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// 💾 Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🤖 OpenAI lazy init
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    const OpenAI = require("openai");
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// =====================
// ✅  AI SUGGEST (refactor baru)
// =====================
router.post("/suggest", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    const { produk_id, target_margin_pct = 0.35 } = req.body || {};

    if (!owner_id || !produk_id)
      return res
        .status(400)
        .json({ ok: false, error: "produk_id atau owner_id kosong" });

    // ambil nama produk + HPP
    const { data: produk } = await supabase
      .from("produk")
      .select("nama_produk")
      .eq("id", produk_id)
      .maybeSingle();

    const { data: hpp } = await supabase
      .from("v_hpp_final_new")
      .select("total_hpp")
      .eq("produk_id", produk_id)
      .maybeSingle();

    const namaProduk = produk?.nama_produk || "Produk Tanpa Nama";
    const hppValue = hpp?.total_hpp || 0;
    if (!hppValue)
      return res
        .status(400)
        .json({ ok: false, error: "HPP belum tersedia untuk produk ini" });

    const openai = getOpenAI();

    // Prompt general lintas industri
    const prompt = `
Kamu adalah asisten bisnis profesional yang ahli dalam analisis harga lintas industri (F&B, fashion, kerajinan, kosmetik, manufaktur ringan, dll).

Analisis data berikut:
- Nama produk: ${namaProduk}
- HPP: Rp${hppValue}
- Target margin: ${(target_margin_pct * 100).toFixed(0)}%

Tugas:
1. Identifikasi kategori bisnis otomatis dari nama produk.
2. Beri 3 rekomendasi harga jual (Kompetitif, Standar, Premium).
3. Untuk tiap harga, sertakan: harga_jual, margin_pct, strategi, alasan.
4. Tambahkan analisa_umum (insight pasar).

Kembalikan **JSON valid saja**:
{
  "produk":"${namaProduk}",
  "kategori":"string",
  "hpp":${hppValue},
  "rekomendasi":[
    {"tipe":"Kompetitif","harga_jual":angka,"margin_pct":angka,"strategi":"...","alasan":"..."},
    {"tipe":"Standar","harga_jual":angka,"margin_pct":angka,"strategi":"...","alasan":"..."},
    {"tipe":"Premium","harga_jual":angka,"margin_pct":angka,"strategi":"...","alasan":"..."}
  ],
  "analisa_umum":"..."
}
`;

    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const raw = ai?.choices?.[0]?.message?.content?.trim() || "";

    // parsing aman
    let parsed;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      parsed = null;
    }

    // fallback simple
    if (!parsed) {
      const rec = Math.round(hppValue * (1 + target_margin_pct));
      parsed = {
        produk: namaProduk,
        kategori: "Umum",
        hpp: hppValue,
        rekomendasi: [
          {
            tipe: "Standar",
            harga_jual: rec,
            margin_pct: target_margin_pct,
            strategi: "Gunakan strategi harga sederhana",
            alasan: "Fallback perhitungan otomatis",
          },
        ],
        analisa_umum:
          "AI gagal parsing, gunakan hasil fallback (rumus margin sederhana).",
      };
    }

    // simpan log
    await supabase.from("pricing_logs").insert({
      owner_id,
      produk_id,
      harga_lama: null,
      harga_baru: parsed.rekomendasi?.[1]?.harga_jual || null,
      source: "ai_suggest",
      inputs_hash: `auto-${Date.now()}`,
      created_at: new Date().toISOString(),
    });

    return res.json({ ok: true, data: parsed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// =====================
// ✅  APPLY hasil AI → simpan ke DB
// =====================
router.post("/apply", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    const { produk_id, recommended_price, inputs_hash } = req.body || {};

    if (!owner_id || !produk_id || !recommended_price)
      return res
        .status(400)
        .json({ ok: false, error: "data kurang lengkap (produk_id / harga)" });

    // ambil harga lama
    const { data: old } = await supabase
      .from("produk")
      .select("harga_jual")
      .eq("id", produk_id)
      .maybeSingle();

    const old_price = old?.harga_jual || null;

    // update harga baru
    await supabase
      .from("produk")
      .update({ harga_jual: recommended_price })
      .eq("id", produk_id);

    // log perubahan
    await supabase.from("pricing_logs").insert({
      owner_id,
      produk_id,
      harga_lama: old_price,
      harga_baru: recommended_price,
      source: "ai_apply",
      inputs_hash: inputs_hash || null,
      created_at: new Date().toISOString(),
    });

    return res.json({
      ok: true,
      message: "Harga berhasil diterapkan",
      data: { produk_id, old_price, new_price: recommended_price },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
