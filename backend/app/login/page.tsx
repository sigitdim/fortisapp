"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("hi.fortislab@gmail.com");
  const [password, setPassword] = useState("");
  const [sessionJson, setSessionJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      // allow visiting /login?stay=1 without auto-redirect
      const stay =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("stay") === "1";

      const { data } = await supabase.auth.getSession();
      setSessionJson(JSON.stringify(data.session, null, 2));
      if (data.session && !stay) router.replace("/dashboard");
    };
    run();

    const { data: sub } = supabase.auth.onAuthStateChange(async (e, s) => {
      setSessionJson(JSON.stringify(s, null, 2));

      const stay =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("stay") === "1";

      if (e === "SIGNED_IN" && !stay) router.replace("/dashboard");
      if (e === "SIGNED_OUT" && !stay) router.replace("/login");
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  const doLogin = async () => {
    setLoading(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr(error.message);
  };

  const loginWithProvider = async (provider: "google" | "facebook") => {
    setErr(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) setErr(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-semibold mb-6">Login / Signup</h1>

      <div className="space-y-3 mb-6">
        <input
          className="w-full border rounded p-3"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border rounded p-3"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-3 flex-wrap">
          <button className="border rounded px-4 py-2" onClick={doLogin} disabled={loading}>
            {loading ? "Loading..." : "Login"}
          </button>
          <button className="border rounded px-4 py-2" onClick={() => loginWithProvider("google")}>
            Login dengan Google
          </button>
          <button className="border rounded px-4 py-2" onClick={() => loginWithProvider("facebook")}>
            Login dengan Facebook
          </button>
          <button className="border rounded px-4 py-2" onClick={logout}>
            Logout
          </button>
        </div>

        {err && <p className="text-red-600">{err}</p>}
      </div>

      <div className="border rounded p-4">
        <div className="font-medium mb-2">User session:</div>
        <pre className="text-sm whitespace-pre-wrap">{sessionJson || "(no session)"}</pre>
      </div>
    </div>
  );
}
