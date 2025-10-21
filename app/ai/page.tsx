// app/ai/page.tsx
"use client";

import { ProGuard } from "@/components/license/ProGuard";

export default function AIPage() {
  return (
    <ProGuard>
      <main className="mx-auto max-w-4xl p-4 md:p-8 space-y-4">
        <h1 className="text-2xl font-semibold">AI Assistant (Pro)</h1>
        <div className="rounded-xl border p-4">
          <p className="text-sm opacity-80">
            Di sini fitur AI Pro akan tampil. (Dummy placeholder)
          </p>
        </div>
      </main>
    </ProGuard>
  );
}
