/**
 * Shared helpers for the AS interaction flow — kept in one place so the
 * `interaction` query-key never drifts between the page, server action,
 * and the redirect-override component.
 */

import type { InteractionClient } from "@/lib/as-client";

export const INTERACTION_PARAM = "interaction";

export function signInUrlForInteraction(ticket: string): string {
  return `/auth/sign-in?${INTERACTION_PARAM}=${encodeURIComponent(ticket)}`;
}

export function homeUrlForInteraction(ticket: string): string {
  return `/?${INTERACTION_PARAM}=${encodeURIComponent(ticket)}`;
}

export function clientDisplayName(client: InteractionClient): string {
  return client.name ?? client.client_id ?? "An application";
}
