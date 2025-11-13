"use client";

import React, { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  async function handleSend() {
    if (!email) return;
    setSending(true);
    setErr(null);
    try {
      // Kirim email reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password/update`
            : undefined,
      });
      if (error) throw error;
      setSent(true);
      // mulai countdown 60 detik
      setCooldown(60);
      const t = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(t);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      setErr(e?.message ?? "Gagal mengirim email reset.");
    } finally {
      setSending(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || sending) return;
    await handleSend();
  }

  if (sent) {
    // ======= CEK EMAIL (SUCCESS STATE) =======
    return (
      <div className="page-root flex items-center justify-center">
        <div className="fortis-card w-[525px] px-8 py-8 text-center">
          <h1 className="text-[20px] font-semibold text-neutral-900 mb-2">
            Cek Email Kamu, ya!
          </h1>
          <p className="text-[13px] leading-6 text-neutral-600">
            Kalau emailmu terdaftar, kamu bakal dapat link untuk reset password.
            Jangan lupa cek folder spam juga, kadang suka nyasar ke situ.
            <br />
            Belum masuk? Tunggu sebentar dan coba kirim ulang.
          </p>

          <a
            href="/login"
            className="fortis-btn mt-6 inline-flex w-full items-center justify-center bg-[#B82020] hover:brightness-110 text-white font-semibold py-3"
          >
            Kembali ke Login
          </a>

          <div className="mt-3 text-[13px] text-neutral-500">
            kasih waktu yaa{" "}
            <span className="tabular-nums">{cooldown}</span> detik countdown
            <button
              onClick={resend}
              disabled={cooldown > 0 || sending}
              className={`ml-3 font-medium ${
                cooldown > 0 ? "text-neutral-400" : "text-[#B82020] hover:underline"
              }`}
            >
              Re-Send Email!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======= FORM KIRIM LINK =======
  return (
    <div className="page-root flex items-center justify-center">
      <div className="fortis-card w-[525px] px-8 py-8">
        <h1 className="text-[20px] font-semibold text-neutral-900 text-center mb-3">
          Lupa Password?
        </h1>

        <p className="text-[13px] leading-6 text-neutral-600 text-center">
          Masukkan alamat email akunmu. Link reset bakal dikirim langsung ke inbox kamu.
          <br />
          Jangan lupa cek folder spam kalau belum masuk.
        </p>

        <input
          className="fortis-input mt-6 w-full border border-neutral-200 px-4 py-3 outline-none focus:border-neutral-400"
          placeholder="Email kamu"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {err && (
          <div className="mt-3 text-[13px] text-red-600">
            {err}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSend}
            disabled={!email || sending}
            className="fortis-btn flex-1 bg-[#B82020] hover:brightness-110 disabled:opacity-60 text-white font-semibold py-3"
          >
            {sending ? "Mengirim..." : "Reset Password"}
          </button>

          <a href="/login" className="text-[#B82020] text-sm font-medium">
            Kembali ke Login
          </a>
        </div>
      </div>
    </div>
  );
}
