"use client";

import { useEffect, useState } from "react";

export default function PromoDebug() {
  const [err, setErr] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    // Tangkap error global tanpa buka Console
    const onError = (msg: any, src?: any, line?: any, col?: any, e?: any) => {
      const detail = typeof msg === "string" ? msg : JSON.stringify(msg);
      const text = `[window.onerror] ${detail} @${src ?? ""}:${line ?? ""}:${col ?? ""}`;
      setErr(text);
      setEvents((prev) => [...prev, text].slice(-20));
      return false;
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const text = `[unhandledrejection] ${String(ev.reason)}`;
      setErr(text);
      setEvents((prev) => [...prev, text].slice(-20));
    };
    window.addEventListener("error", onError as any);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onError as any);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">/promo-debug</h1>
      <p className="text-sm text-gray-600">Halaman ini di luar (auth-guard). Kalau ini tampil, root app OK.</p>

      {err ? (
        <div className="border border-red-200 bg-red-50 text-red-800 p-3 rounded-xl text-sm">
          <div className="font-medium mb-1">Client error terdeteksi:</div>
          <div className="whitespace-pre-wrap break-all">{err}</div>
        </div>
      ) : (
        <div className="border rounded-xl p-3 text-sm text-green-700 bg-green-50">
          Belum ada error tertangkap.
        </div>
      )}

      <details className="border rounded-xl p-3 text-xs text-gray-600">
        <summary>Event log</summary>
        <pre className="whitespace-pre-wrap break-all">{events.join("\n")}</pre>
      </details>
    </main>
  );
}
