import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const quicksand = localFont({
  src: "../fonts/Quicksand-VariableFont_wght.ttf",
  variable: "--font-sans",
  display: "swap",
  weight: "300 700",
});

export const metadata: Metadata = {
  title: "auth-ui",
  description: "Headless authentication UI for Authlete-backed OAuth servers",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", quicksand.variable)}>
      <body className="min-h-svh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
