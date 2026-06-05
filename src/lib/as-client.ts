/**
 * AS interaction protocol client.
 *
 * Server-only. Each call signs a fresh JWT that carries the operation payload
 * and serves as the Bearer credential — there is no intermediate access token.
 * See INTERACTION_PROTOCOL.md §7.
 */

import "server-only";
import { signJwt } from "./jws";
import { config } from "@/config";
import { authorizationApiPath, authorizationDecisionApiPath } from "./authorization";

export type Client = {
  client_id?: string;
  name?: string;
  logo_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
};

export type Scope = {
  name: string;
  description?: string;
};

export type AuthorizationDetails = {
  client: Client;
  needs: Array<"authentication" | "consent">;
  skip: boolean;
  login_hint?: string;
  prompt?: string;
  acr_values?: string[];
  max_age?: number;
  ui_locales?: string[];
  subject: string | null;
  requested_scopes: Scope[];
  requested_claims?: unknown;
  previously_granted_scopes?: string[];
};

export type ApprovedDecision = {
  outcome: "approved";
  subject: string;
  acr?: string;
  amr?: string[];
  authenticated_at?: number;
  granted_scopes?: string[];
  user_claims?: Record<string, unknown>;
  granted_claims?: Record<string, unknown>;
};

export type DeniedDecision = {
  outcome: "denied";
  error: string;
  error_description?: string;
};

export type Decision = ApprovedDecision | DeniedDecision;

export class AuthorizationNotFoundError extends Error {
  constructor(public id: string) {
    super(`AS authorization not found: ${id}`);
  }
}

async function asFetch(
  path: string,
  payload: Record<string, unknown>,
  authorizationId: string,
  init: RequestInit = {},
): Promise<Response> {
  const jwt = await signJwt(payload);
  const res = await fetch(`${config.asBaseUrl}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${jwt}`,
    },
  });
  if (res.status === 404) throw new AuthorizationNotFoundError(authorizationId);
  if (!res.ok) {
    throw new Error(`AS ${init.method ?? "GET"} ${path} returned ${res.status}: ${await res.text()}`);
  }
  return res;
}

export async function getAuthorization(id: string): Promise<AuthorizationDetails> {
  const res = await asFetch(authorizationApiPath(id), { authorization: id }, id);
  return (await res.json()) as AuthorizationDetails;
}

export async function submitDecision(
  id: string,
  decision: Decision,
): Promise<{ redirect_to: string }> {
  // The decision lives in the JWT claims, not in an HTTP body — the signature
  // binds the decision to this request.
  const res = await asFetch(
    authorizationDecisionApiPath(id),
    { authorization: id, decision },
    id,
    { method: "POST" },
  );
  return (await res.json()) as { redirect_to: string };
}
