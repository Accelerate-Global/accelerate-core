import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../lib/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Accelerate Core",
  description: "V1 scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

