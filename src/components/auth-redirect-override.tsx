/**
 * Per-page AuthProvider override.
 *
 * Two jobs:
 *   1. Redirect post-sign-in to /?interaction=<ticket> (overriding the
 *      layout-level default).
 *   2. Preserve the interaction query string across the registry's internal
 *      navigations and Link-rendered hrefs (between sign-in ↔ sign-up etc.)
 *      so users can finish the original authorization flow after signing up.
 */

"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ComponentType, type ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";
import { authClient } from "@/lib/auth-client";
import { INTERACTION_PARAM, homeUrlForInteraction } from "@/lib/interaction";

type Props = {
  interaction: string;
  children: ReactNode;
};

function withInteraction(to: string, interaction: string): string {
  if (!to.startsWith("/auth/") && !to.startsWith("/?")) return to;
  if (to.includes(`${INTERACTION_PARAM}=`)) return to;
  const separator = to.includes("?") ? "&" : "?";
  return `${to}${separator}${INTERACTION_PARAM}=${encodeURIComponent(interaction)}`;
}

export function AuthRedirectOverride({ interaction, children }: Props) {
  const router = useRouter();

  const InteractionLink: ComponentType<
    React.PropsWithChildren<{ className?: string; href: string; to?: string }>
  > = forwardRef(function InteractionLink({ href, ...props }, _ref) {
    return <NextLink href={withInteraction(href, interaction)} {...props} />;
  }) as ComponentType<React.PropsWithChildren<{ className?: string; href: string; to?: string }>>;

  return (
    <AuthProvider
      authClient={authClient}
      redirectTo={homeUrlForInteraction(interaction)}
      navigate={({ to, replace }) => {
        const url = withInteraction(to, interaction);
        return replace ? router.replace(url) : router.push(url);
      }}
      Link={InteractionLink}
    >
      {children}
    </AuthProvider>
  );
}
