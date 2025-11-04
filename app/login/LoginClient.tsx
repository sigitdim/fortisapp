"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type Mode = "signin" | "signup";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [mode, setMode] = useState<Mode>((sp?.get("mode") as Mode) || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      // getSession dengan tipe aman
      const res = await supabase.auth.getSession();
      const data: { session: Session | null } = res.data as { session: Session | null };
      setCurrentEmail(data.session?.user?.email ?? null);

      // onAuthStateChange dengan tipe parameter yang jelas
      const { data: sub } = supabase.auth.onAuthStateChange(
        (_event: AuthChangeEvent, session: Session | null) => {
          setCurrentEmail(session?.user?.email ?? null);
        }
      );
      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => {
      try { unsub?.(); } catch {}
    };
  }, []);

  async function handleSignUp(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        // options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMsg("Akun dibuat. Cek email jika perlu verifikasi, lalu login.");
    } catch (err: any) {
      setMsg(err.message || "Gagal membuat akun.");
    } finally { setLoading(false); }
  }

  async function handleSignIn(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true); setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setMsg("Login berhasil.");
    } catch (err: any) {
      setMsg(err.message || "Gagal login. Periksa email/password.");
    } finally { setLoading(false); }
  }

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    try { localStorage.removeItem("fortisapp.owner_id"); } catch {}
    setMsg("Anda telah keluar. Silakan login akun lain.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-2">FortisApp</h2>

        {currentEmail && (
          <div className="mb-4 p-3 rounded border bg-amber-50 text-amber-800 text-sm">
            Anda sudah login sebagai <b>{currentEmail}</b>.
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => router.replace("/dashboard")}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Ke Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="px-3 py-1 rounded border hover:bg-gray-50"
              >
                Ganti Akun (Logout)
              </button>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-500 mb-4">
          {mode === "signin" ? "Masuk ke akun Anda" : "Buat akun baru"}
        </p>

        <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
          />

          <div className="flex items-center justify-between gap-2 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Sedang..." : mode === "signin" ? "Masuk" : "Daftar"}
            </button>

            {mode === "signin" ? (
              <button type="button" onClick={() => setMode("signup")} className="text-sm text-blue-600 underline">
                Buat akun baru
              </button>
            ) : (
              <button type="button" onClick={() => setMode("signin")} className="text-sm text-blue-600 underline">
                Sudah punya akun? Masuk
              </button>
            )}
          </div>
        </form>

        {msg && <div className="mt-4 text-sm p-2 rounded bg-gray-50 border">{msg}</div>}
      </div>
    </div>
  );
}
