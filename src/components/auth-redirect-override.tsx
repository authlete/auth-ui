/**
 * Per-page AuthProvider override.
 *
 * Two jobs:
 *   1. Redirect post-sign-in to a caller-supplied next URL (the in-flight
 *      authorization's entry page) instead of the layout-level default.
 *   2. Preserve the `?next=<...>` query string across the registry's internal
 *      navigations and Link-rendered hrefs (between sign-in ↔ sign-up etc.)
 *      so users can resume the original authorization flow after signing up.
 */

"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ComponentType, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { AUTHORIZATION_RETURN_PARAM } from "@/lib/authorization";

type Props = {
  /** Where to send the user once auth finishes (typically /authorizations/<id>). */
  next: string;
  children: ReactNode;
};

function withNext(to: string, next: string): string {
  if (!to.startsWith("/auth/")) return to;
  if (to.includes(`${AUTHORIZATION_RETURN_PARAM}=`)) return to;
  const separator = to.includes("?") ? "&" : "?";
  return `${to}${separator}${AUTHORIZATION_RETURN_PARAM}=${encodeURIComponent(next)}`;
}

export function AuthRedirectOverride({ next, children }: Props) {
  const router = useRouter();

  const NextAwareLink: ComponentType<
    React.PropsWithChildren<{ className?: string; href: string; to?: string }>
  > = forwardRef(function NextAwareLink({ href, ...props }, _ref) {
    return <NextLink href={withNext(href, next)} {...props} />;
  }) as ComponentType<React.PropsWithChildren<{ className?: string; href: string; to?: string }>>;

  return (
    <AuthProvider
      authClient={authClient}
      redirectTo={next}
      navigate={({ to, replace }) => {
        const url = withNext(to, next);
        return replace ? router.replace(url) : router.push(url);
      }}
      Link={NextAwareLink}
    >
      {children}
    </AuthProvider>
  );
}
