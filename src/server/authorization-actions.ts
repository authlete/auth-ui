/**
 * Server actions for the consent interaction. Each reports the consent outcome
 * to the AS and then issues a Next.js `redirect()` to the AS's /resume. (The
 * authenticate outcome is reported earlier, by the authorization page.)
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { submitOutcome } from "@/lib/as-client";
import { authorizationEntryUrl } from "@/lib/authorization";

function requireField(formData: FormData, field: string, action: string): string {
  const v = formData.get(field);
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${action}: missing ${field}`);
  }
  return v;
}

export async function approveConsent(formData: FormData): Promise<void> {
  const id = requireField(formData, "authorization", "approveConsent");
  const asBase = requireField(formData, "as_base", "approveConsent");
  const grantedScopes = formData.getAll("granted_scope").map((v) => String(v));

  // TODO(claims-leakage): the outcome carries granted_scopes only. Per-claim
  // consent needs a granted_claims list here, which the AS forwards to Authlete
  // as consentedClaims (see the AS's routes/userinfo.ts TODO).
  const step = await submitOutcome(asBase, id, { type: "consent", granted_scopes: grantedScopes });
  if (step.next === "done") redirect(step.redirect_to);
}

/**
 * prompt=select_account: make the chosen device session active, then return to
 * the authorization entry with the account-chosen marker so the flow proceeds
 * with that account instead of re-showing the chooser.
 */
export async function selectAccount(formData: FormData): Promise<void> {
  const id = requireField(formData, "authorization", "selectAccount");
  const interaction = requireField(formData, "interaction", "selectAccount");
  const sessionToken = requireField(formData, "session_token", "selectAccount");

  await auth.api.setActiveSession({ body: { sessionToken }, headers: await headers() });
  redirect(authorizationEntryUrl(id, interaction, { accountSelected: true }));
}

export async function denyConsent(formData: FormData): Promise<void> {
  const id = requireField(formData, "authorization", "denyConsent");
  const asBase = requireField(formData, "as_base", "denyConsent");

  const step = await submitOutcome(asBase, id, {
    type: "consent",
    error: "access_denied",
    error_description: "User denied the authorization request",
  });
  if (step.next === "done") redirect(step.redirect_to);
}
