import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Yıkıklar Cemiyeti — 2026 Dünya Kupası",
  description: "Bracket tahmin yarışması",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-[#0a0e1a] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
