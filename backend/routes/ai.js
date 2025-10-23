const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const { getOpenAI } = require("../lib/openai");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

// === AI Suggestion (non-chat version) ===
router.post("/suggest", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    const { produk_id, target_margin_pct = 0.35 } = req.body || {};

    if (!produk_id || !owner_id)
      return res
        .status(400)
        .json({ ok: false, error: "produk_id atau owner_id kosong" });

    // ambil nama produk + hpp
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

    const hppValue = hpp?.total_hpp || 0;
    const namaProduk = produk?.nama_produk || "Produk Tanpa Nama";

    if (!hppValue)
      return res
        .status(400)
        .json({ ok: false, error: "HPP belum tersedia untuk produk ini" });

    const openai = getOpenAI();

    // prompt hemat token, hasil JSON
const prompt = `
Kamu adalah asisten bisnis profesional yang ahli dalam analisis harga lintas industri (F&B, fashion, kerajinan, kosmetik, manufaktur ringan, dsb).

Analisis data produk berikut:
- Nama produk: ${namaProduk}
- HPP (modal per unit): Rp${hppValue}
- Target margin: ${(target_margin_pct * 100).toFixed(0)}%
- Komposisi bahan (jika ada): tampilkan konteks produk dari nama bahannya

Tugasmu:
1. Identifikasi kategori bisnisnya secara otomatis berdasarkan nama produk dan bahan (contoh: F&B, fashion, kosmetik, atau lainnya).
2. Buat **3 rekomendasi harga jual**:
   - **Kompetitif** → fokus volume & penetrasi pasar
   - **Standar** → margin optimal & posisi aman
   - **Premium** → nilai tinggi, cocok untuk branding kuat
3. Untuk setiap harga, berikan:
   - \`harga_jual\` (angka bulat dalam rupiah)
   - \`margin_pct\` (margin terhadap HPP)
   - \`strategi\` (tips sukses di kategori tersebut)
   - \`alasan\` (kenapa harga itu cocok)
4. Tambahkan juga \`analisa_umum\` berisi insight pasar (contoh: trend permintaan, pentingnya kemasan, tren bahan baku, dll).

Kembalikan hasil **hanya dalam JSON valid** seperti contoh ini:
{
  "produk": "Kemeja Linen Premium",
  "kategori": "Fashion",
  "hpp": 48000,
  "rekomendasi": [
    {"tipe":"Kompetitif","harga_jual":59000,"margin_pct":0.23,"strategi":"Gunakan bahan lokal untuk menekan biaya produksi","alasan":"Harga masuk segmen middle market"},
    {"tipe":"Standar","harga_jual":65000,"margin_pct":0.35,"strategi":"Bangun brand lewat visual storytelling","alasan":"Margin seimbang dengan persepsi kualitas"},
    {"tipe":"Premium","harga_jual":79000,"margin_pct":0.64,"strategi":"Fokus ke branding dan limited collection","alasan":"Cocok untuk segmen fashion enthusiast"}
  ],
  "analisa_umum": "Permintaan linen meningkat 12% di Q4, konsumen mencari bahan adem dan sustainable."
}
`;


    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.3,
    });

    const raw = response.output[0].content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // fallback simple kalau parsing gagal
      const rec = Math.round(hppValue * (1 + target_margin_pct));
      parsed = {
        recommended_price: rec,
        range: { min: rec * 0.95, max: rec * 1.1 },
        expected_margin_pct: target_margin_pct,
        notes: ["AI gagal parsing, gunakan fallback rumus sederhana"],
      };
    }

    // simpan hasil ke log
    await supabase.from("pricing_logs").insert({
      owner_id,
      produk_id,
      harga_lama: null,
      harga_baru: parsed.recommended_price,
      source: "ai_suggest",
      created_at: new Date().toISOString(),
    });

    res.json({
      ok: true,
      data: {
        produk_id,
        nama_produk: namaProduk,
        hpp: hppValue,
        ...parsed,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
