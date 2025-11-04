"use client";
import { useEffect } from "react";

/** Matikan SEMUA elemen bertuliskan "AI Suggestion" / "AI Suggest" di seluruh app. */
export default function NoAISuggest() {
  useEffect(() => {
    const kill = () => {
      const nodes = document.querySelectorAll<HTMLElement>("button, a, div, span");
      nodes.forEach((el) => {
        const t = (el.innerText || "").trim().toLowerCase();
        if (t.includes("ai suggestion") || t.includes("ai suggest")) {
          const container = el.closest<HTMLElement>('[class*="fixed"],[style*="fixed"]') ?? el;
          container.remove();
        }
      });
    };
    // awal + pantau DOM
    kill();
    const obs = new MutationObserver(kill);
    obs.observe(document.body, { childList: true, subtree: true });
    // jaga-jaga ada re-render via portal/timeout
    const iv = setInterval(kill, 500);
    return () => { obs.disconnect(); clearInterval(iv); };
  }, []);
  return null;
}
