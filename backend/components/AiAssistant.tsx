// components/AiAssistant.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** ===== Config & Helpers ===== */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fortislab.id";
const OWNER_ID = "f6269e9a-bc6d-4f8b-aa45-08affc769e5a";

type Msg = { role: "user" | "assistant"; text: string; t: number };

const store = {
  load(): Msg[] {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("ai_chat") || "[]"); } catch { return []; }
  },
  save(msgs: Msg[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem("ai_chat", JSON.stringify(msgs.slice(-200)));
  },
};

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", "x-owner-id": OWNER_ID },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

async function countPromoAktif(): Promise<number> {
  try {
    const j = await getJSON<{ ok: boolean; data: any[] }>("/promo");
    const today = new Date().toISOString().slice(0, 10);
    return (j?.data || []).filter((p: any) => p.aktif && today >= (p.start_date||"").slice(0,10) && today <= (p.end_date||"").slice(0,10)).length;
  } catch { return 0; }
}

/** ===== Main Component ===== */
export default function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // load history
  useEffect(() => { setMsgs(store.load()); }, []);
  useEffect(() => { store.save(msgs); }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  // greet on first open if empty
  useEffect(() => {
    if (open && msgs.length === 0) {
      setMsgs([
        { role: "assistant", text: "Halo 👋 Aku AI Assistant dummy. Coba tanya: \"status promo\", atau ketik saran pricing.", t: Date.now() },
      ]);
    }
  }, [open]); // eslint-disable-line

  async function handleSend(raw?: string) {
    const content = (raw ?? text).trim();
    if (!content) return;
    const now = Date.now();
    const draft = [...msgs, { role: "user", text: content, t: now }];
    setMsgs(draft);
    setText("");
    setBusy(true);

    // generate dummy reply
    try {
      const reply = await generateReply(content);
      setMsgs([...draft, { role: "assistant", text: reply, t: Date.now() }]);
    } catch (e: any) {
      setMsgs([...draft, { role: "assistant", text: "Maaf, ada kendala saat memproses.", t: Date.now() }]);
    } finally {
      setBusy(false);
    }
  }

  async function generateReply(input: string): Promise<string> {
    const q = input.toLowerCase();

    // 1) Quick intents
    if (q.includes("status promo") || q.includes("promo aktif")) {
      const n = await countPromoAktif();
      return n > 0
        ? `Promo aktif saat ini: ${n} 🎉\n\nSaran: tampilkan badge promo di menu produk agar konversi meningkat.`
        : `Belum ada promo aktif. Mau buat diskon 20% untuk menu margin tinggi? Coba di halaman Promo.`;
    }

    if (q.includes("b1g1")) {
      return `Ide B1G1: Terapkan pada produk dengan HPP rendah & popularitas tinggi (contoh: Americano).\nTips: batasi periode 3–5 hari agar efek FOMO.`;
    }

    if (q.includes("bundling")) {
      return `Bundling saran: Kopi susu + pastry dengan harga paket khusus (hemat ~10–15%).\nPastikan harga paket masih di atas HPP total + margin target.`;
    }

    if (q.includes("tebus") || q.includes("tebus murah")) {
      return `Tebus murah: Setelah beli minuman A, produk B bisa ditebus Rp5.000.\nGunakan pada item dengan margin besar atau stok ingin diputar.`;
    }

    if (q.includes("margin") && q.match(/\d+%/)) {
      const target = parseInt(q.match(/(\d+)%/)?.[1] || "0", 10);
      if (target > 0) {
        return `Target margin ${target}% diterima. Pastikan harga ≥ HPP / (1 - ${target/100}).\nRumus cepat: harga_min = HPP / (1 - m).`;
      }
    }

    // 2) Default coaching
    const tips = [
      "Coba naikkan harga 2.000 pada menu margin < 20% dan lihat dampak 7 hari.",
      "Aktifkan promo singkat (3 hari) untuk menaikkan traffic, lalu matikan untuk jaga margin.",
      "Pantau tren harga bahan: jika naik >5% dalam 30 hari, review harga jual produk terkait.",
      "Gunakan bundling dua produk saling melengkapi untuk tingkatkan ticket size.",
    ];
    const pick = tips[Math.floor(Math.random() * tips.length)];
    return `Catatan cepat:\n• ${pick}\n\nKetik: "status promo" untuk ringkasan, atau "B1G1" / "bundling" untuk ide promo.`;
  }

  // Quick actions
  async function quickInsights() {
    setBusy(true);
    const n = await countPromoAktif();
    setMsgs((m) => [
      ...m,
      { role: "assistant", text: n ? `Promo aktif: ${n}. Pertahankan momentum 🚀` : "Tidak ada promo aktif. Saatnya aktifkan promo singkat 3 hari.", t: Date.now() },
    ]);
    setBusy(false);
  }

  return (
    <>
      {/* FAB button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-40 rounded-full shadow-lg px-4 py-3 bg-black text-white"
        title="AI Assistant"
      >
        {open ? "Tutup AI" : "AI Assistant"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(360px,90vw)] rounded-2xl border bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="font-semibold">AI Assistant (Dummy)</div>
            <div className="flex items-center gap-2">
              <button onClick={quickInsights} className="text-xs px-2 py-1 rounded-lg border">Quick Insights</button>
              <button onClick={() => { setMsgs([]); store.save([]); }} className="text-xs px-2 py-1 rounded-lg border">
                Clear
              </button>
            </div>
          </div>

          <div className="h-72 overflow-y-auto px-3 py-3 space-y-2">
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.role==="assistant" ? "bg-gray-100 mr-auto" : "bg-black text-white ml-auto"}`}>
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 px-3 py-3 border-t"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              placeholder='Tanya apa saja… (contoh: "status promo")'
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <button
              className="px-3 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-60"
              disabled={busy || !text.trim()}
            >
              {busy ? "…" : "Kirim"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
