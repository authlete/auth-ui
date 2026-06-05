/**
 * Shared helpers for the AS authorization-transaction flow. Centralises the
 * URL conventions so paths used in the page, server action, redirect override,
 * and the AS client never drift.
 */

import type { Client } from "@/lib/as-client";

export const AUTHORIZATION_RETURN_PARAM = "next";

/** Path on auth-ui where the user lands for an in-flight authorization. */
export function authorizationEntryPath(id: string): string {
  return `/authorizations/${encodeURIComponent(id)}`;
}

/** Sign-in URL that returns the user to the in-flight authorization once authed. */
export function signInUrlForAuthorization(id: string): string {
  return `/auth/sign-in?${AUTHORIZATION_RETURN_PARAM}=${encodeURIComponent(authorizationEntryPath(id))}`;
}

/** AS API path: fetch the in-flight authorization. */
export function authorizationApiPath(id: string): string {
  return `/api/authorizations/${encodeURIComponent(id)}`;
}

/** AS API path: submit decision against the in-flight authorization. */
export function authorizationDecisionApiPath(id: string): string {
  return `${authorizationApiPath(id)}/decision`;
}

export function clientDisplayName(client: Client): string {
  return client.name ?? client.client_id ?? "An application";
}
