"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Eye, EyeOff } from "lucide-react";

/* ========= helper: ambil SITE URL dari ENV ========= */
function getSiteUrl() {
  const envSite = process.env.NEXT_PUBLIC_SITE_URL;
  if (envSite && envSite.length > 0) {
    // buang trailing slash kalau ada
    return envSite.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/$/, "");
  }

  return "";
}

export default function RegisterPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  /* ========= daftar manual (email + password) ========= */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const site = getSiteUrl();

      const { error } = await supabase.auth.signUp({
        email,
        password: pwd,
        options: {
          // setelah klik verifikasi di email → ke /auth/callback (FE)
          emailRedirectTo: `${site}/auth/callback`,
        },
      });

      if (error) throw error;

      alert("Cek email kamu untuk verifikasi akun 👋");
      router.push("/login");
    } catch (err: any) {
      setMsg(err?.message ?? "Gagal mendaftar");
    } finally {
      setLoading(false);
    }
  };

  /* ========= daftar pakai Google ========= */
  const handleRegisterWithGoogle = async () => {
    setLoadingGoogle(true);
    setMsg(null);

    try {
      const site = getSiteUrl();

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // penting: pakai domain dari ENV, bukan localhost
          redirectTo: `${site}/auth/callback?from=register`,
        },
      });

      // setelah ini browser dibawa ke Google → Supabase → /auth/callback
      // lalu route /auth/callback kita yg redirect ke /login?new=1
    } catch (err: any) {
      setMsg(err?.message ?? "Gagal daftar dengan Google");
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 bg-[#f9fafb]">
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
      <div className="bg-white w-full max-w-[430px] rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-6 sm:p-7">
        <h2 className="text-[17px] font-semibold mb-6 text-[#111]">
          Daftar FortisApp
        </h2>

        <form onSubmit={handleRegister}>
          {/* Email */}
          <div className="mb-4 text-left">
            <label className="block text-[14px] font-medium text-[#222] mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="example@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] focus:outline-none text-[14px]"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-1 text-left">
            <label className="block text-[14px] font-medium text-[#222] mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="********"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] focus:outline-none text-[14px]"
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

          <p className="text-[12px] text-[#999] mb-4 text-left">
            Password minimal 8 karakter. Gunakan kombinasi huruf dan angka.
          </p>

          {/* Tombol daftar manual */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#b91c1c] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#a01616] disabled:opacity-60"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-4 flex items-center justify-center text-sm text-gray-400 gap-2">
          <span className="w-20 h-[1px] bg-gray-300" />
          <span className="text-gray-500 text-[13px]">atau</span>
          <span className="w-20 h-[1px] bg-gray-300" />
        </div>

        {/* Daftar dengan Google */}
        <button
          type="button"
          onClick={handleRegisterWithGoogle}
          disabled={loadingGoogle}
          className="w-full border border-[#ddd] py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          {loadingGoogle ? "Menghubungkan Google..." : "Daftar dengan Google"}
        </button>

        <p className="text-[15px] text-[#b91c1c] mt-6 text-center">
          Sudah punya akun?{" "}
          <a
            href="/login"
            className="font-semibold hover:underline"
          >
            Masuk
          </a>
        </p>

        {msg && (
          <div className="mt-4 text-sm p-2 rounded bg-gray-50 border border-gray-200 text-gray-700">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
