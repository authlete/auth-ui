/**
 * Catch-all auth route — renders <Auth path={...} /> from the better-auth-ui
 * shadcn registry. Handles sign-in, sign-up, sign-out, forgot-password,
 * reset-password based on the path segment.
 *
 * If `?next=<path>` is present (typically `/authorizations/<id>`), the page
 * wraps the auth view in <AuthRedirectOverride next=...> so post-sign-in
 * navigation lands back at the in-flight authorization page instead of the
 * default home.
 */

import { notFound } from "next/navigation";
import { Auth } from "@/components/auth/auth";
import { AuthRedirectOverride } from "@/components/auth-redirect-override";
import { SplitLayout } from "@/components/layouts/split-layout";

const VALID_AUTH_PATHS = new Set([
  "sign-in",
  "sign-up",
  "sign-out",
  "forgot-password",
  "reset-password",
]);

type PageProps = {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function AuthPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  if (!VALID_AUTH_PATHS.has(path)) notFound();

  const { next } = await searchParams;
  const inAuthorizationFlow = typeof next === "string" && next.length > 0;
  const view = (
    <SplitLayout
      brandHeadline={inAuthorizationFlow ? "Almost there." : "Welcome."}
      brandSubhead={
        inAuthorizationFlow
          ? "Sign in to continue to the application that sent you here."
          : "Sign in or create an account to use Authlete-backed applications."
      }
    >
      <Auth path={path} />
    </SplitLayout>
  );

  if (inAuthorizationFlow) {
    return <AuthRedirectOverride next={next}>{view}</AuthRedirectOverride>;
  }

  return view;
}
