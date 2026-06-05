/**
 * Server actions for the interaction flow. Both call the AS and then issue
 * a Next.js `redirect()` (which throws NEXT_REDIRECT) to navigate the browser.
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { submitInteraction } from "@/lib/as-client";
import { signInUrlForInteraction } from "@/lib/interaction";

function requireTicket(formData: FormData, action: string): string {
  const ticket = formData.get("ticket");
  if (typeof ticket !== "string" || ticket.length === 0) {
    throw new Error(`${action}: missing ticket`);
  }
  return ticket;
}

export async function approveInteraction(formData: FormData): Promise<void> {
  const ticket = requireTicket(formData, "approveInteraction");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(signInUrlForInteraction(ticket));

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

  const { redirect_to } = await submitInteraction(ticket, {
    outcome: "approved",
    subject: session.user.id,
    amr: ["pwd"],
    authenticated_at: authenticatedAt,
    granted_scopes: grantedScopes,
    user_claims: userClaims,
  });

  redirect(redirect_to);
}

export async function denyInteraction(formData: FormData): Promise<void> {
  const ticket = requireTicket(formData, "denyInteraction");

  const { redirect_to } = await submitInteraction(ticket, {
    outcome: "denied",
    error: "access_denied",
    error_description: "User denied the authorization request",
  });

  redirect(redirect_to);
}
