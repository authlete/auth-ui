/**
 * AS interaction protocol client.
 *
 * Server-only. Each call signs a fresh JWT that carries the operation payload
 * and serves as the Bearer credential — there is no intermediate access token.
 * Spec: the "Operations" section of INTERACTION_PROTOCOL.md in the
 * typescript-oauth-server repo.
 */

import "server-only";
import { signJwt, verifyJwt } from "./jws";
import { authorizationApiPath, authorizationOutcomeApiPath } from "./authorization";

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

/** A standard RFC 9396 authorization_details element, as relayed by the AS. */
export type RarElement = {
  type: string;
  actions?: string[];
  locations?: string[];
  identifier?: string;
  privileges?: string[];
  [key: string]: unknown;
};

/** GET response — the first interaction (authenticate) plus client display info. */
export type AuthorizationState = {
  client: Client;
  next: "authenticate";
  authenticate: {
    acr_values?: string[];
    max_age?: number;
    prompt?: string;
    login_hint?: string;
    ui_locales?: string[];
  };
};

/** Reply to a reported outcome — the next step. */
export type NextStep =
  | {
      next: "consent";
      consent: { new: Scope[]; already_granted: Scope[]; authorization_details?: RarElement[] };
    }
  | { next: "done"; redirect_to: string };

/** What auth-ui reports back for an interaction. */
export type Outcome =
  | {
      type: "authenticate";
      subject: string;
      acr?: string;
      amr?: string[];
      authenticated_at?: number;
      user_claims?: Record<string, unknown>;
    }
  | { type: "consent"; granted_scopes: string[] }
  | { type: "authenticate" | "consent"; error: string; error_description?: string };

export class AuthorizationNotFoundError extends Error {
  constructor(public id: string) {
    super(`AS authorization not found: ${id}`);
  }
}

/**
 * Verify the AS interaction token (INTERACTION_PROTOCOL.md §1) and return the
 * callback base it carries plus its issue time — the one place `asBase` is
 * trust-checked. `issuedAt` (the token's `iat`, in seconds) marks when the
 * authorization request started, used to satisfy `prompt=login` exactly once.
 */
export async function verifyInteraction(
  interaction: string,
  id: string,
): Promise<{ asBase: string; issuedAt: number }> {
  const payload = await verifyJwt(interaction);
  if (payload.authorization !== id) throw new AuthorizationNotFoundError(id);
  const asBase = payload.as_base;
  if (typeof asBase !== "string" || asBase.length === 0) {
    throw new Error("interaction token missing as_base");
  }
  return { asBase, issuedAt: payload.iat ?? 0 };
}

/**
 * Sign a JWT carrying `claims` and call the AS with it as the bearer credential.
 * The one place the mutual-JWT request shape lives; shared by the authorization
 * transaction below and the authorized-apps client.
 */
export async function fetchFromAs(
  base: string,
  path: string,
  claims: Record<string, unknown>,
  init: RequestInit = {},
): Promise<Response> {
  const jwt = await signJwt(claims);
  return fetch(`${base}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${jwt}` },
  });
}

/** Call an authorization-transaction endpoint, mapping AS errors to typed ones. */
async function callAuthorization(
  asBase: string,
  path: string,
  claims: Record<string, unknown>,
  authorizationId: string,
  init: RequestInit = {},
): Promise<Response> {
  const res = await fetchFromAs(asBase, path, claims, init);
  if (res.status === 404) throw new AuthorizationNotFoundError(authorizationId);
  if (!res.ok) {
    throw new Error(
      `AS ${init.method ?? "GET"} ${path} returned ${res.status}: ${await res.text()}`,
    );
  }
  return res;
}

export async function getAuthorization(asBase: string, id: string): Promise<AuthorizationState> {
  const res = await callAuthorization(asBase, authorizationApiPath(id), { authorization: id }, id);
  return (await res.json()) as AuthorizationState;
}

export async function submitOutcome(
  asBase: string,
  id: string,
  outcome: Outcome,
): Promise<NextStep> {
  // The outcome lives in the JWT claims, not in an HTTP body — the signature
  // binds it to this request. The AS replies with the next step.
  const res = await callAuthorization(
    asBase,
    authorizationOutcomeApiPath(id),
    { authorization: id, outcome },
    id,
    { method: "POST" },
  );
  return (await res.json()) as NextStep;
}
