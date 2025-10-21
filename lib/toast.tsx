"use client";
import { useEffect, useState } from "react";

let pushFn: (msg: string, type?: "success" | "error") => void;

export function pushToast(msg: string, type: "success" | "error" = "success") {
  if (pushFn) pushFn(msg, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  useEffect(() => {
    pushFn = (msg, type = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, msg, type }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    };
  }, []);
  return (
    <div className="fixed top-4 right-4 space-y-2 z-50">
      {toasts.map((t) => (
        <div key={t.id}
          className={`px-4 py-2 rounded-xl shadow text-white text-sm ${
            t.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
