"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Topbar() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? "Guest");
    })();
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header
      data-fortis-header
      className="h-16 border-b border-zinc-200 bg-white flex items-center justify-end px-6"
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-600">{email ?? "Guest"}</span>
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-100"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
