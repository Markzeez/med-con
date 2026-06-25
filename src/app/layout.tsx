// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedConnect — Healthcare at Your Doorstep",
  description: "Connect with doctors, nurses, pharmacists, and lab scientists instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
