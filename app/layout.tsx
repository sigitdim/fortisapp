import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ChunkReload from "./_components/ChunkReload";

export const metadata: Metadata = {
  title: "FortisApp",
  description: "Operasional kafe lebih cepat, hasil lebih tepat",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
