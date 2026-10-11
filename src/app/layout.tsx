import type { Metadata } from "next";
import { Suspense } from "react";
import { ZyvaraApp } from "@/components/app";
import "../../design-system/tokens.css";
import "../../design-system/system.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Zyvara — Small actions. Lasting habits.",
  description:
    "Discover environmental challenges, document your actions, and build a record of participation.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense
          fallback={
            <main className="main">
              <h1>Zyvara</h1>
              <p role="status">Opening your field journal…</p>
            </main>
          }
        >
          <ZyvaraApp />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
