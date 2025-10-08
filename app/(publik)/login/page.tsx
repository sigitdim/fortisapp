"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [user, setUser] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync session awal + subscribe perubahan auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const show = (m: string, isErr = false) => {
    isErr ? setErr(m) : setMsg(m);
    setTimeout(() => { setMsg(null); setErr(null); }, 2500);
  };

  const doSignup = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({ email, password: pass });
      if (error) return show(error.message, true);
      show("Sign up success! Cek email untuk verifikasi (jika diaktifkan).");
    } finally { setLoading(false); }
  };

  const doLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) return show(error.message, true);
      show("Login sukses.");
    } finally { setLoading(false); }
  };

  const doLogout = async () => {
    await supabase.auth.signOut();
    show("Logout sukses.");
  };

  return (
    <div style={{maxWidth: 420, margin: "40px auto", fontFamily: "ui-sans-serif"}}>
      <h1 style={{fontSize: 24, fontWeight: 700}}>Login / Signup</h1>

      <div style={{display:"grid", gap: 8, marginTop: 16}}>
        <input
          placeholder="Email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
          style={{padding:10, border:"1px solid #ddd", borderRadius:8}}
        />
        <input
          placeholder="Password"
          type="password"
          value={pass}
          onChange={e=>setPass(e.target.value)}
          style={{padding:10, border:"1px solid #ddd", borderRadius:8}}
        />
        <div style={{display:"flex", gap:8}}>
          <button onClick={doLogin} disabled={loading} style={{padding:"10px 14px", borderRadius:8, border:"1px solid #ddd"}}>
            Login
          </button>
          <button onClick={doSignup} disabled={loading} style={{padding:"10px 14px", borderRadius:8, border:"1px solid #ddd"}}>
            Sign Up
          </button>
          <button onClick={doLogout} style={{padding:"10px 14px", borderRadius:8, border:"1px solid #ddd"}}>
            Logout
          </button>
        </div>
      </div>

      {msg && <p style={{color:"green", marginTop:8}}>{msg}</p>}
      {err && <p style={{color:"crimson", marginTop:8}}>{err}</p>}

      <div style={{marginTop:16, padding:12, border:"1px dashed #ddd", borderRadius:8}}>
        <div style={{fontWeight:600, marginBottom:6}}>User session:</div>
        <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(user, null, 2)}</pre>
      </div>
    </div>
  );
}
