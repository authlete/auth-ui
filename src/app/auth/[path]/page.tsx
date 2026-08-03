/**
 * Catch-all auth route — renders <Auth path={...} /> from the better-auth-ui
 * shadcn registry. Handles sign-in, sign-up, sign-out, forgot-password,
 * reset-password based on the path segment.
 *
 * Post-auth redirect is native: better-auth-ui reads `?redirectTo=` from the
 * URL, carries it across its own sign-in↔sign-up links, and redirects there on
 * success. Authorization flows arrive with `?redirectTo=/authorizations/<id>`.
 */

import { notFound } from "next/navigation";
import { Auth } from "@/components/auth/auth";
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
  searchParams: Promise<{ redirectTo?: string }>;
};

export default async function AuthPage({ params, searchParams }: PageProps) {
  const { path } = await params;
  if (!VALID_AUTH_PATHS.has(path)) notFound();

  const { redirectTo } = await searchParams;
  const inAuthorizationFlow = typeof redirectTo === "string" && redirectTo.length > 0;

  // Direct visits use the brand's default panel copy; mid-flow visits (returning
  // to an in-flight authorization) get a short contextual override.
  return inAuthorizationFlow ? (
    <SplitLayout
      brandHeadline="Almost there."
      brandSubhead="Sign in to continue to the application that sent you here."
    >
      <Auth path={path} />
    </SplitLayout>
  ) : (
    <SplitLayout>
      <Auth path={path} />
    </SplitLayout>
  );
}
