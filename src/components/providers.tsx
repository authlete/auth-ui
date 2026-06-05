/**
 * Top-level client providers: theme, TanStack Query, and the better-auth-ui
 * AuthProvider (which gives child registry components access to the auth
 * client + navigation helpers).
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          authClient={authClient}
          redirectTo="/"
          navigate={({ to, replace }) => (replace ? router.replace(to) : router.push(to))}
          Link={Link as unknown as React.ComponentType<{
            className?: string;
            href: string;
            to?: string;
            children?: React.ReactNode;
          }>}
        >
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
