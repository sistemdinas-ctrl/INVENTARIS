import "./globals.css";
import { Inter } from "next/font/google";
import { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "Sistem Inventaris Daerah",
  description: "Enterprise asset management dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
