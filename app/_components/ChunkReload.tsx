"use client";
import { useEffect } from "react";

export default function ChunkReload() {
  useEffect(() => {
    const reloadIfChunkError = (msg: string) =>
      msg.includes("Loading chunk") || msg.includes("ChunkLoadError");

    const onRejection = (e: PromiseRejectionEvent | any) => {
      const msg = String(e?.reason?.message || e?.message || "");
      if (reloadIfChunkError(msg)) {
        const u = new URL(location.href);
        u.searchParams.set("_v", String(Date.now()));
        location.replace(u.toString());
      }
    };

    const onError = (e: ErrorEvent | any) => {
      const msg = String(e?.message || "");
      if (reloadIfChunkError(msg)) location.reload();
    };

    window.addEventListener("unhandledrejection", onRejection as any);
    window.addEventListener("error", onError as any);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection as any);
      window.removeEventListener("error", onError as any);
    };
  }, []);
  return null;
}
