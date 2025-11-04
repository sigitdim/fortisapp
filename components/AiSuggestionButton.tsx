"use client";
import { usePathname } from "next/navigation";

export default function AiSuggestionButton({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  // tampilkan hanya di halaman yang diizinkan
  const allowed = pathname?.startsWith("/cogs"); // ganti sesuai kebutuhan, mis. "/pricing"
  if (!allowed) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40">
      {children ?? (
        <button className="rounded-full px-5 py-3 text-white bg-black shadow-lg">
          <span className="mr-2">💡</span> AI Suggestion
        </button>
      )}
    </div>
  );
}
