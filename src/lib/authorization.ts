/**
 * Shared helpers for the AS authorization-transaction flow. Centralises the
 * URL conventions so paths used in the page, server action, redirect override,
 * and the AS client never drift.
 */

import type { Client } from "@/lib/as-client";

/** Marks that the user has already picked an account for this request, so the
 * select_account chooser fires once and doesn't loop. */
export const ACCOUNT_SELECTED_PARAM = "account_selected";

/** Path on auth-ui where the user lands for an in-flight authorization. */
export function authorizationEntryPath(id: string): string {
  return `/authorizations/${encodeURIComponent(id)}`;
}

/** Authorization entry URL, carrying the interaction token and (optionally) the
 * account-chosen marker. Used to return to the flow after picking an account. */
export function authorizationEntryUrl(
  id: string,
  interaction: string,
  opts: { accountSelected?: boolean } = {},
): string {
  const params = new URLSearchParams({ interaction });
  if (opts.accountSelected) params.set(ACCOUNT_SELECTED_PARAM, "1");
  return `${authorizationEntryPath(id)}?${params.toString()}`;
}

/**
 * Sign-in URL that returns the user to the in-flight authorization once authed.
 * Uses better-auth-ui's native `redirectTo` param — the Auth view reads it from
 * the URL, carries it across the sign-in↔sign-up links, and redirects there on
 * success, so no custom redirect wrapper is needed.
 */
export function signInUrlForAuthorization(id: string, interaction?: string, loginHint?: string): string {
  const entry = interaction
    ? `${authorizationEntryPath(id)}?interaction=${encodeURIComponent(interaction)}`
    : authorizationEntryPath(id);
  const params = new URLSearchParams({ redirectTo: entry });
  if (loginHint) params.set("login_hint", loginHint);
  return `/auth/sign-in?${params.toString()}`;
}

/** AS API path: fetch the in-flight authorization. */
export function authorizationApiPath(id: string): string {
  return `/api/authorizations/${encodeURIComponent(id)}`;
}

/** AS API path: report an interaction outcome against the in-flight authorization. */
export function authorizationOutcomeApiPath(id: string): string {
  return `${authorizationApiPath(id)}/outcome`;
}

export function clientDisplayName(client: Client): string {
  return client.name ?? client.client_id ?? "An application";
}
