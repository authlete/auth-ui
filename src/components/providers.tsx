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
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { SocialProvider } from "better-auth/social-providers";
import { AuthProvider } from "@/components/auth/auth-provider";
import { multiSessionPlugin } from "@/lib/auth/multi-session-plugin";
import { themePlugin } from "@/lib/auth/theme-plugin";
import { twoFactorPlugin } from "@/lib/auth/two-factor-plugin";
import { authClient } from "@/lib/auth-client";
import { getQueryClient } from "@/lib/query-client";

const noopSubscribe = () => () => {};
const readRedirectTo = () => new URLSearchParams(window.location.search).get("redirectTo");

// better-auth-ui's auth-view links (sign-in ↔ sign-up ↔ forgot-password) are
// bare paths, dropping ?redirectTo. Carry it across them so an in-flight
// authorization (or any post-login target) survives switching views.
function AuthLink({
  href,
  className,
  children,
}: {
  href: string;
  to?: string;
  className?: string;
  children?: ReactNode;
}) {
  const redirectTo = useSyncExternalStore(noopSubscribe, readRedirectTo, () => null);
  const target =
    redirectTo && href.startsWith("/auth/") && !href.includes("?")
      ? `${href}?redirectTo=${encodeURIComponent(redirectTo)}`
      : href;
  return (
    <Link href={target} className={className}>
      {children}
    </Link>
  );
}

export function Providers({
  children,
  socialProviders,
}: {
  children: ReactNode;
  // Enabled provider ids, resolved server-side from env (config.ts) and passed
  // down so no secrets reach the client. Empty → no social buttons render.
  socialProviders?: SocialProvider[];
}) {
  const router = useRouter();
  const queryClient = getQueryClient();

  // Better Auth mutations don't refetch their React Query data in the App Router
  // (better-auth#3608), so refetch on any success to keep session/accounts fresh.
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
          plugins={[multiSessionPlugin(), themePlugin({ useTheme }), twoFactorPlugin()]}
          socialProviders={socialProviders}
          redirectTo="/"
          navigate={({ to, replace }) => {
            // Auth completion (leaving /auth/* for an app page) does a full
            // reload so the destination boots with fresh auth state; in-flow
            // navigation stays soft.
            const inAuthFlow = window.location.pathname.startsWith("/auth/");
            if (inAuthFlow && !to.startsWith("/auth/")) {
              window.location.assign(to);
              return;
            }
            if (replace) router.replace(to);
            else router.push(to);
            router.refresh();
          }}
          Link={AuthLink}
        >
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
