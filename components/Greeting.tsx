"use client";
import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function toName(email?: string | null, full?: string | null) {
  if (full && full.trim().length > 0) return full.trim();
  if (!email) return "User";
  const before = email.split("@")[0] || "User";
  // kapitalkan username sederhana
  return before.replace(/[-_.]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function Greeting() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [name, setName] = useState("User");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setName(toName(u?.email ?? null, (u?.user_metadata as any)?.full_name ?? null));
    })();
  }, [supabase]);

  return (
    <div className="mb-3 text-[18px] font-semibold text-zinc-700">
      Welcome Back <span className="text-zinc-900">{name}</span>
    </div>
  );
}
