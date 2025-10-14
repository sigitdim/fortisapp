export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">Skeleton UI siap • 10–11 Okt</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {["GM%", "HPP Rata2", "Top Produk", "Promo Aktif"].map((t) => (
          <div key={t} className="rounded-2xl border p-4">
            <div className="text-gray-600">{t}</div>
            <div className="text-2xl">—</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border p-12 text-center text-gray-500">
        Grafik penjualan akan muncul di sini
      </div>
    </div>
  );
}
