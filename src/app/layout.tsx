import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/app/globals.css";
import { getAppUrl, validateEnv } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "Accelerate",
    template: "%s | Accelerate",
  },
  description:
    "Phase 1 foundation for an invite-only, dataset-centric web application.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  validateEnv();

  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen`}>{children}</body>
    </html>
  );
}
