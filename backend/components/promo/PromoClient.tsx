"use client";
// di atas
import { listPromos, createPromo } from "@/lib/promos";
import { listProduk } from "@/lib/products"; // sudah ada untuk dropdown

// ... di effect load:
async function load() {
  setLoading(true);
  try {
    const [produkRes, promoRes] = await Promise.all([
      listProduk(),
      listPromos(),
    ]);
    setProduk(produkRes.data);
    setPromos(promoRes.data);  // tampilkan ke tabel
  } finally {
    setLoading(false);
  }
}

// ... di onSubmit simpan promo:
async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!selectedProdukIds.length) {
    alert("Pilih minimal 1 produk");
    return;
  }
  if (!nilai || isNaN(Number(nilai))) {
    alert("Nilai promo harus angka");
    return;
  }

  const body = {
    nama: namaPromo || null,
    tipe: tipePromo,                    // "percent" | "nominal"
    nilai: Number(nilai),
    produk_ids: selectedProdukIds,      // array string id produk
    aktif: true,
  };

  try {
    await createPromo(body);
    await load();
    resetForm();
    alert("Promo tersimpan");
  } catch (err: any) {
    alert(err?.message || "Gagal simpan promo");
  }
}

export default function PromoClient() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [produkId, setProdukId] = useState("");
  const [namaPromo, setNamaPromo] = useState("");
  const [tipe, setTipe] = useState("diskon");
  const [nilai, setNilai] = useState("");

  async function load() {
    setLoading(true); setErr(null);
    try {
      const [prod, pr] = await Promise.all([ listProduk(), apiGet<PromoList>("/promo") ]);
      setProduk(prod.data || []); setPromos(pr.data || []);
    } catch (e:any) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!produkId) return alert("Pilih produk dulu");
    const body: PromoUpsertBody = { produk_id: produkId, nama_promo: namaPromo.trim() || "Promo", tipe, nilai: nilai ? Number(nilai) : null, aktif: true };
    try { const res = await apiPost<PromoUpsertResp>("/promo", body); await load(); setProdukId(""); setNamaPromo(""); setTipe("diskon"); setNilai(""); alert(`Promo tersimpan: ${res.data.nama_promo}`); }
    catch (e:any) { alert(e?.message || String(e)); }
  }

  const produkSorted = useMemo(() => [...produk].sort((a,b)=>a.nama.localeCompare(b.nama)), [produk]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Promo</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <select className="border rounded-xl p-2" value={produkId} onChange={(e)=>setProdukId(e.target.value)} required>
          <option value="">Pilih Produk…</option>
          {produkSorted.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
        </select>
        <input className="border rounded-xl p-2" placeholder="Nama promo (opsional)" value={namaPromo} onChange={(e)=>setNamaPromo(e.target.value)} />
        <select className="border rounded-xl p-2" value={tipe} onChange={(e)=>setTipe(e.target.value)}>
          <option value="diskon">Diskon (%)</option>
          <option value="b1g1">B1G1</option>
          <option value="bundling">Bundling</option>
          <option value="tebus">Tebus Murah</option>
        </select>
        <input className="border rounded-xl p-2" placeholder="Nilai (misal 20 untuk 20%)" value={nilai} onChange={(e)=>setNilai(e.target.value.replace(/[^0-9]/g,""))} />
        <button className="rounded-2xl px-4 py-2 shadow border bg-white hover:bg-gray-50" type="submit">Simpan</button>
      </form>

      {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

      <div className="overflow-x-auto border rounded-2xl">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-2">Produk</th><th className="text-left p-2">Nama promo</th><th className="text-left p-2">Tipe</th><th className="text-right p-2">Nilai</th><th className="text-left p-2">Status</th></tr></thead>
          <tbody>
            {promos.map(r => {
              const prod = produk.find(p => p.id === r.produk_id);
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{prod?.nama || r.produk_id}</td>
                  <td className="p-2">{r.nama_promo}</td>
                  <td className="p-2">{r.tipe}</td>
                  <td className="p-2 text-right">{r.nilai ?? "-"}</td>
                  <td className="p-2">{r.aktif ? "Aktif" : "Nonaktif"}</td>
                </tr>
              );
            })}
            {promos.length===0 && <tr><td className="p-3 text-center text-gray-500" colSpan={5}>Belum ada promo.</td></tr>}
          </tbody>
        </table>
      </div>

      {loading && <div className="mt-2 text-sm">Loading…</div>}
    </div>
  );
}
