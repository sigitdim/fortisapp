"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useOwner } from "@/app/providers/owner-provider";

export default function AuthBar() {
  const router = useRouter();
  const { email, loading } = useOwner();

  const onLogout = async () => {
    await supabase.auth.signOut();
    try { localStorage.removeItem("fortisapp.owner_id"); } catch {}
    router.replace("/login");
  };

  return (
    <div className="w-full flex items-center justify-between py-3 px-4 border-b bg-white">
      <div className="font-semibold">FortisApp</div>
      <div className="text-sm flex items-center gap-3">
        <span className="text-gray-600">{loading ? "..." : (email || "Guest")}</span>
        <button onClick={onLogout} className="px-3 py-1 rounded border hover:bg-gray-50">
          Keluar
        </button>
      </div>
    </div>
  );
}
