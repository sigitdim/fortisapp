require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');

const app = express();

// Supabase client (prioritaskan SERVICE ROLE)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY    // ✅ pakai service_role duluan
  || process.env.SERVICE_ROLE_KEY          // (alias cadangan kalau namanya beda)
  || process.env.SUPABASE_KEY,             // terakhir baru anon (kalau 2 di atas kosong)
  { auth: { persistSession: false } }
);

// (opsional) cek tipe key yang kepakai tanpa nge-print isi key
const keyUsed =
  (process.env.SUPABASE_SERVICE_ROLE_KEY && 'service_role') ||
  (process.env.SERVICE_ROLE_KEY && 'service_role') ||
  (process.env.SUPABASE_KEY && 'anon') || 'unknown';
console.log(`[supabase] using ${keyUsed} key`);

// Middleware cek admin API key
function checkAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}


// ✅ CORS config: allow frontend di localhost:3000
app.use(cors({
  origin: ["http://localhost:3000", "https://app.fortislab.id"],
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  credentials: true
}));

app.use(express.json());

// --- Helpers ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOwnerId(req, res) {
  const ownerId = req.get('x-owner-id') || req.query.owner_id || req.body?.owner_id;

  if (!ownerId) {
    res.status(400).json({
      ok: false,
      error: 'owner_id wajib (header x-owner-id, query ?owner_id=, atau di body JSON)',
    });
    return null;
  }

  if (!UUID_RE.test(ownerId)) {
    res.status(400).json({
      ok: false,
      error: 'owner_id tidak valid (bukan UUID)',
    });
    return null;
  }

  return ownerId;
}


function getPaging(req) {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { limit, page, from, to };
}


// Routes
const logs = require("./routes/logs.js");
app.use("/logs", logs);


// Cek server
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/pricing/final", async (req, res) => {
  try {
    const { produk_id } = req.query;
    if (!produk_id) {
      return res.status(400).json({ ok: false, error: "produk_id wajib" });
    }

    const { data, error } = await supabase
      .from("v_pricing_final")
      .select("*")
      .eq("produk_id", produk_id)
      .single();

    if (error) throw error;

    res.json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error("ERR /pricing/final:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
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
      .select("harga_jual_user, owner_id")
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
       owner_id: oldData.owner_id,
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
  const isUUID = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s || '');
  const { id } = req.params;
  const { harga_baru, changed_by } = req.body; // contoh: { "harga_baru": 32500, "changed_by": "uuid-user" }

  if (typeof harga_baru !== "number") {
    return res.status(400).json({ error: "harga_baru harus number" });
  }

  try {
    // 1. Ambil data bahan lama
    const { data: oldData, error: fe } = await supabase
      .from("bahan")
      .select("harga, owner_id")
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
const { error: logErr } = await supabase.from("bahan_logs").insert([{
  bahan_id: id ? String(id) : null,                // pastiin format string UUID
  owner_id: oldData.owner_id ? String(oldData.owner_id) : null,
  harga_lama,
  harga_baru,
  changed_by: changed_by ? String(changed_by) : null // biar gak ke-cast uuid
}]);

if (logErr) {
  console.error("❌ bahan_logs insert error:", logErr);
} else {
  console.log(`✅ bahan_logs inserted for bahan_id=${id}, harga_baru=${harga_baru}`);
}


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
    changed_by: isUUID(changed_by) ? changed_by : null, // ✅ tambahin ini
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

// --- Normalizer: paksa schema flat untuk /pricing/final ---
function normalizePricingRow(row = {}) {
  const hpp = row.hpp || {};
  return {
    produk_id: row.produk_id || row.id || null,
    total_hpp:
      row.total_hpp ??
      row.hpp_total_per_porsi ??
      hpp.total_hpp ??
      hpp.hpp_total_per_porsi ??
      0,
    bahan_per_porsi:
      row.bahan_per_porsi ??
      hpp.bahan_per_porsi ??
      0,
    overhead_per_porsi:
      row.overhead_per_porsi ??
      hpp.overhead_per_porsi ??
      0,
    tenaga_kerja_per_porsi:
      row.tenaga_kerja_per_porsi ??
      hpp.tenaga_kerja_per_porsi ??
      0,
  };
}


// GET /pricing/final → hitung total HPP
app.get("/pricing/final", async (req, res) => {
  const owner_id = req.headers["x-owner-id"];
  const produk_id = req.query.produk_id;

  try {
    // ✅ validasi produk_id sebelum lanjut
const isUUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!isUUID.test(produk_id)) {
  return res.status(400).json({ ok: false, error: "produk_id must be a valid UUID" });
}

    // 🧮 ambil data HPP bahan
    const { data: bahanData } = await supabase
      .from("v_hpp_final")
      .select("hpp_per_porsi")
      .eq("produk_id", produk_id)
      .maybeSingle();

    const bahan_per_porsi = bahanData?.hpp_per_porsi || 0;

    // ambil overhead
    const { data: overheadData } = await supabase
      .from("overhead_per_produk")
      .select("overhead_per_porsi")
      .eq("produk_id", produk_id)
      .maybeSingle();

    const overhead_per_porsi = overheadData?.overhead_per_porsi || 0;

    // ambil tenaga kerja
    const { data: tenagaData } = await supabase
      .from("tenaga_kerja_produk")
      .select("tenaga_kerja_per_porsi")
      .eq("produk_id", produk_id)
      .maybeSingle();

    const tenaga_kerja_per_porsi = tenagaData?.tenaga_kerja_per_porsi || 0;

    // total
    const total_hpp =
      (bahan_per_porsi || 0) +
      (overhead_per_porsi || 0) +
      (tenaga_kerja_per_porsi || 0);

    // ✅ schema flat untuk FE
    const dataFlat = {
      produk_id,
      total_hpp,
      bahan_per_porsi,
      overhead_per_porsi,
      tenaga_kerja_per_porsi,
    };

    res.json({ ok: true, data: dataFlat });

    // logging async di belakang layar
    supabase
      .from("hpp_logs_new")
      .insert([
        {
          owner_id,
          produk_id,
          bahan_per_porsi,
          overhead_per_porsi,
          tenaga_kerja_per_porsi,
          total_hpp,
          note: "Hit from /pricing/final",
          created_at: new Date().toISOString(),
        },
      ])
      .then(() =>
        console.log(
          `[LOGGED] hpp_logs_new ok -> produk_id=${produk_id}, owner_id=${owner_id}`
        )
      )
      .catch((logError) =>
        console.error("Gagal insert log:", logError.message)
      );
  } catch (err) {
    console.error("[/pricing/final] error:", err.message);
    res
      .status(500)
      .json({ ok: false, error: "internal_error", detail: err.message });
  }
});

app.get('/hpp', async (req, res) => {
  try {
    const { produk_id } = req.query;
    if (!produk_id) return res.status(400).json({ ok: false, msg: 'produk_id wajib' });

    // ambil dari view HPP final (sesuai yang kita pakai)
    const { data, error } = await supabase
      .from('v_hpp_final_new')
      .select('produk_id, total_hpp, bahan_per_porsi, overhead_per_porsi, tenaga_kerja_per_porsi')
      .eq('produk_id', produk_id)
      .single();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(404).json({ ok: false, msg: 'Produk tidak ditemukan' });

    return res.json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// === GET /promo ===
// ambil daftar promo dari tabel public.promo (sesuai kontrak FE)
app.get('/promo', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('promo')
      .select('id, nama, tipe, nilai, produk_ids, aktif')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ ok: true, data });
  } catch (e) {
    console.error('GET /promo error:', e);
    res.status(500).json({ ok: false, message: e.message });
  }
});


// === GET /setup/get ===
// Ambil ulang data setup user (bahan, overhead, tenaga kerja)
app.get('/setup/get', async (req, res) => {
  try {
    const { owner_id } = req.query;
    if (!owner_id) return res.status(400).json({ ok: false, message: "owner_id wajib diisi" });

const { data: bahan } = await supabase.from('bahan').select('*').eq('owner_id', owner_id);
const { data: overhead } = await supabase.from('overhead').select('*').eq('owner_id', owner_id);
const { data: tenaga_kerja } = await supabase.from('tenaga_kerja').select('*').eq('owner_id', owner_id);


    // Simpan log
    await supabase.from('setup_logs').insert({
      owner_id,
      endpoint: '/setup/get',
      created_at: new Date().toISOString()
    });

    res.json({
      ok: true,
      data: { bahan, overhead, tenaga_kerja }
    });

  } catch (error) {
    console.error('Error /setup/get:', error);
    res.status(500).json({ ok: false, message: error.message });
  }
});


app.post('/setup/init', async (req, res) => {
  try {
    const { owner_id } = req.body;
    if (!owner_id) return res.status(400).json({ ok: false, msg: 'owner_id wajib' });

    // template data awal
    const bahan = [
      { owner_id, nama_bahan: 'Kopi', satuan: 'gram', harga: 0 },
      { owner_id, nama_bahan: 'Gula', satuan: 'gram', harga: 0 },
      { owner_id, nama_bahan: 'Air', satuan: 'ml', harga: 0 }
    ];

    const overhead = [
      { owner_id, nama_overhead: 'Listrik', biaya_bulanan: 0 },
      { owner_id, nama_overhead: 'Sewa', biaya_bulanan: 0 },
      { owner_id, nama_overhead: 'Lain-lain', biaya_bulanan: 0 }
    ];


    const tenagaKerja = [
{ owner_id, nama: 'Barista', jabatan: 'Produksi', gaji: 0, role: 'Barista', rate_type: 'per_bulan', rate_amount: 0, jam_kerja_per_hari: 8, hari_kerja_per_bulan: 26 },
      { owner_id, nama: 'Kasir', jabatan: 'Operasional', gaji: 0, role: 'Kasir', rate_type: 'per_bulan', rate_amount: 0, jam_kerja_per_hari: 8, hari_kerja_per_bulan: 26 }
    ];

    // insert paralel
    const [bahanRes, overheadRes, tenagaRes] = await Promise.all([
      supabase.from('bahan').insert(bahan),
      supabase.from('overhead').insert(overhead),
      supabase.from('tenaga_kerja').insert(tenagaKerja)
    ]);

      if (bahanRes.error) throw new Error(`bahan gagal: ${bahanRes.error.message}`);
if (overheadRes.error) throw new Error(`overhead gagal: ${overheadRes.error.message}`);
if (tenagaRes.error) throw new Error(`tenaga kerja gagal: ${tenagaRes.error.message}`);


    res.json({ ok: true, msg: 'Setup awal selesai' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});



// GET /logs/overhead
app.get('/logs/overhead', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const { from, to } = getPaging(req);

    const { data, error } = await supabase
      .from('overhead_entries')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return next(error);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /logs/tenaga_kerja
app.get('/logs/tenaga_kerja', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const { from, to } = getPaging(req);

    const { data, error } = await supabase
      .from('tenaga_kerja_usage')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return next(error);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// STEP 1: Kerangka endpoint PROMO
const ALLOWED_PROMO_TYPES = new Set(['diskon','b1g1','tebus','bundling']);

app.post('/promo', async (req, res) => {
  try {
    const owner_id = req.headers['x-owner-id'];
    const { produk_id, type, options = {} } = req.body || {};


    if (!owner_id) return res.status(400).json({ ok:false, error: 'owner_id wajib' });
    if (!produk_id) return res.status(400).json({ ok:false, error: 'produk_id wajib' });
    if (!type || !ALLOWED_PROMO_TYPES.has(type)) {
      return res.status(400).json({ ok:false, error: 'type harus: diskon | b1g1 | tebus | bundling' });
    }

// --- STEP 2: Ambil data dasar dari view ---
const { data: baseData, error: baseErr } = await supabase
  .from('v_pricing_final')
  .select('hpp_per_porsi, harga_jual_user, harga_rekomendasi_standard')
  .eq('owner_id', owner_id)
  .eq('produk_id', produk_id)
  .single();

if (baseErr || !baseData) {
  return res.status(404).json({ ok:false, error: 'Data produk tidak ditemukan di v_pricing_final' });
}

// tentukan harga_awal
const harga_awal = baseData.harga_jual_user || baseData.harga_rekomendasi_standard;
const hpp_per_porsi = baseData.hpp_per_porsi;

// --- STEP 3: Hitung Diskon (type: diskon) ---
let calc = null;
let flag = null;
let notes = null;

if (type === 'diskon') {
  const { percent = 0, nominal = 0 } = options;

  // tentuin potongan
  let potongan = 0;
  if (percent > 0) potongan = harga_awal * (percent / 100);
  else if (nominal > 0) potongan = nominal;

  const harga_promo = Math.max(harga_awal - potongan, 0);

  // hitung margin
  const margin_promo = harga_promo > 0
    ? (harga_promo - hpp_per_porsi) / harga_promo
    : 0;

  // flag resiko
  if (margin_promo >= 0.25) {
    flag = 'aman';
    notes = 'Margin aman di atas 25%';
  } else if (margin_promo >= 0.15) {
    flag = 'tipis';
    notes = 'Margin tipis (15–25%)';
  } else {
    flag = 'bahaya';
    notes = 'Margin di bawah 15%, rawan tekor';
  }

  calc = {
    harga_promo,
    potongan,
    margin_promo,
    margin_delta: margin_promo - 0.25
  };
}

// --- BUY 1 GET 1 ---
else if (type === 'b1g1') {
  const { beli = 1, bonus = 1 } = options;
  const effective_price = harga_awal * (beli / (beli + bonus));

  const margin_promo = (effective_price - hpp_per_porsi) / effective_price;

  if (margin_promo >= 0.25) {
    flag = 'aman';
    notes = 'Margin aman di atas 25% meski promo B1G1.';
  } else if (margin_promo >= 0.15) {
    flag = 'tipis';
    notes = 'Margin tipis (15–25%) untuk B1G1.';
  } else {
    flag = 'bahaya';
    notes = 'Margin di bawah 15%, B1G1 ini rawan tekor.';
  }

  calc = {
    harga_promo: effective_price,
    potongan: harga_awal - effective_price,
    margin_promo,
    margin_delta: margin_promo - 0.25
  };
}

// --- TEBUS MURAH ---
else if (type === 'tebus') {
  const { min_qty = 2, tebus_price = 0 } = options;

  // harga rata-rata per item
  const total_qty = min_qty + 1;
  const total_price = (min_qty * harga_awal) + tebus_price;
  const effective_price = total_price / total_qty;

  const margin_promo = (effective_price - hpp_per_porsi) / effective_price;

  if (margin_promo >= 0.25) {
    flag = 'aman';
    notes = 'Tebus murah masih aman.';
  } else if (margin_promo >= 0.15) {
    flag = 'tipis';
    notes = 'Margin tipis di promo tebus murah.';
  } else {
    flag = 'bahaya';
    notes = 'Promo tebus murah rawan rugi.';
  }

  calc = {
    harga_promo: effective_price,
    margin_promo,
    margin_delta: margin_promo - 0.25
  };
}

// --- BUNDLING ---
else if (type === 'bundling') {
  const { items = [] } = options;
  if (!items.length) {
    return res.status(400).json({ ok: false, error: 'Daftar produk bundling kosong' });
  }

  // hitung total harga & total hpp
  const totalHarga = items.reduce((sum, i) => sum + (i.harga || 0) * (i.qty || 1), 0);
  const totalHPP = items.reduce((sum, i) => sum + (i.hpp || 0) * (i.qty || 1), 0);

  const margin_promo = (totalHarga - totalHPP) / totalHarga;

  if (margin_promo >= 0.25) {
    flag = 'aman';
    notes = 'Bundling margin aman.';
  } else if (margin_promo >= 0.15) {
    flag = 'tipis';
    notes = 'Bundling margin tipis.';
  } else {
    flag = 'bahaya';
    notes = 'Bundling margin rendah.';
  }

  calc = {
    totalHarga,
    totalHPP,
    margin_promo,
    margin_delta: margin_promo - 0.25
  };
}

// --- STEP LOGGING PROMO ---
const { data: logData, error: logErr } = await supabase
  .from('promo_logs')
  .insert([
    {
      owner_id,
      produk_id,
      type,
      options,
      calc,
      flag,
      notes
    }
  ])
  .select('*'); // biar bisa liat respon balik

if (logErr) {
  console.error('❌ Gagal insert promo_logs:', logErr);
} else {
  console.log('✅ Promo log berhasil masuk:', logData);
}


    // sementara: echo input buat bukti kerangka siap
return res.json({
  ok: true,
  type,
  input: { owner_id, produk_id, options },
  base: { hpp_per_porsi, harga_awal },
  calc,
  flag,
  notes
});


  } catch (err) {
    console.error('POST /promo error:', err);
    return res.status(500).json({ ok:false, error:'server_error' });
  }
});

// === GET /logs/promo ===
app.get('/logs/promo', async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req, res);
    if (!ownerId) return;

    const { from, to } = getPaging(req);

    const { data, error } = await supabase
      .from('v_promo_history')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return next(error);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

// === ROUTER SETUP ===
const setupRouter = require('./routes/setup');
app.use('/setup', setupRouter);

// === RESEP (BOM PRODUK) ===
const setupResepRouter = require('./routes/setup-resep');
app.use('/setup/resep', setupResepRouter);

// === RESEP DETAIL ===
const resepDetailRouter = require("./routes/resep-detail");
app.use("/resep/detail", resepDetailRouter);

// === LICENSE (SaaS) ===
const licenseRouter = require("./routes/license.js");
app.use("/license", licenseRouter);

// === WEBHOOK MAYAR ===
const webhookRouter = require("./routes/webhook");
app.use("/webhook", webhookRouter);


// === AI Suggest Proxy ===
const aiRouter = require('./routes/ai');
app.use('/ai', aiRouter);

// === INVENTORY ===
const inventoryRouter = require("./routes/inventory");
app.use("/inventory", inventoryRouter);

// === DASHBOARD ===
const dashboardRouter = require("./routes/dashboard");
app.use("/dashboard", dashboardRouter);

// --- PORT & GLOBAL ERROR HANDLER ---
const PORT = process.env.PORT || 4000;

// --- PRICING KE AI ---
const pricingRouter = require('./routes/pricing');
app.use('/pricing', pricingRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("ERR:", err);
  res.status(err.statusCode || 500).json({
    ok: false,
    error: err.message || "Internal Server Error",
  });
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});




