import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import "./brand.generated.css";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Rakky Ride Admin", template: "%s · Rakky Ride" },
  description: "Rakky Ride staff operations workspace.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <body>
        <ThemeProvider />
        {children}
      </body>
    </html>
  );
}
