export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">Skeleton UI siap • 10–11 Okt</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {["GM%", "HPP Rata2", "Top Produk", "Promo Aktif"].map((x) => (
          <div key={x} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-neutral-500">{x}</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-white p-6 min-h-[220px] flex items-center justify-center text-neutral-400">
        Grafik penjualan akan muncul di sini
      </div>
    </div>
  );
}
