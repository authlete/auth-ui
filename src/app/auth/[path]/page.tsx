/**
 * Catch-all auth route — renders <Auth path={...} /> from the better-auth-ui
 * shadcn registry. Handles sign-in, sign-up, sign-out, forgot-password,
 * reset-password based on the path segment.
 *
 * Interaction-aware redirect: if `?interaction=<ticket>` is present, this
 * page wraps the auth view in <AuthRedirectOverride redirectTo=...> with the
 * interaction URL so post-sign-in navigation lands back at /?interaction=…
 * instead of the layout-level default.
 */

import { notFound } from "next/navigation";
import { Auth } from "@/components/auth/auth";
import { AuthRedirectOverride } from "@/components/auth-redirect-override";
import { SplitLayout } from "@/components/layouts/split-layout";

// Mirrors better-auth-ui's `viewPaths.auth` so we can validate the segment
// before rendering. List here to avoid pulling a server-only @better-auth-ui/core
// import into a route file.
const VALID_AUTH_PATHS = new Set([
  "sign-in",
  "sign-up",
  "sign-out",
  "forgot-password",
  "reset-password",
]);

type PageProps = {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ interaction?: string }>;
};

export default async function AuthPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  if (!VALID_AUTH_PATHS.has(path)) notFound();

  const { interaction } = await searchParams;
  const view = (
    <SplitLayout
      brandHeadline={interaction ? "Almost there." : "Welcome."}
      brandSubhead={
        interaction
          ? "Sign in to continue to the application that sent you here."
          : "Sign in or create an account to use Authlete-backed applications."
      }
    >
      <Auth path={path} />
    </SplitLayout>
  );

  if (interaction) {
    return <AuthRedirectOverride interaction={interaction}>{view}</AuthRedirectOverride>;
  }

  return view;
}
