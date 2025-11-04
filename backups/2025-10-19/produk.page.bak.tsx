// @ts-nocheck
"use client";
type="button"
onClick={resetForm}
>
Batal
</button>
)}
</form>


<div className="flex items-center justify-between mb-2">
<div className="text-sm text-gray-600">Total: {count} produk</div>
<button
onClick={load}
className="text-sm px-3 py-1 rounded-xl border hover:bg-gray-50"
>
Refresh
</button>
</div>


{err && (
<div className="text-red-600 text-sm mb-2">{err}</div>
)}


<div className="overflow-x-auto border rounded-2xl">
<table className="min-w-full text-sm">
<thead className="bg-gray-50">
<tr>
<th className="text-left p-2">Nama</th>
<th className="text-left p-2">Kategori</th>
<th className="text-right p-2">Harga jual (user)</th>
<th className="text-left p-2">Aksi</th>
</tr>
</thead>
<tbody>
{rows.map((r) => (
<tr key={r.id} className="border-t">
<td className="p-2">{r.nama}</td>
<td className="p-2">{r.kategori || "-"}</td>
<td className="p-2 text-right">
{r.harga_jual_user == null ? "-" : r.harga_jual_user.toLocaleString("id-ID")}
</td>
<td className="p-2">
<button
className="text-xs px-3 py-1 rounded-xl border hover:bg-gray-50"
onClick={() => onEdit(r)}
>
Edit
</button>
</td>
</tr>
))}
{rows.length === 0 && !loading && (
<tr>
<td className="p-3 text-center text-gray-500" colSpan={4}>
Belum ada produk.
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
