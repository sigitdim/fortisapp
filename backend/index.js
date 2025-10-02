require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

const app = express();

// ✅ CORS config: allow frontend di localhost:3000
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  credentials: true
}));

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

// GET /pricing/logs
app.get("/pricing/logs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pricing_logs")
      .select(`
        id,
        produk_id,
        owner_id,
        harga_lama,
        harga_baru,
        created_at
      `)
      .order("created_at", { ascending: false }); // biar histori terbaru di atas

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /pricing/:id → update harga_jual_user + simpan log
app.patch("/pricing/:id", async (req, res) => {
  const { id } = req.params;
  const { harga_jual_user } = req.body;

  try {
    // Ambil harga lama dulu
    const { data: oldData, error: fetchError } = await supabase
      .from("produk")
      .select("harga_jual_user, owner")
      .eq("id", id)
      .single();

    if (fetchError) return res.status(400).json({ error: fetchError.message });

    // Update harga baru
    const { data, error } = await supabase
      .from("produk")
      .update({ harga_jual_user })
      .eq("id", id)
      .select();

    if (error) return res.status(400).json({ error: error.message });

    // Simpan log perubahan harga
    await supabase.from("pricing_logs").insert([{
      produk_id: id,
      owner_id: oldData.owner,
      harga_lama: oldData.harga_jual_user,
      harga_baru: harga_jual_user
    }]);

    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /bahan/:id  → update harga bahan + simpan log + auto recalculation HPP
app.patch("/bahan/:id", async (req, res) => {
  const { id } = req.params;
  const { harga_baru, changed_by } = req.body; // contoh: { "harga_baru": 32500, "changed_by": "uuid-user" }

  if (typeof harga_baru !== "number") {
    return res.status(400).json({ error: "harga_baru harus number" });
  }

  try {
    // 1. Ambil data bahan lama
    const { data: oldData, error: fe } = await supabase
      .from("bahan")
      .select("harga, owner")
      .eq("id", id)
      .single();
    if (fe || !oldData) return res.status(400).json({ error: fe?.message || "Bahan not found" });

    const harga_lama = Number(oldData.harga);

    // 2. Cari produk yang pakai bahan ini
    const { data: komposisiRows, error: eKomposisi } = await supabase
      .from("komposisi")
      .select("produk_id")
      .eq("bahan_id", id);
    if (eKomposisi) return res.status(400).json({ error: eKomposisi.message });

    const affectedProdukIds = [...new Set((komposisiRows || []).map(r => r.produk_id))];

    // 3. Snapshot HPP lama
    let oldHppMap = new Map();
    if (affectedProdukIds.length) {
      const { data: oldHppRows, error: eOld } = await supabase
        .from("v_hpp")
        .select("produk_id, hpp_per_porsi")
        .in("produk_id", affectedProdukIds);
      if (eOld) return res.status(400).json({ error: eOld.message });
      oldHppRows.forEach(r => oldHppMap.set(r.produk_id, Number(r.hpp_per_porsi)));
    }

    // 4. Update harga bahan
    const { data: updated, error: ue } = await supabase
      .from("bahan")
      .update({ harga: harga_baru })
      .eq("id", id)
      .select();
    if (ue) return res.status(400).json({ error: ue.message });

    // 5. Simpan log bahan
    await supabase.from("bahan_logs").insert([{
      bahan_id: id,
      owner_id: oldData.owner,
      harga_lama,
      harga_baru,
      changed_by: changed_by || null
    }]);

    // 6. Snapshot HPP baru
    let newHppMap = new Map();
    if (affectedProdukIds.length) {
      const { data: newHppRows, error: eNew } = await supabase
        .from("v_hpp")
        .select("produk_id, hpp_per_porsi")
        .in("produk_id", affectedProdukIds);
      if (eNew) return res.status(400).json({ error: eNew.message });
      newHppRows.forEach(r => newHppMap.set(r.produk_id, Number(r.hpp_per_porsi)));
    }

    // 7. Simpan log HPP
    if (affectedProdukIds.length) {
      const hppLogs = affectedProdukIds.map(pid => ({
        produk_id: pid,
        bahan_id: id,
        old_hpp: oldHppMap.get(pid) ?? null,
        new_hpp: newHppMap.get(pid) ?? null,
        changed_by: changed_by || null,
        cause: "harga_bahan"
      }));

      const { error: eHppLog } = await supabase.from("hpp_recalc_logs").insert(hppLogs);
      if (eHppLog) return res.status(400).json({ error: eHppLog.message });
    }

    // 8. Response akhir
    res.json({
      ok: true,
      bahan_id: id,
      harga_lama,
      harga_baru,
      affected_count: affectedProdukIds.length,
      updated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// GET /bahan/logs/:id  → histori harga 1 bahan (buat grafik)
app.get("/bahan/logs/:id", async (req, res) => {
  const { id } = req.params; // id bahan
  try {
    const { data, error } = await supabase
      .from("bahan_logs")
      .select("id, harga_lama, harga_baru, created_at")
      .eq("bahan_id", id)
      .order("created_at", { ascending: true });
    if (error) return res.status(400).json({ error: error.message });

    // seri siap-chart
    const series = data.map(r => ({ t: r.created_at, y: Number(r.harga_baru) }));
    res.json({ ok: true, count: data.length, series, raw: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
