const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ===============================
// POST /inventory/in (FINAL + saldo_after)
// ===============================
router.post("/in", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id) return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { bahan_id, qty, catatan } = req.body || {};
    if (!bahan_id || qty === undefined) {
      return res.status(400).json({ ok: false, message: "bahan_id dan qty wajib diisi" });
    }
    if (Number(qty) <= 0) {
      return res.status(400).json({ ok: false, message: "qty harus > 0" });
    }

    // cek bahan valid
    const { data: bahan, error: cekErr } = await supabase
      .from("bahan")
      .select("id")
      .eq("id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (!bahan) return res.json({ ok: false, message: "bahan_id tidak valid" });

    // 1️⃣ insert log stok baru
    const { data: inserted, error: err1 } = await supabase
      .from("stok_logs")
      .insert({
        owner_id,
        bahan_id,
        qty,
        tipe: "in",
        catatan,
      })
      .select("id")
      .single();
    if (err1) return res.json({ ok: false, message: err1.message });

    // 2️⃣ ambil saldo setelah transaksi
    const { data: saldoData, error: saldoErr } = await supabase
      .from("v_inventory_balance")
      .select("saldo")
      .eq("bahan_id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (saldoErr) console.warn("Warning saldo_after:", saldoErr.message);

    const saldo_after = saldoData?.saldo || 0;

    // 3️⃣ update view balance (kalau masih dipakai)
    const { error: err2 } = await supabase.rpc("update_inventory_balance", {
      p_owner: owner_id,
      p_bahan: bahan_id,
      p_qty: Math.abs(qty),
    });
    if (err2) return res.json({ ok: false, message: err2.message });

    // 4️⃣ return hasil lengkap
    return res.json({
      ok: true,
      data: {
        id: inserted.id,
        bahan_id,
        qty,
        saldo_after,
      },
    });
  } catch (e) {
    console.error("POST /inventory/in error:", e);
    res.json({ ok: false, message: e.message });
  }
});

// ===============================
// POST /inventory/out (FINAL + saldo_after)
// ===============================
router.post("/out", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id) return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { bahan_id, qty, catatan } = req.body || {};
    if (!bahan_id || qty === undefined) {
      return res.status(400).json({ ok: false, message: "bahan_id dan qty wajib diisi" });
    }
    if (Number(qty) <= 0) {
      return res.status(400).json({ ok: false, message: "qty harus > 0" });
    }

    // 1️⃣ validasi bahan
    const { data: bahan, error: cekErr } = await supabase
      .from("bahan")
      .select("id")
      .eq("id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (!bahan) return res.json({ ok: false, message: "bahan_id tidak valid" });

    // 2️⃣ insert log
    const { data: inserted, error: err1 } = await supabase
      .from("stok_logs")
      .insert({
        owner_id,
        bahan_id,
        qty,
        tipe: "out",
        catatan,
      })
      .select("id")
      .single();
    if (err1) return res.json({ ok: false, message: err1.message });

    // 3️⃣ update saldo
    const { error: err2 } = await supabase.rpc("update_inventory_balance", {
      p_owner: owner_id,
      p_bahan: bahan_id,
      p_qty: -Math.abs(qty),
    });
    if (err2) return res.json({ ok: false, message: err2.message });

    // 4️⃣ ambil saldo setelah transaksi
    const { data: saldoData, error: saldoErr } = await supabase
      .from("v_inventory_balance")
      .select("saldo")
      .eq("bahan_id", bahan_id)
      .eq("owner_id", owner_id)
      .single();
    if (saldoErr) console.warn("Warning saldo_after:", saldoErr.message);

    const saldo_after = saldoData?.saldo || 0;

    // 5️⃣ return hasil
    return res.json({
      ok: true,
      data: {
        id: inserted.id,
        bahan_id,
        qty,
        saldo_after,
      },
    });
  } catch (e) {
    console.error("POST /inventory/out error:", e);
    res.json({ ok: false, message: e.message });
  }
});

// ===============================
// GET /inventory/summary (pakai view v_inventory_summary)
// ===============================
router.get("/summary", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res
        .status(400)
        .json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { data, error } = await supabase
      .from("v_inventory_summary")
      .select("bahan_id, nama_bahan, satuan, stok_total, status")
      .eq("owner_id", owner_id)
      .order("nama_bahan", { ascending: true });

    if (error) throw error;

    // Cache Browser 5 Detik
    res.set("Cache-Control", "max-age=5");

    res.json({ ok: true, data });
  } catch (e) {
    console.error("Error /inventory/summary:", e);
    res.json({ ok: false, message: e.message });
  }
});

// ===============================
// GET /inventory/history
// ===============================
router.get("/history", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });

    const { limit = 50, bahan_id, type, since, until, cursor } = req.query;

    // batasin limit biar aman
    const safeLimit = Math.min(parseInt(limit) || 50, 500);

    // parse cursor jadi created_at dan id
    let cursorCreatedAt = null;
    let cursorId = null;

    if (cursor) {
      const parts = String(cursor).split("|");
      if (parts.length === 2) {
        cursorCreatedAt = parts[0];
        cursorId = parts[1];
      }
    }

    // 1️⃣ ambil log stok dari tabel stok_logs
    let logQuery = supabase
      .from("stok_logs")
      .select("id, created_at, bahan_id, qty, tipe, catatan, is_void, void_of")
      .eq("owner_id", owner_id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit);

    // kalau ada cursor, ambil data yang lebih lama dari cursor
    if (cursorCreatedAt && cursorId) {
      logQuery = logQuery.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }

    // filter opsional
    if (bahan_id) logQuery = logQuery.eq("bahan_id", bahan_id);
    if (type) logQuery = logQuery.eq("tipe", String(type).toLowerCase());
    if (since) logQuery = logQuery.gte("created_at", since);
    if (until) logQuery = logQuery.lte("created_at", until);
    if (req.query.is_void !== undefined) {
      const isVoidBool = String(req.query.is_void).toLowerCase() === "true";
      logQuery = logQuery.eq("is_void", isVoidBool);
    }

    const { data: logRows, error: logErr } = await logQuery;
    if (logErr) throw logErr;

    // 2️⃣ ambil nama bahan dari tabel bahan
    const bahanIds = [...new Set((logRows || []).map((r) => r.bahan_id))];

    const { data: bahanRows, error: bahanErr } = await supabase
      .from("bahan")
      .select("id, nama_bahan, satuan")
      .eq("owner_id", owner_id)
      .in("id", bahanIds);

    if (bahanErr) throw bahanErr;

    const bahanMap = {};
    for (const b of bahanRows || []) {
      bahanMap[b.id] = b;
    }

    // 3️⃣ gabung hasil log + bahan + saldo_before/after
    const result = [];
    const saldoMap = {}; // simpan saldo berjalan per bahan_id

    // urutkan log dari paling lama supaya perhitungan saldo benar
    const sortedLogs = [...(logRows || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    for (const row of sortedLogs) {
      const meta = bahanMap[row.bahan_id] || {};
      const saldoBefore = saldoMap[row.bahan_id] || 0;
      const perubahan =
        row.tipe === "in" ? Number(row.qty) : -Number(row.qty);
      const saldoAfter = saldoBefore + perubahan;

      result.push({
        id: row.id,
        created_at: row.created_at,
        bahan_id: row.bahan_id,
        bahan_nama: meta.nama_bahan || null,
        satuan: meta.satuan || null,
        qty: Number(row.qty) || null,
        tipe: row.tipe,
        catatan: row.catatan || null,
        is_void: row.is_void,
        void_of: row.void_of,
        saldo_before: saldoBefore,
        saldo_after: saldoAfter,
      });

      // update saldo terakhir bahan ini
      saldoMap[row.bahan_id] = saldoAfter;
    }

    // balik lagi urutannya ke DESC biar tampilan FE tetap seperti sebelumnya
    result.reverse();

    // buat next_cursor untuk pagination
    let next_cursor = null;
    if (logRows && logRows.length > 0) {
      const last = logRows[logRows.length - 1];
      next_cursor = `${last.created_at}|${last.id}`;
    }

    // Cache 5 Detik
    res.set("Cache-Control", "max-age=5");

    // kirim hasil akhir ke FE
    return res.json({
      ok: true,
      data: result,
      next_cursor,
    });
  } catch (err) {
    console.error("GET /inventory/history error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ===============================
// GET /inventory/stock-logs
// ===============================
router.get("/stock-logs", async (req, res) => {
  try {
    const owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });

    const { limit = 50, bahan_id, type, since, until, cursor } = req.query;
    const safeLimit = Math.min(parseInt(limit) || 50, 500);

    // parse cursor (pagination)
    let cursorCreatedAt = null;
    let cursorId = null;
    if (cursor) {
      const parts = String(cursor).split("|");
      if (parts.length === 2) {
        cursorCreatedAt = parts[0];
        cursorId = parts[1];
      }
    }

    // ambil data log stok
    let logQuery = supabase
      .from("stok_logs")
      .select("id, created_at, bahan_id, qty, tipe, catatan, is_void, void_of")
      .eq("owner_id", owner_id)
      .eq("is_void", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(safeLimit);

    if (cursorCreatedAt && cursorId) {
      logQuery = logQuery.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }

    if (bahan_id) logQuery = logQuery.eq("bahan_id", bahan_id);
    if (type) logQuery = logQuery.eq("tipe", String(type).toLowerCase());
    if (since) logQuery = logQuery.gte("created_at", since);
    if (until) logQuery = logQuery.lte("created_at", until);

    const { data: logRows, error: logErr } = await logQuery;
    if (logErr) throw logErr;

    // ambil data bahan
    const bahanIds = [...new Set((logRows || []).map((r) => r.bahan_id))];
    const { data: bahanRows, error: bahanErr } = await supabase
      .from("bahan")
      .select("id, nama_bahan, satuan")
      .eq("owner_id", owner_id)
      .in("id", bahanIds);

    if (bahanErr) throw bahanErr;

    const bahanMap = {};
    for (const b of bahanRows || []) bahanMap[b.id] = b;

    // gabungkan & hitung saldo berjalan
    const result = [];
    const saldoMap = {};
    const sortedLogs = [...(logRows || [])].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    for (const row of sortedLogs) {
      const meta = bahanMap[row.bahan_id] || {};
      const saldoBefore = saldoMap[row.bahan_id] || 0;
      const perubahan = row.tipe === "in" ? Number(row.qty) : -Number(row.qty);
      const saldoAfter = saldoBefore + perubahan;

      result.push({
        id: row.id,
        created_at: row.created_at,
        bahan_id: row.bahan_id,
        bahan_nama: meta.nama_bahan || null,
        satuan: meta.satuan || null,
        qty: Number(row.qty) || null,
        tipe: row.tipe,
        catatan: row.catatan || null,
        saldo_before: saldoBefore,
        saldo_after: saldoAfter,
      });

      saldoMap[row.bahan_id] = saldoAfter;
    }

    result.reverse();

    let next_cursor = null;
    if (logRows && logRows.length > 0) {
      const last = logRows[logRows.length - 1];
      next_cursor = `${last.created_at}|${last.id}`;
    }

    return res.json({ ok: true, data: result, next_cursor });
  } catch (err) {
    console.error("GET /inventory/stock-logs error:", err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});


// === VOID satu transaksi stok ===
router.post("/void", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { id, reason } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, message: "id wajib" });

    const { data, error } = await supabase.rpc("inventory_void_cascade", {
      p_owner: owner_id,
      p_id: id,
      p_reason: reason || null,
    });

    if (error) {
      const msg = error.message || "void gagal";
      if (/tidak ditemukan/i.test(msg))
        return res.status(404).json({ ok: false, message: msg });
      if (/sudah di-void/i.test(msg))
        return res.status(409).json({ ok: false, message: msg });
      if (/wajib/i.test(msg))
        return res.status(400).json({ ok: false, message: msg });
      return res.status(422).json({ ok: false, message: msg });
    }

    // === Tambah audit log ke hpp_logs_new ===
    try {
      const bahan_id = data?.[0]?.bahan_id || null;
      const cause_text = `VOID CASCADE (${id})`;

      await supabase.rpc("log_hpp_change", {
        p_owner: owner_id,
        p_produk: null, // sementara kosong
        p_old: 0,
        p_new: 0,
        p_cause: cause_text,
        p_bahan: bahan_id,
      });
    } catch (logErr) {
      console.warn("Audit log gagal ditulis:", logErr.message);
      // tidak fatal, jadi tidak menggagalkan transaksi utama
    }

    return res.json({ ok: true, data: data?.[0] || null });
  } catch (err) {
    console.error("POST /inventory/void error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});

// === ADJUST stok manual ===
router.post("/adjust", async (req, res) => {
  try {
    let owner_id = req.headers["x-owner-id"];
    if (!owner_id)
      return res.status(400).json({ ok: false, message: "x-owner-id wajib dikirim" });
    owner_id = owner_id.replace(/["\\]/g, "").trim();

    const { bahan_id, qty, catatan } = req.body || {};
    if (!bahan_id || qty === undefined)
      return res.status(400).json({ ok: false, message: "bahan_id dan qty wajib" });

    // panggil RPC Supabase (nanti kita bikin di step 2)
    const { data, error } = await supabase.rpc("inventory_adjust", {
      p_owner: owner_id,
      p_bahan_id: bahan_id,
      p_qty: qty,
      p_catatan: catatan || null,
    });

    if (error) {
      const msg = error.message || "adjust gagal";
      if (/tidak ditemukan/i.test(msg))
        return res.status(404).json({ ok: false, message: msg });
      if (/qty/i.test(msg))
        return res.status(400).json({ ok: false, message: msg });
      return res.status(422).json({ ok: false, message: msg });
    }

    return res.json({ ok: true, data: data?.[0] || null });
  } catch (err) {
    console.error("POST /inventory/adjust error:", err);
    return res.status(500).json({ ok: false, message: "server error" });
  }
});


module.exports = router;

