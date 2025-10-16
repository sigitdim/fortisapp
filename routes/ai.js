const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { getOpenAI } = require('../lib/openai');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);


router.post('/suggest', async (req, res) => {
  try {
    const owner_id = req.headers['x-owner-id'];
    const { produk_id } = req.body || {};

    if (!produk_id || !owner_id)
      return res.status(400).json({ ok: false, error: 'produk_id dan owner_id wajib' });

    // ambil data produk
    const { data: produk } = await supabase
      .from('produk')
      .select('nama_produk')
      .eq('id', produk_id)
      .maybeSingle();

    const { data: hpp } = await supabase
      .from('v_hpp_final_new')
      .select('total_hpp')
      .eq('produk_id', produk_id)
      .maybeSingle();

    const hppValue = hpp?.total_hpp || 0;
    const namaProduk = produk?.nama_produk || 'Produk Tanpa Nama';

    const openai = getOpenAI();

    const prompt = `
      Produk: ${namaProduk}
      HPP: ${hppValue}
      Tentukan harga jual wajar (dalam rupiah, angka bulat tanpa simbol).
    `;

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
    });

    const text = response.output[0].content[0].text;
    const harga_rekomendasi = Math.min(parseInt(text.replace(/\D/g, '')) || 0, 99999999);


// simpan ke log (amanin schema biar future-proof)
await supabase.from('pricing_logs').insert({
  owner_id,
  produk_id,
  harga_lama: null,
  harga_baru: harga_rekomendasi,
  source: 'ai_suggest',
  created_at: new Date().toISOString(),
});

    res.json({
      ok: true,
      data: {
        produk_id,
        nama_produk: namaProduk,
        hpp: hppValue,
        harga_rekomendasi,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
