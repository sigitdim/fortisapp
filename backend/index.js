require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Koneksi ke Supabase (pakai SERVICE ROLE)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Cek server
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Validasi input
const HppSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    qty: z.number().nonnegative(),
    unit_cost: z.number().nonnegative()
  })).min(1),
  overhead: z.number().nonnegative().default(0),
  margin_percent: z.number().nonnegative().default(0)
});

// Hitung HPP + simpan log
app.post('/hpp', async (req, res) => {
  try {
    const data = HppSchema.parse(req.body);

    const ingredientsCost = data.items.reduce((sum, it) => sum + it.qty * it.unit_cost, 0);
    const totalCost = ingredientsCost + data.overhead;
    const suggestedPrice = data.margin_percent > 0
      ? Math.ceil(totalCost * (1 + data.margin_percent / 100))
      : null;

    const result = {
      ingredients_cost: Number(ingredientsCost.toFixed(2)),
      overhead: Number(data.overhead.toFixed(2)),
      total_cost: Number(totalCost.toFixed(2)),
      margin_percent: data.margin_percent,
      suggested_price: suggestedPrice
    };

    const { error } = await supabase.from('hpp_logs_new').insert([{ input: data, result }]);
    if (error) console.error('Supabase insert error:', error); // tetap balikin hasil walau gagal simpan

    res.json({ ok: true, ...result });
  } catch (err) {
    if (err?.issues) return res.status(400).json({ ok: false, error: 'Input tidak valid', detail: err.issues });
    console.error(err);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Backend jalan di http://localhost:${PORT}`));

// Ambil riwayat perhitungan (terbaru dulu)
app.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { data, error } = await supabase
      .from('hpp_logs_new')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ ok: true, count: data.length, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Gagal ambil logs' });
  }
});
