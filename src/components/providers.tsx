/**
 * Top-level client providers: theme, TanStack Query, and the better-auth-ui
 * AuthProvider (which gives child registry components access to the auth
 * client + navigation helpers).
 */

"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { multiSessionPlugin } from "@/lib/auth/multi-session-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = getQueryClient();

  // Better Auth's auth mutations (sign-out, multi-session revoke/switch) don't
  // refetch their React Query data in the App Router (better-auth#3608/#5875),
  // so the accounts list and session go stale until a hard reload. Refetch on
  // any successful mutation — the standard React Query pattern — so the list
  // updates and useAuthenticate can redirect on sign-out.
  useEffect(() => {
    return queryClient.getMutationCache().subscribe((event) => {
      if (event?.mutation?.state.status === "success") queryClient.invalidateQueries();
    });
  }, [queryClient]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider
          authClient={authClient}
          plugins={[multiSessionPlugin(), themePlugin({ useTheme })]}
          redirectTo="/"
          navigate={({ to, replace }) => {
            // router.refresh() re-runs server components so the home's
            // signed-in/anon gate re-evaluates after sign-in/out/switch —
            // otherwise Next serves the cached RSC and the page shows stale
            // auth state until a hard refresh.
            if (replace) router.replace(to);
            else router.push(to);
            router.refresh();
          }}
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
