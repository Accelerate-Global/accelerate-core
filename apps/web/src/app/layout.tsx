import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "../lib/auth/AuthProvider";
import { AppFrame } from "./_components/AppFrame";

export const metadata: Metadata = {
  title: "Accelerate Global",
  description: "V1 scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
