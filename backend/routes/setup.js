const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Middleware: pastiin owner_id dikirim
function requireOwner(req, res, next) {
  const ownerId = req.headers["x-owner-id"];
  if (!ownerId) {
    return res.status(400).json({ ok: false, error: "x-owner-id required" });
  }
  req.owner_id = ownerId; // ✅ samain dengan yang dipakai di semua router lain
  next();
}


// === GET /setup/bahan ===
router.get("/bahan", requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bahan")
      .select("*")
      .eq("owner_id", req.owner_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /setup/bahan
 * body: { id?, nama, satuan, harga }
 * - Kalau ada id → update
 * - Kalau tidak ada id → insert baru
 */
router.post('/bahan', requireOwner, async (req, res) => {
  try {
    const { id, nama, satuan, harga } = req.body || {};
    const owner_id = req.owner_id;

    if (!nama || !satuan || typeof harga !== "number") {
      return res.status(400).json({
        ok: false,
        error: "Param wajib: nama(string), satuan(string), harga(number)",
      });
    }

    // === UPDATE MODE ===
    if (id) {
      const { data, error } = await supabase
        .from("bahan")
        .update({
          nama_bahan: nama,
          satuan,
          harga,
        })
        .eq("id", id)
        .eq("owner_id", owner_id)
        .select();

      if (error)
        return res.status(500).json({ ok: false, error: error.message });

      return res.json({
        ok: true,
        mode: "update",
        data: {
          id: data.id,
          nama: data.nama_bahan,
          satuan: data.satuan,
          harga_per_satuan: data.harga,
        },
      });
    }

    // === CREATE MODE ===
    const payload = {
      nama_bahan: nama,
      satuan,
      harga,
      owner_id,
    };

    const { data, error } = await supabase
      .from("bahan")
      .insert(payload)
      .select()
      .single();

    if (error)
      return res.status(500).json({ ok: false, error: error.message });

    res.status(201).json({
      ok: true,
      mode: "create",
      data: {
        id: data.id,
        nama: data.nama_bahan,
        satuan: data.satuan,
        harga_per_satuan: data.harga,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /setup/overhead
 */
router.get('/overhead', requireOwner, async (req, res) => {
  const { data, error } = await supabase
    .from('overhead')
    .select('*')
    .eq('owner_id', req.owner_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.json({ ok:true, count: data?.length || 0, data });
});

/**
 * POST /setup/overhead
 * body: { nama, biaya }
 */
router.post('/overhead', requireOwner, async (req, res) => {
  const { nama, biaya } = req.body || {};
  if (!nama || typeof biaya !== 'number') {
    return res.status(400).json({ ok:false, error:'Param wajib: nama(string), biaya(number)' });
  }

const payload = {
  nama_overhead: nama,
  biaya_bulanan: biaya,
  owner_id: req.owner_id
};

  const { data, error } = await supabase
    .from('overhead')
    .insert(payload)
    .select()
    .single();

if (error)
  return res.status(500).json({ ok: false, error: error.message });

res.status(201).json({
  ok: true,
  data: {
    id: data.id,
    nama: data.nama_overhead,
    nominal: data.biaya_bulanan
  }
});
});

/**
 * GET /setup/tenaga_kerja
 */
router.get('/tenaga_kerja', requireOwner, async (req, res) => {
  const { data, error } = await supabase
    .from('tenaga_kerja')
    .select('*')
    .eq('owner_id', req.owner_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.json({ ok:true, count: data?.length || 0, data });
});

/**
 * POST /setup/tenaga_kerja
 * body: { nama, gaji_bulanan }
 */
router.post('/tenaga_kerja', requireOwner, async (req, res) => {
  const { nama, jabatan = 'Operasional', gaji_bulanan } = req.body || {};
  if (!nama || typeof gaji_bulanan !== 'number') {
    return res.status(400).json({ ok:false, error:'Param wajib: nama(string), gaji_bulanan(number)' });
  }

  const payload = {
    nama,
    jabatan,
    gaji: gaji_bulanan,
    rate_type: 'per_bulan',
    rate_amount: gaji_bulanan,
    jam_kerja_per_hari: 8,
    hari_kerja_per_bulan: 26,
    owner_id: req.owner_id
  };

  const { data, error } = await supabase
    .from('tenaga_kerja')
    .insert(payload)
    .select()
    .single();

if (error)
  return res.status(500).json({ ok: false, error: error.message });

res.status(201).json({
  ok: true,
  data: {
    id: data.id,
    nama: data.nama,
    jabatan: data.jabatan,
    gaji_bulanan: data.gaji,
    rate_per_menit: data.rate_amount
  }
});
});

// POST /setup/bahan/delete  { id }
router.post('/bahan/delete', requireOwner, async (req, res) => {
  try {
    const { id } = req.body;
    const { owner_id } = req;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });

    const { data, error } = await supabase
      .from('bahan')
      .delete()
      .eq('id', id)
      .eq('owner_id', owner_id)
      .select(); // jangan .single()

    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true, deleted: data?.length || 0, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /setup/overhead/delete  { id }
router.post('/overhead/delete', requireOwner, async (req, res) => {
  try {
    const { id } = req.body;
    const { owner_id } = req;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });

    const { data, error } = await supabase
      .from('overhead')
      .delete()
      .eq('id', id)
      .eq('owner_id', owner_id)
      .select();

    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true, deleted: data?.length || 0, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /setup/tenaga_kerja/delete  { id }
router.post('/tenaga_kerja/delete', requireOwner, async (req, res) => {
  try {
    const { id } = req.body;
    const { owner_id } = req;
    if (!id) return res.status(400).json({ ok: false, error: 'id required' });

    const { data, error } = await supabase
      .from('tenaga_kerja')
      .delete()
      .eq('id', id)
      .eq('owner_id', owner_id)
      .select();

    if (error) return res.status(400).json({ ok: false, error: error.message });
    return res.json({ ok: true, deleted: data?.length || 0, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// UPDATE overhead
router.put('/overhead/:id', requireOwner, async (req, res) => {
  const { id } = req.params;
  const { nama, biaya } = req.body || {};

  const payload = {};
  if (nama) payload.nama_overhead = nama;
  if (biaya !== undefined) payload.biaya_bulanan = biaya;

  const { data, error } = await supabase
    .from('overhead')
    .update(payload)
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select(); 

  if (error) return res.status(500).json({ ok: false, error: error.message });
  res.json({ ok: true, data });
});

// DELETE overhead
router.delete('/overhead/:id', requireOwner, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('overhead')
    .delete()
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select();

  if (error) return res.status(500).json({ ok:false, error:error.message });
  res.json({ ok:true, data });
});

// UPDATE tenaga_kerja
router.put('/tenaga_kerja/:id', requireOwner, async (req, res) => {
  const { id } = req.params;
  const { nama, jabatan, gaji_bulanan } = req.body || {};

  const payload = {};
  if (nama) payload.nama = String(nama).trim();
  if (jabatan !== undefined) payload.jabatan = String(jabatan || '').trim();
  if (gaji_bulanan !== undefined) {
    const n = Number(gaji_bulanan);
    if (Number.isNaN(n) || n < 0) return res.status(400).json({ ok:false, error:'gaji_bulanan harus angka >= 0' });
    payload.gaji = n;
    payload.rate_amount = n; // biar konsisten sama insert
  }

  const { data, error } = await supabase
    .from('tenaga_kerja')
    .update(payload)
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select();

  if (error) return res.status(500).json({ ok:false, error:error.message });
  res.json({ ok:true, data });
});

// DELETE tenaga_kerja
router.delete('/tenaga_kerja/:id', requireOwner, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('tenaga_kerja')
    .delete()
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select();

  if (error) return res.status(500).json({ ok:false, error:error.message });
  res.json({ ok:true, data });
});

// UPDATE bahan
router.put('/bahan/:id', requireOwner, async (req, res) => {
  const { id } = req.params;
  const { nama, satuan, harga } = req.body || {};

  const payload = {};
  if (nama) payload.nama_bahan = String(nama).trim();
  if (satuan !== undefined) payload.satuan = String(satuan).trim();
  if (harga !== undefined) {
    const n = Number(harga);
    if (Number.isNaN(n) || n < 0) return res.status(400).json({ ok:false, error:'harga harus angka >= 0' });
    payload.harga = n;
  }

  const { data, error } = await supabase
    .from('bahan')
    .update(payload)
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select();

  if (error) return res.status(500).json({ ok:false, error:error.message });
  res.json({ ok:true, data });
});

// DELETE bahan
router.delete('/bahan/:id', requireOwner, async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('bahan')
    .delete()
    .eq('id', id)
    .eq('owner_id', req.owner_id)
    .select();

  if (error) return res.status(500).json({ ok:false, error:error.message });
  res.json({ ok:true, data });
});

// === GET /setup/produk ===
router.get("/produk", requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("produk")
      .select("id, nama_produk, kategori, harga_jual")
      .eq("owner_id", req.owner_id);

    if (error) throw error;
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// === Bill of Materials ===
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function normalizeUuid(v) {
  if (v == null) return null;
  let s = String(v).trim();
  s = s.replace(/\\+/g, '');
  if (/^".*"$/.test(s)) {
    try { s = JSON.parse(s); } catch (_) {}
  }
  s = s.replace(/[^0-9a-fA-F-]/g, '');
  if (!UUID_RE.test(s)) return null;
  return s.toLowerCase();
}

router.post('/bom', requireOwner, async (req, res) => {
  try {
    const { owner_id } = req;
    const { produk, items } = req.body || {};

    if (!produk) return res.status(400).json({ ok: false, error: 'produk required' });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ ok: false, error: 'items[] required' });

    // cari atau buat produk
    let produk_id;
    const { data: existing } = await supabase
      .from('produk')
      .select('id')
      .eq('nama_produk', produk)
      .eq('owner_id', owner_id)
      .maybeSingle();

    if (existing) {
      produk_id = existing.id;
    } else {
      const { data: newProd, error: errProd } = await supabase
        .from('produk')
        .insert({ nama_produk: produk, owner_id })
        .select()
        .single();
      if (errProd) throw errProd;
      produk_id = newProd.id;
    }

    // debug
    console.log('[BOM] produk_id:', produk_id);
    console.log('[BOM] raw bahan_id:', items.map(i => i?.bahan_id));

    const rows = items.map((it, idx) => {
      const cleanBahanId = normalizeUuid(it?.bahan_id);
      if (!cleanBahanId) {
        throw new Error(`items[${idx}].bahan_id invalid UUID`);
      }
      return {
        produk_id,
        bahan_id: cleanBahanId,
        qty: Number(it?.qty || 0),
        unit: (it?.satuan || it?.unit || '').trim(),
        subtotal: Number(it?.subtotal || 0),
        owner_id
      };
    });

    console.log('[BOM] normalized rows:', rows);

    // hapus komposisi lama
    await supabase.from('komposisi').delete().eq('produk_id', produk_id);

    // insert komposisi baru
    const { error: insertErr } = await supabase
      .from('komposisi')
      .insert(rows);

    if (insertErr) throw insertErr;

    return res.json({ ok: true, mode: 'saved', produk_id, owner_id, inserted: rows.length });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;

