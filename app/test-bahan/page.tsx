"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Bahan = {
  id: string;
  nama_bahan: string | null;
  satuan: string | null;
  harga: number | null;
  owner: string | null;
  created_at: string;
};

export default function TestBahanPage() {
  /* =========================
   *  STATE — AUTH
   * ========================= */
  const [user, setUser] = useState<any>(null);
  const [showSession, setShowSession] = useState(false);

  /* =========================
   *  STATE — FETCH
   * ========================= */
  const [rows, setRows] = useState<Bahan[] | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [errFetch, setErrFetch] = useState<string | null>(null);

  /* =========================
   *  STATE — INSERT FORM
   * ========================= */
  const [nama_bahan, setNama] = useState("");
  const [satuan, setSatuan] = useState("gram");
  const [harga, setHarga] = useState<string>("");
  const [loadingInsert, setLoadingInsert] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  /* =========================
   *  EFFECT — AUTH SESSION
   * ========================= */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setRows(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* =========================
   *  HELPERS
   * ========================= */
  const flash = (text: string, type: "ok" | "err" = "ok") => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 2200);
  };

  const canSubmit = useMemo(() => {
    if (!nama_bahan.trim()) return false;
    if (!satuan.trim()) return false;
    if (harga === "") return false;
    if (Number.isNaN(Number(harga))) return false;
    return true;
  }, [nama_bahan, satuan, harga]);

  /* =========================
   *  ACTIONS
   * ========================= */
  const fetchBahan = async () => {
    setLoadingFetch(true);
    setErrFetch(null);
    const { data, error } = await supabase
      .from("bahan")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) setErrFetch(error.message);
    setRows(data ?? null);
    setLoadingFetch(false);
  };

  const onInsert = async () => {
    if (!canSubmit) {
      flash("Isi nama, satuan, dan harga yang valid.", "err");
      return;
    }
    setLoadingInsert(true);
    try {
      const hargaNumber = Number(harga);

      const { error } = await supabase
        .from("bahan")
        .insert({
          // owner & created_at otomatis oleh Supabase (default/RLS)
          nama_bahan: nama_bahan.trim(),
          satuan: satuan.trim(),
          harga: hargaNumber,
        })
        .single();

      if (error) {
        flash(error.message, "err");
        return;
      }
      flash("Insert OK", "ok");
      setNama("");
      setSatuan("gram");
      setHarga("");
      await fetchBahan();
    } finally {
      setLoadingInsert(false);
    }
  };

  /* =========================
   *  UI
   * ========================= */
  return (
    <div style={{ maxWidth: 980, margin: "32px auto", padding: "0 12px", fontFamily: "ui-sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Test RLS — Tabel bahan</h1>
        <div style={{ marginLeft: "auto", opacity: 0.85 }}>
          {user?.email ? <>Masuk sebagai <b>{user.email}</b></> : "Belum login"}
        </div>
      </header>

      <p style={{ opacity: 0.75, marginTop: 0, marginBottom: 12 }}>
        Login dulu di <code>/login</code>, lalu klik tombol Fetch atau tambah data lewat form di bawah.
      </p>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <button
          onClick={fetchBahan}
          disabled={loadingFetch}
          style={btn}
          title="Ambil 20 data terbaru untuk user ini"
        >
          {loadingFetch ? "Loading..." : "Fetch bahan (limit 20)"}
        </button>
        <button
          onClick={() => setShowSession((s) => !s)}
          style={btnGhost}
          title="Tampilkan/sembunyikan detail session"
        >
          {showSession ? "Hide session" : "Show session"}
        </button>
        {errFetch && <span style={{ color: "crimson" }}>Error: {errFetch}</span>}
        {notice && (
          <span style={{ color: notice.type === "ok" ? "green" : "crimson" }}>
            {notice.text}
          </span>
        )}
      </div>

      {/* Session (ringkas + collapsible) */}
      {showSession && (
        <div style={box}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>User session (detail)</div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12 }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      )}

      {/* Insert form */}
      <section style={card}>
        <h2 style={h2}>Insert bahan</h2>
        <div style={{ display: "grid", gap: 10, maxWidth: 440 }}>
          <input
            placeholder="Nama bahan"
            value={nama_bahan}
            onChange={(e) => setNama(e.target.value)}
            style={input}
          />
          <input
            placeholder="Satuan (mis. gram/ml)"
            value={satuan}
            onChange={(e) => setSatuan(e.target.value)}
            style={input}
          />
          <input
            placeholder="Harga (angka)"
            type="number"
            value={harga}
            onChange={(e) => setHarga(e.target.value)}
            style={input}
          />
          <button onClick={onInsert} disabled={loadingInsert || !canSubmit} style={btn}>
            {loadingInsert ? "Menyimpan..." : "Insert bahan"}
          </button>
        </div>
      </section>

      {/* Rows */}
      <section style={card}>
        <h2 style={h2}>Rows</h2>
        {!rows?.length ? (
          <p style={{ opacity: 0.75, margin: 0 }}>Belum ada data untuk user ini.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>created_at</th>
                  <th style={th}>nama_bahan</th>
                  <th style={th}>satuan</th>
                  <th style={th}>harga</th>
                  <th style={th}>id</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                    <td style={td}>{r.nama_bahan}</td>
                    <td style={td}>{r.satuan}</td>
                    <td style={td}>{r.harga}</td>
                    <td style={td}>{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* =========================
 *  STYLES
 * ========================= */
const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btn,
  background: "#f8f8f8",
};

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #ddd",
  borderRadius: 10,
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
  background: "#fff",
};

const box: React.CSSProperties = {
  border: "1px dashed #ddd",
  borderRadius: 12,
  padding: 12,
  marginBottom: 16,
  background: "#fafafa",
};

const h2: React.CSSProperties = { fontWeight: 700, fontSize: 18, margin: "0 0 8px" };

const table: React.CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: 14,
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f3f3f3",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};
