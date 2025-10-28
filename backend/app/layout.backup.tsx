import "./globals.css"; // atau "src/app/globals.css" sesuai lokasi file kamu
import type { Metadata } from "next";
export const metadata: Metadata = { title: "FortisApp", description: "FortisApp Frontend" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="id"><body>{children}</body></html>);
}
