"use client";
import { useEffect } from "react";

/** Matikan/bersihkan tombol AI Suggestion di mana pun dia nongol */
export default function AiBlocker() {
  useEffect(() => {
    const kill = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>("button, a, div, span"));
      candidates.forEach((el) => {
        const t = (el.innerText || "").trim().toLowerCase();
        if (t.includes("ai suggestion") || t.includes("ai suggest")) {
          // remove container floating-nya juga kalau ada parent fixed
          const p = el.closest<HTMLElement>('[class*="fixed"], [class*="sticky"]') ?? el;
          p.remove();
        }
      });
    };
    kill();
    const obs = new MutationObserver(kill);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);
  return null;
}
