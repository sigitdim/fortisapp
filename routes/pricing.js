// routes/pricing.js
const express = require('express');
const router = express.Router();

const { createClient } = require('@supabase/supabase-js');

// 🔑 ENV Supabase
const SUPABASE_URL =
  process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// 💾 Supabase client (global)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🤖 OpenAI: lazy init (biar app gak crash saat start)
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    const OpenAI = require('openai');
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// (opsional) stub lama
router.get('/final', async (req, res) => {
  try {
    const ownerId = req.header('x-owner-id');
    const produkId = req.query.produk_id;
    if (!ownerId || !produkId) {
      return res.status(400).json({ error: 'owner_id & produk_id wajib' });
    }
    return res.json({ ok: true, owner_id: ownerId, produk_id: produkId, result: 'pricing stub' });
  } catch {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// ✅ AI Suggestion
router.post('/suggest', async (req, res) => {
  try {
    const { produk_id } = req.body || {};
    if (!produk_id) return res.status(400).json({ ok: false, error: 'produk_id wajib ada' });
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ ok:false, error:'supabaseKey/url missing' });
    }
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ ok:false, error:'OPENAI_API_KEY missing' });
    }

    // 1) Ambil HPP dari view final
    const { data: hppRow, error: hppErr } = await supabase
      .from('v_hpp_final_new')
      .select('produk_id,total_hpp')
      .eq('produk_id', produk_id)
      .maybeSingle();
    if (hppErr) return res.status(500).json({ ok:false, error:'ERR_HIT_V_HPP', detail:hppErr.message });
    if (!hppRow) return res.status(404).json({ ok:false, error:'Produk tidak ditemukan di v_hpp_final_new' });

    // 2) Ambil nama produk dari tabel produk
    const { data: prodRow, error: prodErr } = await supabase
      .from('produk')
      .select('id,nama_produk')
      .eq('id', produk_id)
      .maybeSingle();
    if (prodErr) return res.status(500).json({ ok:false, error:'ERR_HIT_PRODUK', detail:prodErr.message });
    if (!prodRow) return res.status(404).json({ ok:false, error:'Produk tidak ada di tabel produk' });

    const nama = prodRow.nama_produk || 'Tanpa Nama';
    const hpp  = Number(hppRow.total_hpp) || 0;

    // 3) Minta rekomendasi ke OpenAI
    const openai = getOpenAI();
    const prompt = `Produk: ${nama}
HPP: ${hpp}

Beri rekomendasi harga jual wajar untuk UMKM Indonesia.
Balas hanya angka bulat (tanpa simbol, tanpa teks).`;

    const ai = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = (ai?.choices?.[0]?.message?.content || '').trim();
    const hargaRekomendasi = parseInt(raw.replace(/[^\d]/g, ''), 10);
    if (Number.isNaN(hargaRekomendasi)) {
      return res.status(500).json({ ok:false, error:'AI_BAD_RESPONSE', raw });
    }

    // 4) Balikkan ke FE
    return res.json({
      ok: true,
      data: { produk_id, nama_produk: nama, hpp, harga_rekomendasi: hargaRekomendasi }
    });
  } catch (err) {
    return res.status(500).json({ ok:false, error: err.message });
  }
});

module.exports = router;
