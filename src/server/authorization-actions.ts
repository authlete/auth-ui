/**
 * Server actions for the authorization decision flow. Both call the AS and
 * then issue a Next.js `redirect()` (which throws NEXT_REDIRECT) to navigate
 * the browser to the AS's /resume.
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { submitDecision } from "@/lib/as-client";
import { signInUrlForAuthorization } from "@/lib/authorization";

function requireAuthorizationId(formData: FormData, action: string): string {
  const id = formData.get("authorization");
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${action}: missing authorization id`);
  }
  return id;
}

export async function approveAuthorization(formData: FormData): Promise<void> {
  const id = requireAuthorizationId(formData, "approveAuthorization");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(signInUrlForAuthorization(id));

  const grantedScopes = formData.getAll("granted_scope").map((v) => String(v));

  // Session createdAt is the authenticated lifetime's start — closest stand-in
  // for the auth event time when no MFA / step-up has happened since.
  const authenticatedAt = session.session.createdAt
    ? Math.floor(new Date(session.session.createdAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const userClaims: Record<string, unknown> = {
    sub: session.user.id,
    name: session.user.name,
    email: session.user.email,
    email_verified: session.user.emailVerified ?? false,
  };

  const { redirect_to } = await submitDecision(id, {
    outcome: "approved",
    subject: session.user.id,
    amr: ["pwd"],
    authenticated_at: authenticatedAt,
    granted_scopes: grantedScopes,
    user_claims: userClaims,
  });

  redirect(redirect_to);
}

export async function denyAuthorization(formData: FormData): Promise<void> {
  const id = requireAuthorizationId(formData, "denyAuthorization");

  const { redirect_to } = await submitDecision(id, {
    outcome: "denied",
    error: "access_denied",
    error_description: "User denied the authorization request",
  });

  redirect(redirect_to);
}
