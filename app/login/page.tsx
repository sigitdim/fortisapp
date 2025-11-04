"use client";
import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function LoginPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const search = useSearchParams();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const next = search?.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Gagal login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* CSS khusus halaman login: hide sidebar/header + center */}
      <style jsx global>{`
        [data-fortis-sidebar],[data-fortis-header]{display:none!important}
        .page-root{min-height:100vh;align-items:center;justify-content:center}
        main{padding:0!important;max-width:720px;margin:0 auto}
      `}</style>

      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-[36px] font-extrabold leading-tight">
            Hai, Selamat Datang <span>👋</span>
          </h1>
          <p className="text-zinc-500">
            FortisApp siap bantuin kamu biar urusan bisnis lebih cepat, hasil lebih tepat!
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mx-auto w-full max-w-md bg-white rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.06)] p-6 border border-zinc-200"
        >
          <h2 className="text-xl font-semibold text-center mb-4">Masuk ke FortisApp</h2>

          {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{err}</div>}

          <label className="block text-sm mb-1">Email</label>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 bg-zinc-50">
            <Mail className="w-4 h-4" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full bg-transparent outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-sm mb-1">Password</label>
            <a href="/reset-password" className="text-sm text-rose-700 hover:underline">Lupa Password?</a>
          </div>
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-300 px-3 py-2 bg-zinc-50">
            <Lock className="w-4 h-4" />
            <input
              type={show ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-transparent outline-none"
            />
            <button type="button" onClick={() => setShow(s=>!s)} className="p-1 rounded-md hover:bg-zinc-200" aria-label={show ? "Sembunyikan" : "Tampilkan"} title={show ? "Sembunyikan" : "Tampilkan"}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-[#BD0A2E] text-white font-medium">
            <span className="inline-flex items-center gap-2 justify-center">
              <LogIn className="w-4 h-4" />
              {loading ? "Masuk..." : "Masuk"}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}
