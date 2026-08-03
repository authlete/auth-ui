/**
 * Server actions for the consent interaction. Each reports the consent outcome
 * to the AS and then issues a Next.js `redirect()` to the AS's /resume. (The
 * authenticate outcome is reported earlier, by the authorization page.)
 */

"use server";

import { redirect } from "next/navigation";
import { submitOutcome } from "@/lib/as-client";

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

  const step = await submitOutcome(asBase, id, { type: "consent", granted_scopes: grantedScopes });
  if (step.next === "done") redirect(step.redirect_to);
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
