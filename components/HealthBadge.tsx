"use client";
import { useEffect, useState } from "react";
import { API_BASE, HEALTH_PATH, VERSION_PATH } from "@/lib/env";

export default function HealthBadge() {
  const [status, setStatus] = useState<"ok"|"down"|"loading">("loading");
  const [version, setVersion] = useState<string|undefined>(undefined);

  async function ping() {
    try {
      const [h, v] = await Promise.all([
        fetch(`/api${HEALTH_PATH}`, { cache: "no-store" }).then(r=>r.json()).catch(()=>null),
        fetch(`/api${VERSION_PATH}`, { cache: "no-store" }).then(r=>r.json()).catch(()=>null),
      ]);
      setStatus(h?.ok ? "ok" : "down");
      setVersion(v?.version || v?.data?.version);
    } catch {
      setStatus("down");
    }
  }

  useEffect(() => {
    ping();
    const t = setInterval(ping, 5 * 60 * 1000); // 5 menit
    return () => clearInterval(t);
  }, []);

  const chip = status==="loading" ? "bg-gray-200 text-gray-700" :
               status==="ok" ? "bg-emerald-100 text-emerald-700 border border-emerald-300" :
                               "bg-red-100 text-red-700 border border-red-300";

  return (
    <div className={`px-3 py-1 rounded-xl text-xs ${chip}`}>
      API: {status==="ok" ? "✅" : status==="loading" ? "…" : "❌"} {version ? `v${version}` : ""}
    </div>
  );
}
