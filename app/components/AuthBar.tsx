'use client';
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthBar() {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [user, setUser]   = useState<any>(null);
  const [msg, setMsg]     = useState<string | null>(null);
  const [err, setErr]     = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
      setEmail(""); setPass("");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const showMsg = (m: string | null, isErr = false) => {
    isErr ? setErr(m) : setMsg(m);
    setTimeout(() => { setMsg(null); setErr(null); }, 2500);
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password: pass });
    error ? showMsg(error.message, true) : showMsg("Sign up OK");
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    error ? showMsg(error.message, true) : showMsg("Login OK");
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    error ? showMsg(error.message, true) : showMsg("Logged out.");
  };

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const active =
      pathname === href ||
      (href !== "/" && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        className={`px-2 py-1 rounded text-sm hover:underline ${
          active ? "font-semibold underline" : "text-neutral-700"
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <div className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto p-3 flex flex-wrap items-center gap-3">
        {/* Kiri: status singkat */}
        <div className="text-sm text-neutral-700 mr-auto">
          {user ? <>Login sebagai <b>{user.email}</b></> : <>Belum login</>}
        </div>

        {/* Tengah: NAV (selalu tampil, biar gampang berpindah halaman) */}
        <nav className="flex items-center gap-2 order-3 w-full sm:order-none sm:w-auto">
          <NavLink href="/hpp">HPP</NavLink>
          <NavLink href="/hpp/rekap">Rekap HPP</NavLink>
          <span className="text-neutral-300">|</span>
          <NavLink href="/setup/bahan">Bahan</NavLink>
          <NavLink href="/setup/produk">Produk</NavLink>
          <NavLink href="/setup/tenaga-kerja">Tenaga Kerja</NavLink>
          <NavLink href="/setup/overhead">Overhead</NavLink>
        </nav>

        {/* Kanan: form atau tombol auth */}
        {user ? (
          <button onClick={logout} className="border rounded px-3 py-1 text-sm">
            Logout
          </button>
        ) : (
          <form onSubmit={login} className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="password"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
            <button type="button" onClick={signup} className="border rounded px-3 py-1 text-sm">
              Sign up
            </button>
            <button type="submit" className="border rounded px-3 py-1 text-sm">
              Login
            </button>
          </form>
        )}
      </div>

      {(msg || err) && (
        <div className="max-w-6xl mx-auto pb-2 text-sm">
          {msg && <div className="text-green-700">{msg}</div>}
          {err && <div className="text-red-600">Error: {err}</div>}
        </div>
      )}
    </div>
  );
}
