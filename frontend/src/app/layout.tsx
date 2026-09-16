import type { Metadata } from "next";
import { sansation } from "@/lib/fonts";
import "./globals.css";

// Kept intentionally tenant-agnostic: /tenant-not-found renders through this
// same root layout without ever calling getTenant(), which would throw for
// an unresolved host. All real tenant chrome (header/footer/theme/metadata)
// lives in app/(site)/layout.tsx instead — see that file.
export const metadata: Metadata = {
  title: "Prabhu Group",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sansation.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
