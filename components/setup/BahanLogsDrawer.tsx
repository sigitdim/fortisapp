"use client";
import { useEffect, useMemo, useState } from "react";
import { setupUpsert, setupUpdateById } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type Props = {
  open: boolean;
  onClose: ()=>void;
  id?: string;
  nama?: string;
  currentHarga?: number;
};

type LogItem = { tanggal: string; harga: number };
type Attempt = { url: string; ok: boolean; status?: number; message?: string };

const LOGS_OVERRIDE = (process.env.NEXT_PUBLIC_LOGS_BAHAN_PATH || "").trim(); 
// Contoh nilai: "/logs/bahan/:id" atau "/bahan_logs?bahan_id=:id"

async function fetchJSON(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { ...(init?.headers||{}), "x-owner-id": (process.env.NEXT_PUBLIC_OWNER_ID ?? "") }});
  if (!res.ok) throw Object.assign(new Error(await res.text().catch(()=>res.statusText)), { status: res.status });
  return res.json();
}

function fillPathWithId(path: string, id: string) {
  // dukung :id dan {id}
  return path.replace(/:id|\{id\}/g, encodeURIComponent(id));
}

/** Coba beberapa jalur endpoint logs, ambil yang berhasil duluan */
async function getBahanLogs(id: string, attempts: Attempt[]): Promise<LogItem[]> {
  const list: string[] = [];

  if (LOGS_OVERRIDE) {
    const p = fillPathWithId(LOGS_OVERRIDE, id);
    list.push(`/api${p.startsWith("/") ? p : `/${p}`}`);
  }

  // kandidat default
  list.push(
    `/api/logs/bahan?id=${encodeURIComponent(id)}`,
    `/api/logs/bahan/${encodeURIComponent(id)}`,
    `/api/setup/bahan/${encodeURIComponent(id)}/logs`,
    `/api/bahan_logs?bahan_id=${encodeURIComponent(id)}`
  );

  let raw: any = null;
  for (const url of list) {
    try {
      const json = await fetchJSON(url);
      raw = json;
      attempts.push({ url, ok: true, status: 200 });
      break;
    } catch (e: any) {
      attempts.push({ url, ok: false, status: e?.status, message: e?.message || String(e) });
    }
  }
  if (!raw) throw new Error("Tidak ada endpoint logs yang mengembalikan data");

  const data = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
  const toDate = (v:any)=>{
    const s = (v?.tanggal ?? v?.created_at ?? v?.date ?? v?.waktu ?? v)?.toString?.() ?? "";
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toISOString().slice(0,10);
  };
  const toHarga = (v:any)=>{
    const h = v?.harga ?? v?.new_harga ?? v?.value ?? v?.amount ?? v?.price;
    return Number(h ?? 0);
  };
  const mapped: LogItem[] = data.map((v:any)=>({ tanggal: toDate(v), harga: toHarga(v) }))
                                .filter((x: any) => !!x.tanggal && !Number.isNaN(x.harga));
  mapped.sort((a,b)=> (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0));
  return mapped;
}

export default function BahanLogsDrawer({ open, onClose, id, nama, currentHarga }: Props){
  const [price, setPrice] = useState<string>(currentHarga!=null? String(currentHarga): "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [diag, setDiag] = useState<Attempt[]>([]);

  useEffect(()=>{ setPrice(currentHarga!=null? String(currentHarga): ""); },[currentHarga]);
  useEffect(()=>{
    if(!open || !id) return;
    (async()=>{
      setErr(null); setWarn(null); setLoading(true); setDiag([]);
      try{
        const attempts: Attempt[] = [];
        const l = await getBahanLogs(id, attempts);
        setLogs(l);
        setDiag(attempts);
        if(!l.length) setWarn("Belum ada data log.");
      }catch(e:any){
        setWarn("Logs belum bisa dimuat dari server. Fitur update harga tetap bisa dipakai.");
      }finally{ setLoading(false); }
    })();
  },[open, id]);

  const chartData = useMemo(()=> logs.map(x=>({ date: x.tanggal, harga: x.harga })),[logs]);

  const submit = async()=>{
    if(!id) return;
    setErr(null); setSaving(true);
    try{
      const payload:any = { harga: Number(price||0) };
      // PUT → fallback POST upsert
      let ok = false; let lastErr = "";
      try{
        const r1 = await setupUpdateById("bahan", id, payload);
        ok = !!r1?.ok; lastErr = (r1 as any)?.error || lastErr;
      }catch{ ok = false; }
      if(!ok){
        const r2 = await setupUpsert("bahan", { id, ...payload });
        ok = !!r2?.ok; lastErr = (r2 as any)?.error || lastErr;
      }
      if(!ok) throw new Error(lastErr || "Gagal memperbarui harga");

      // refresh logs setelah update
      try{
        const attempts: Attempt[] = [];
        const l = await getBahanLogs(id, attempts);
        setLogs(l);
        setDiag(attempts);
        if (l.length) setWarn(null);
      }catch{}
    }catch(e:any){
      setErr(e?.message || "Request failed");
    }finally{
      setSaving(false);
    }
  };

  if(!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30">
      <div className="w-full max-w-[520px] h-screen bg-white shadow-xl p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold">Logs Bahan</h3>
            <div className="text-gray-600">{nama ?? "-"}</div>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg border hover:bg-gray-50">Close</button>
        </div>

        {warn && <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 p-3">{warn}</div>}
        {err  && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 text-red-700 p-3">{err}</div>}

        {/* Diagnostic attempts */}
        {(!logs.length) && (
          <details className="mb-4 rounded-lg border p-3 text-sm text-gray-700">
            <summary className="cursor-pointer font-medium">Diagnosa endpoint yang dicoba</summary>
            <ul className="mt-2 list-disc ml-5">
              {diag.map((a,i)=>(
                <li key={i}>
                  <code className="break-all">{a.url}</code> → {a.ok ? "OK" : `ERR ${a.status || ""} ${a.message || ""}`}
                </li>
              ))}
              {!diag.length && <li>Belum ada percobaan atau masih memuat…</li>}
            </ul>
            {!!LOGS_OVERRIDE && <div className="mt-2">Override aktif dari <code>NEXT_PUBLIC_LOGS_BAHAN_PATH</code>: <code>{LOGS_OVERRIDE}</code></div>}
          </details>
        )}

        <div className="rounded-xl border p-4 mb-4">
          <div className="font-semibold text-lg mb-2">Grafik Harga dari Logs</div>
          {loading ? <div>Memuat…</div> :
           chartData.length ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="harga" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="text-gray-500">Belum ada data log.</div>}
        </div>

        <div className="rounded-xl border p-4">
          <div className="font-semibold text-lg mb-2">Update Harga Cepat</div>
          <div className="flex gap-3">
            <input
              value={price}
              onChange={(e)=>setPrice(e.target.value.replace(/[^\d.]/g,""))}
              className="border rounded-lg px-3 py-2 w-full"
              placeholder="15000"
              inputMode="decimal"
            />
            <button onClick={submit} disabled={saving || !id} className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-60">
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Harga diperbarui via PUT /setup/bahan/:id (fallback POST upsert).
          </p>
        </div>
      </div>
    </div>
  );
}
