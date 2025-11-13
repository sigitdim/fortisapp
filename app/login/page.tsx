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

async function loginWithGoogle() {
  setErr(null);
  setLoading(true);
  try {
    // Paksa redirect ke domain produksi dari ENV
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");

    const redirectTo = `${site.replace(/\/$/, "")}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // ini membantu dapatkan refresh token yang stabil
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) throw error; // Supabase akan redirect otomatis
  } catch (e: any) {
    setErr(e?.message || "Gagal masuk dengan Google");
    setLoading(false);
  }
}
  return (
    <>
      {/* CSS khusus halaman login: hide sidebar/header + center */}
      <style jsx global>{`
        [data-fortis-sidebar],[data-fortis-header]{display:none}
        .page-root{min-height:100vh;display:flex;align-items:center;justify-content:center}
        main{padding:0!important;max-width:720px;margin:0 auto}
      `}</style>

      <div className="page-root">
        <main className="w-full max-w-xl px-4">
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
            className="mx-auto w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 md:p-8"
          >
            <h2 className="text-xl font-semibold text-center mb-4">Masuk ke FortisApp</h2>

            {err && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {err}
              </div>
            )}

            <label className="block text-sm mb-1">Email</label>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 focus-within:ring-2 focus-within:ring-rose-600/40">
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
              <a href="/reset-password" className="text-sm text-rose-600 hover:underline">
                Lupa Password?
              </a>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 focus-within:ring-2 focus-within:ring-rose-600/40">
              <Lock className="w-4 h-4" />
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full bg-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="text-zinc-500 hover:text-zinc-700"
                aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-medium py-3 transition disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <LogIn className="w-4 h-4" />
                {loading ? "Masuk..." : "Masuk"}
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs text-zinc-500">atau</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 py-3 font-medium flex items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {/* G icon */}
              <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden>
                <path fill="#EA4335" d="M533.5 278.4c0-18.6-1.7-37-5.1-54.8H272v103.7h147c-6.3 34.1-25.2 63-53.8 82.2v67h86.9c50.9-46.9 80.4-116 80.4-198.1z"/>
                <path fill="#34A853" d="M272 544.3c72.9 0 134.3-24.2 179.1-65.8l-86.9-67c-24.2 16.2-55.2 25.7-92.2 25.7-70.8 0-130.7-47.8-152.2-112.1H30.6v70.3C75.8 489.3 168.5 544.3 272 544.3z"/>
                <path fill="#4A90E2" d="M119.8 325.1c-5.7-16.9-9-35-9-53.6s3.3-36.7 9-53.6v-70.3H30.6C11.1 186.8 0 226.1 0 271.5s11.1 84.7 30.6 123.9l89.2-70.3z"/>
                <path fill="#FBBC05" d="M272 107.2c39.6 0 75.2 13.6 103.2 40.2l77.4-77.4C406.3 26.4 344.9 0 272 0 168.5 0 75.8 55 30.6 147.4l89.2 70.3C141.3 155 201.2 107.2 272 107.2z"/>
              </svg>
              Masuk dengan Google
            </button>

            <p className="text-center text-sm mt-6">
              Belum punya akun?{" "}
              <a href="/register" className="text-rose-700 font-medium hover:underline">
                Buat Akun FortisApp →
              </a>
            </p>
          </form>
        </main>
      </div>
    </>
  );
}
