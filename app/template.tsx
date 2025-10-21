// app/template.tsx
"use client";

import * as React from "react";
import AIAssistFloat from "@/components/nav/AIAssistFloat";

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AIAssistFloat />
    </>
  );
}
