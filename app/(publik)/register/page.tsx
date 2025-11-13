"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: pwd,
      });
      if (error) throw error;
      alert("Cek email kamu untuk verifikasi akun 👌");
      router.push("/login");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 bg-[#f9fafb]">
      {/* HEADER */}
      <div className="text-center mb-8">
        <h1 className="text-[32px] sm:text-[36px] font-extrabold text-[#111] leading-tight">
          Hai, Selamat Datang <span className="inline-block">👋</span>
        </h1>
        <p className="text-[#777] mt-2 text-[15px] leading-relaxed">
          FortisApp siap bantuin kamu biar <br />
          urusan bisnis lebih cepat, hasil lebih tepat!
        </p>
      </div>

      {/* CARD */}
      <form
        onSubmit={handleRegister}
        className="bg-white w-full max-w-[430px] rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] p-8 text-center"
      >
        <h2 className="text-[17px] font-semibold mb-6 text-[#111]">
          Daftar FortisApp
        </h2>

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
            className="w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] outline-none text-[14px]"
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
              className="w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] focus:ring-1 focus:ring-[#b91c1c] outline-none text-[14px]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end text-sm text-[#b91c1c] mt-1 mb-5">
          <a href="/reset-password" className="hover:underline">
            Lupa Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#b91c1c] text-white py-2.5 rounded-lg font-semibold hover:bg-[#9e1717] transition disabled:opacity-70 text-[15px]"
        >
          {loading ? "Mendaftar..." : "Daftar"}
        </button>

        <div className="my-4 flex items-center justify-center text-sm text-gray-400">
          <span className="w-20 h-[1px] bg-gray-300" />
          <span className="mx-2 text-gray-500 text-[13px]">atau</span>
          <span className="w-20 h-[1px] bg-gray-300" />
        </div>

<button
  type="button"
  onClick={() =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?from=register`,
      },
    })
  }
  className="w-full border border-[#ddd] py-2.5 rounded-lg flex items-center justify-center gap-2 text-[#222] hover:bg-gray-50 transition text-[15px]"
>
  <img
    src="https://www.svgrepo.com/show/475656/google-color.svg"
    alt="Google"
    className="w-5 h-5"
  />
  Daftar dengan Google
</button>
      </form>

      <p className="text-[15px] text-[#b91c1c] mt-6">
        Sudah Punya Akun?{" "}
        <a href="/login" className="font-semibold hover:underline">
          Masuk →
        </a>
      </p>
    </div>
  );
}
