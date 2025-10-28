"use client";
</select>


<input
className="border rounded-xl p-2"
placeholder="Nilai (misal 20 untuk 20%)"
value={nilai}
onChange={(e) => setNilai(e.target.value.replace(/[^0-9]/g, ""))}
/>


<button
className="rounded-2xl px-4 py-2 shadow border bg-white hover:bg-gray-50"
type="submit"
>
Simpan
</button>
</form>


{err && <div className="text-red-600 text-sm mb-2">{err}</div>}


<div className="overflow-x-auto border rounded-2xl">
<table className="min-w-full text-sm">
<thead className="bg-gray-50">
<tr>
<th className="text-left p-2">Produk</th>
<th className="text-left p-2">Nama promo</th>
<th className="text-left p-2">Tipe</th>
<th className="text-right p-2">Nilai</th>
<th className="text-left p-2">Status</th>
</tr>
</thead>
<tbody>
{promos.map((r) => {
const prod = produk.find((p) => p.id === r.produk_id);
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
{promos.length === 0 && (
<tr>
<td className="p-3 text-center text-gray-500" colSpan={5}>
Belum ada promo.
</td>
</tr>
)}
</tbody>
</table>
</div>


{loading && <div className="mt-2 text-sm">Loading…</div>}
</div>
);
}
