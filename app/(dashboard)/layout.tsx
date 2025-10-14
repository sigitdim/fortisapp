"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { OwnerProvider } from "@/app/providers/owner-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const goLogin = () => router.push("/login?stay=1");
  const logout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  return (
    <OwnerProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-white hidden md:block">
            <div className="p-4 text-xl font-semibold">FortisApp</div>
            <nav className="p-2 space-y-1">
              <a className="block px-4 py-2 rounded hover:bg-gray-100" href="/dashboard">Dashboard</a>
              <a className="block px-4 py-2 rounded hover:bg-gray-100" href="/setup/bahan">Setup</a>
              <a className="block px-4 py-2 rounded hover:bg-gray-100" href="/hpp/rekap">HPP</a>
              <a className="block px-4 py-2 rounded hover:bg-gray-100" href="/pricing">Pricing</a>
              <a className="block px-4 py-2 rounded hover:bg-gray-100" href="/settings">Settings</a>
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1">
            {/* Topbar */}
            <div className="sticky top-0 z-10 bg-white border-b">
              <div className="max-w-7xl mx-auto flex items-center gap-3 p-3">
                <input
                  placeholder="Cari produk, bahan, promo…"
                  className="flex-1 border rounded-full px-4 py-2"
                />
                {email ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Login sebagai {email}</span>
                    <button onClick={logout} className="border rounded px-3 py-1">Logout</button>
                  </div>
                ) : (
                  <button onClick={goLogin} className="border rounded px-3 py-1">Login</button>
                )}
              </div>
            </div>

            <div className="max-w-7xl mx-auto p-4">{children}</div>
          </main>
        </div>
      </div>
    </OwnerProvider>
  );
}
