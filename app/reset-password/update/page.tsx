"use client";

import React, { useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleUpdate() {
    if (!pwd) return;
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      setMsg("Password berhasil diubah! Silakan login kembali.");
      // optional redirect kecil
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.href = "/login";
      }, 1200);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal menyimpan password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-root flex items-center justify-center">
      <div className="fortis-card w-[525px] px-8 py-8 text-center">
        <h1 className="text-[20px] font-semibold text-neutral-900 mb-4">
          Atur Password Baru!
        </h1>

        <div className="relative">
          <input
            className="fortis-input w-full border border-neutral-200 px-4 py-3 pr-10 outline-none focus:border-neutral-400"
            type={show ? "text" : "password"}
            placeholder="Password baru"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
            aria-label={show ? "Sembunyikan password" : "Lihat password"}
            title={show ? "Sembunyikan" : "Lihat"}
          >
            {/* Ikon mata sederhana */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 5c5.5 0 9 5.5 9 7s-3.5 7-9 7-9-5.5-9-7 3.5-7 9-7Z" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>

        {err && <div className="mt-3 text-[13px] text-red-600">{err}</div>}
        {msg && <div className="mt-3 text-[13px] text-emerald-600">{msg}</div>}

        <button
          onClick={handleUpdate}
          disabled={!pwd || saving}
          className="fortis-btn mt-6 w-full bg-[#B82020] hover:brightness-110 disabled:opacity-60 text-white font-semibold py-3"
        >
          {saving ? "Menyimpan..." : "Reset Password!"}
        </button>
      </div>
    </div>
  );
}
