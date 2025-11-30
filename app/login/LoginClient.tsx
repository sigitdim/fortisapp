"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";

const SITE_URL = "https://app.fortislab.id"; // ⬅️ paksa selalu ke domain produksi

export default function LoginClient() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  // ===== cek session, kalau sudah login kasih banner =====
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const res = await supabase.auth.getSession();
      const data = res.data as { session: Session | null };
      setCurrentEmail(data.session?.user?.email ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          setCurrentEmail(session?.user?.email ?? null);
        }
      );
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, [supabase]);

  /* ========= LOGIN EMAIL / PASSWORD (manual) ========= */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });
      if (error) throw error;

      // support ?next=/something kalau ada
      const next = search?.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/dashboard";

      router.replace(target);
      router.refresh();
    } catch (err: any) {
      setMsg(err?.message ?? "Gagal login. Periksa email/password.");
    } finally {
      setLoading(false);
    }
  }

  /* ========= LOGIN DENGAN GOOGLE ========= */
  async function handleLoginWithGoogle() {
    setLoadingGoogle(true);
    setMsg(null);

    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
        },
      });
      // setelah ini browser → Google → Supabase → /auth/callback di SITE_URL
    } catch (err: any) {
      setMsg(err?.message ?? "Gagal menghubungkan Google.");
      setLoadingGoogle(false);
    }
  }

  /* ========= LOGOUT kalau sudah login ========= */
  async function handleLogout() {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("fortisapp.owner_id");
    } catch {
      // ignore
    }
    setCurrentEmail(null);
    router.refresh();
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 bg-[#f9fafb]">
      {/* Banner kalau sebenarnya sudah login */}
      {currentEmail && (
        <div className="mb-6 w-full max-w-[430px] p-3 rounded-lg border bg-amber-50 text-amber-800 text-sm">
          Anda sudah login sebagai <b>{currentEmail}</b>.
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
            >
              Ke Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1 rounded bg-white border text-xs hover:bg-amber-100"
            >
              Ganti Akun (Logout)
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-[32px] sm:text-[36px] font-extrabold text-[#111] leading-tight">
          Hai, Selamat Datang <span className="inline-block">👋</span>
        </h1>
        <p className="text-[#777] mt-2 text-[15px] leading-relaxed">
          FortisApp siap bantuin kamu biar urusan bisnis lebih cepat, hasil
          lebih tepat!
        </p>
      </div>

      {/* CARD */}
      <form
        onSubmit={handleLogin}
        className="bg-white w-full max-w-[430px] rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] px-7 py-8"
      >
        <h2 className="text-[17px] font-semibold mb-6 text-[#111]">
          Masuk ke FortisApp
        </h2>

        {/* Email */}
        <div className="mb-4 text-left">
          <label className="block text-[14px] font-medium text-[#222] mb-1">
            Email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <Mail size={18} />
            </span>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] focus:border-[#b91c1c] text-[14px]"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-1 text-left">
          <label className="block text-[14px] font-medium text-[#222] mb-1">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
              <Lock size={18} />
            </span>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="********"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className="w-full pl-9 pr-10 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] focus:border-[#b91c1c] text-[14px]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <a
            href="/reset-password"
            className="text-[13px] text-[#b91c1c] font-medium hover:underline"
          >
            Lupa Password?
          </a>
        </div>

        {/* Tombol login manual */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#b91c1c] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#9e1717] disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {loading ? (
            "Masuk..."
          ) : (
            <>
              <LogIn size={16} />
              Masuk
            </>
          )}
        </button>

        {/* Divider */}
        <div className="my-4 flex items-center justify-center text-sm text-gray-400 gap-2">
          <span className="w-20 h-[1px] bg-gray-300" />
          <span className="text-gray-500 text-[13px]">atau</span>
          <span className="w-20 h-[1px] bg-gray-300" />
        </div>

        {/* Login dengan Google */}
        <button
          type="button"
          onClick={handleLoginWithGoogle}
          disabled={loadingGoogle}
          className="w-full border border-[#ddd] py-2.5 rounded-lg flex items-center justify-center gap-2 text-[14px] hover:bg-gray-50"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          {loadingGoogle ? "Menghubungkan Google..." : "Masuk dengan Google"}
        </button>

        <p className="text-[15px] text-[#b91c1c] mt-6 text-center">
          Belum punya akun?{" "}
          <a href="/register" className="font-semibold hover:underline">
            Buat Akun FortisApp →
          </a>
        </p>

        {msg && (
          <div className="mt-4 text-sm p-2 rounded bg-gray-50 border border-gray-200 text-gray-700">
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}
