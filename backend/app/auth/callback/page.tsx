"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace("/dashboard"), 400);
    return () => clearTimeout(t);
  }, [router]);
  return <div className="p-8">Signing you in…</div>;
}
