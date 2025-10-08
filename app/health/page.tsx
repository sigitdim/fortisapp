"use client";
import { useEffect, useState } from "react";
type Health = { ok: boolean; time: string };

export default function HealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Lokal: lewat proxy -> bebas CORS
    fetch("/api/health")
      .then(r => r.json())
      .then(setData)
      .catch(e => setErr(String(e)));
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>API Health (via proxy)</h1>
      <div>Target API: {process.env.NEXT_PUBLIC_API_URL}</div>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
      {err && <div style={{ color: "red" }}>{err}</div>}
    </main>
  );
}
