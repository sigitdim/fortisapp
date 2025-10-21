"use client";

export default function PromoError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  console.error("[/promo] error boundary:", error);
  return (
    <main className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Gagal memuat halaman Promo</h1>
      <p className="text-sm text-red-700">
        {error?.message || "Unknown client error"}
      </p>
      {error?.digest && (
        <p className="text-xs text-gray-400">Digest: {error.digest}</p>
      )}
      <button
        onClick={() => reset()}
        className="mt-2 rounded-lg px-3 py-2 border shadow-sm text-sm"
      >
        Coba Lagi
      </button>
    </main>
  );
}
