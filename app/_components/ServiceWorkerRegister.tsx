"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const swUrl = "/sw.js";

    navigator.serviceWorker
      .register(swUrl)
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Service worker registration failed:", err);
        }
      });
  }, []);

  return null;
}
