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
      {/* suppressHydrationWarning here only covers this element's own
          attributes (not children) — it's the standard workaround for
          browser extensions (e.g. ColorZilla) injecting attributes like
          cz-shortcut-listen onto <body> before React hydrates. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
