"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import supabase from "@/lib/supabaseClient";

const card =
  "mx-auto w-full max-w-[800px] rounded-3xl bg-white/95 shadow-2xl ring-1 ring-black/5 px-8 py-10 md:px-12 md:py-12";
const h1 =
  "text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 text-center";
const p =
  "mx-auto mt-6 max-w-[60ch] text-center text-zinc-600 md:text-lg leading-relaxed";
const primaryBtn =
  "mt-10 inline-flex h-14 w-full md:w-auto items-center justify-center rounded-2xl bg-rose-700 px-8 font-semibold text-white shadow-sm transition hover:bg-rose-800";

export default function ConfirmResetPage() {
  const [sec, setSec] = useState(60);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (sec <= 0) return;
    const t = setTimeout(() => setSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sec]);

  async function resend() {
    if (sending || sec > 0) return;
    setSending(true);
    setMsg(null);
    try {
      // kita tidak tahu email user-nya di sini, jadi biarkan user trigger dari awal;
      // atau kalau mau, simpan email di sessionStorage saat submit pertama.
      const email = sessionStorage.getItem("reset-email");
      if (!email) {
        setMsg("Buka form reset lagi dan kirim ulang.");
        return;
      }
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password/update`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setSec(60);
      setMsg("Email terkirim ulang.");
    } catch (e: any) {
      setMsg(e?.message ?? "Gagal kirim ulang.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative min-h-[calc(100dvh-0px)] bg-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,244,245,.8),transparent_60%)]"></div>

      <div className={card}>
        <h1 className={h1}>Cek Email Kamu, ya!</h1>
        <p className={p}>
          Kalau emailmu terdaftar, kamu bakal dapat link untuk reset password.
          Jangan lupa cek folder spam juga, kadang suka nyasar ke situ. <br />
          Belum masuk? Tunggu sebentar dan coba kirim ulang.
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link href="/login" className={primaryBtn}>
            Kembali ke Login
          </Link>

          <div className="text-sm text-zinc-500">
            kasih waktu yaa {sec} detik countdown
            <button
              onClick={resend}
              className="ml-3 font-semibold text-rose-700 hover:text-rose-800 disabled:opacity-40"
              disabled={sending || sec > 0}
            >
              Re-Send Email!
            </button>
          </div>

          {msg ? (
            <div className="text-sm font-medium text-zinc-600">{msg}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
