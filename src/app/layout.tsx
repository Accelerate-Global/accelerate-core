import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Accelerate",
  description: "Dataset-centric analytics platform",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen`}>{children}</body>
    </html>
  );
}
