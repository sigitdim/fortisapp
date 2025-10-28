import { api, API_BASE } from '@/app/lib/api';
import { toCSV } from '@/app/lib/csv';

export const dynamic = 'force-dynamic';

type Row = {
  produk_id: string;
  produk: string;
  kategori?: string;
  hpp_total_per_porsi?: number;
  harga_rekomendasi?: number;
  harga_jual_user?: number;
  profit_user_per_porsi?: number;
  margin_user_persen?: number;
};

async function fetchCOGS(): Promise<Row[]> {
  // 1) coba bulk
  try {
    const r = await api('/pricing/final?all=true');
    if (r?.data?.length) return r.data;
  } catch { /* ignore, fallback */ }

  // 2) fallback minimal via /produk → /pricing/final?produk_id=
  try {
    const list = await api('/produk');
    const items: Row[] = [];
    for (const p of (list?.data ?? [])) {
      try {
        const d = await api(`/pricing/final?produk_id=${encodeURIComponent(p.id)}`);
        if (d?.data) items.push(d.data);
      } catch { /* skip */ }
    }
    return items;
  } catch {
    return [];
  }
}

function format(num?: number) {
  return typeof num === 'number' ? num.toLocaleString() : '-';
}

export default async function COGSPage(){
  const rows = await fetchCOGS();

  const csv = toCSV(rows.map(r=>({
    produk: r.produk,
    kategori: r.kategori ?? '',
    hpp_per_porsi: r.hpp_total_per_porsi ?? '',
    harga_rekomendasi: r.harga_rekomendasi ?? '',
    harga_jual_user: r.harga_jual_user ?? '',
    profit_per_porsi: r.profit_user_per_porsi ?? '',
    margin_persen: r.margin_user_persen ?? '',
  })));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">COGS / HPP Rekap</h1>
      </div>

      <div className="flex gap-2">
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download={`cogs_${Date.now()}.csv`}
          className="px-4 py-2 rounded border"
        >
          Export CSV
        </a>
        <a
          href={`${API_BASE}/health`}
          target="_blank"
          className="px-4 py-2 rounded border"
        >
          Health
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 border text-left">Produk</th>
              <th className="p-2 border text-left">Kategori</th>
              <th className="p-2 border text-right">HPP/Porsi</th>
              <th className="p-2 border text-right">Harga Rekomendasi</th>
              <th className="p-2 border text-right">Harga Jual (User)</th>
              <th className="p-2 border text-right">Profit/Porsi</th>
              <th className="p-2 border text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r)=>(
              <tr key={r.produk_id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2 border">{r.produk}</td>
                <td className="p-2 border">{r.kategori ?? '-'}</td>
                <td className="p-2 border text-right">{format(r.hpp_total_per_porsi)}</td>
                <td className="p-2 border text-right">{format(r.harga_rekomendasi)}</td>
                <td className="p-2 border text-right">{format(r.harga_jual_user)}</td>
                <td className="p-2 border text-right">{format(r.profit_user_per_porsi)}</td>
                <td className="p-2 border text-right">{typeof r.margin_user_persen==='number' ? `${r.margin_user_persen.toFixed(1)}%` : '-'}</td>
              </tr>
            )) : (
              <tr><td className="p-4 text-center text-sm text-gray-500 border" colSpan={7}>
                Data belum tersedia. Pastikan BE `/pricing/final?all=true` aktif atau endpoint `/produk` tersedia untuk fallback.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
