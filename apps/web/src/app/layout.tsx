import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { AuthProvider } from "../lib/auth/AuthProvider";
import { AuthControls } from "../lib/auth/AuthControls";

export const metadata: Metadata = {
  title: "Accelerate Core",
  description: "V1 scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="container">
            <div className="nav">
              <Link href="/">Home</Link>
              <Link href="/connectors">Connectors</Link>
              <Link href="/datasets">Datasets</Link>
              <div style={{ marginLeft: "auto" }}>
                <AuthControls />
              </div>
            </div>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
