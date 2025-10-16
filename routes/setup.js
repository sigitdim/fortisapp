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
  const ownerId = req.headers['x-owner-id'];
  if (!ownerId) {
    return res.status(400).json({ ok: false, error: 'x-owner-id wajib' });
  }
  req.ownerId = ownerId;
  next();
}

/**
 * GET /setup/bahan
 * ambil daftar bahan milik owner
 */
router.get('/bahan', requireOwner, async (req, res) => {
  const { data, error } = await supabase
    .from('bahan')
    .select('*')
    .eq('owner_id', req.ownerId)
    .order('created_at', { ascending: false });

  if (error)
    return res.status(500).json({ ok: false, error: error.message });

  res.json({ ok: true, count: data?.length || 0, data });
});

/**
 * POST /setup/bahan
 * body: { nama, satuan, harga, stok_awal?, keterangan? }
 */
router.post('/bahan', requireOwner, async (req, res) => {
  const { nama, satuan, harga, stok_awal = 0, keterangan = null } = req.body || {};

  if (!nama || !satuan || typeof harga !== 'number') {
    return res.status(400).json({
      ok: false,
      error: 'Param wajib: nama(string), satuan(string), harga(number)',
    });
  }

const payload = {
  nama_bahan: nama,
  satuan,
  harga,
  owner_id: req.ownerId,
};

  const { data, error } = await supabase
    .from('bahan')
    .insert(payload)
    .select()
    .single();

  if (error)
    return res.status(500).json({ ok: false, error: error.message });

  res.status(201).json({ ok: true, data });
});

/**
 * GET /setup/overhead
 */
router.get('/overhead', requireOwner, async (req, res) => {
  const { data, error } = await supabase
    .from('overhead')
    .select('*')
    .eq('owner_id', req.ownerId)
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
  owner_id: req.ownerId
};

  const { data, error } = await supabase
    .from('overhead')
    .insert(payload)
    .select()
    .single();

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.status(201).json({ ok:true, data });
});

/**
 * GET /setup/tenaga_kerja
 */
router.get('/tenaga_kerja', requireOwner, async (req, res) => {
  const { data, error } = await supabase
    .from('tenaga_kerja')
    .select('*')
    .eq('owner_id', req.ownerId)
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
    owner_id: req.ownerId
  };

  const { data, error } = await supabase
    .from('tenaga_kerja')
    .insert(payload)
    .select()
    .single();

  if (error) return res.status(500).json({ ok:false, error: error.message });
  res.status(201).json({ ok:true, data });
});

module.exports = router;
