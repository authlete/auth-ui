/**
 * AS component-protocol client.
 *
 * Server-only. Caches a `private_key_jwt`-issued access token and exposes
 * two calls against the AS: `getInteraction` and `submitInteraction`.
 *
 * The client_assertion's `aud` is the AS issuer URL (discovered from
 * /.well-known/openid-configuration) because Authlete validates aud against
 * the issuer, not the token endpoint URL.
 */

import "server-only";
import { randomUUID } from "node:crypto";
import { SignJWT, importJWK, type JWK } from "jose";
import { getAsClientConfig } from "@/config";

const INTERACTION_SCOPE = "urn:authlete-as:interactions";
const ASSERTION_TTL_SECONDS = 60;
const TOKEN_REFRESH_MARGIN_SECONDS = 30;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;
let cachedIssuer: string | null = null;

async function getIssuer(asBaseUrl: string): Promise<string> {
  if (cachedIssuer) return cachedIssuer;
  const res = await fetch(`${asBaseUrl}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`AS discovery failed: ${res.status}`);
  const body = (await res.json()) as { issuer?: string };
  if (!body.issuer) throw new Error("AS discovery response missing 'issuer'");
  cachedIssuer = body.issuer;
  return body.issuer;
}

async function mintAccessToken(): Promise<{ accessToken: string; expiresAt: number }> {
  const cfg = getAsClientConfig();
  const issuer = await getIssuer(cfg.asBaseUrl);
  const jwk = JSON.parse(cfg.clientPrivateKey) as JWK;
  const key = await importJWK(jwk, cfg.clientKeyAlg);
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({})
    .setProtectedHeader({ alg: cfg.clientKeyAlg, kid: jwk.kid, typ: "JWT" })
    .setIssuer(cfg.clientId)
    .setSubject(cfg.clientId)
    .setAudience(issuer)
    .setIssuedAt(now)
    .setExpirationTime(now + ASSERTION_TTL_SECONDS)
    .setJti(randomUUID())
    .sign(key);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: INTERACTION_SCOPE,
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
  });

  const res = await fetch(`${cfg.asBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`AS /oauth/token returned ${res.status}: ${await res.text()}`);
  const payload = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("AS /oauth/token response missing access_token");
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  return { accessToken: payload.access_token, expiresAt: now + expiresIn };
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + TOKEN_REFRESH_MARGIN_SECONDS) {
    return cachedToken.accessToken;
  }
  cachedToken = await mintAccessToken();
  return cachedToken.accessToken;
}

/** Bearer-authenticated fetch against `/api/interactions/{ticket}`, with 404 mapping. */
async function interactionFetch(ticket: string, init: RequestInit = {}): Promise<Response> {
  const { asBaseUrl } = getAsClientConfig();
  const token = await getAccessToken();
  const res = await fetch(`${asBaseUrl}/api/interactions/${encodeURIComponent(ticket)}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 404) throw new InteractionNotFoundError(ticket);
  if (!res.ok) {
    throw new Error(
      `AS ${init.method ?? "GET"} /api/interactions returned ${res.status}: ${await res.text()}`,
    );
  }
  return res;
}

export type InteractionClient = {
  client_id?: string;
  name?: string;
  logo_uri?: string;
  policy_uri?: string;
  tos_uri?: string;
};

export type InteractionScope = {
  name: string;
  description?: string;
};

export type InteractionDetails = {
  client: InteractionClient;
  needs: Array<"authentication" | "consent">;
  skip: boolean;
  login_hint?: string;
  prompt?: string;
  acr_values?: string[];
  max_age?: number;
  ui_locales?: string[];
  subject: string | null;
  requested_scopes: InteractionScope[];
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

export class InteractionNotFoundError extends Error {
  constructor(public ticket: string) {
    super(`AS interaction not found: ${ticket}`);
  }
}

export async function getInteraction(ticket: string): Promise<InteractionDetails> {
  const res = await interactionFetch(ticket);
  return (await res.json()) as InteractionDetails;
}

export async function submitInteraction(
  ticket: string,
  decision: Decision,
): Promise<{ redirect_to: string }> {
  const body =
    decision.outcome === "approved"
      ? {
          subject: decision.subject,
          acr: decision.acr,
          amr: decision.amr,
          authenticated_at: decision.authenticated_at,
          granted_scopes: decision.granted_scopes,
          user_claims: decision.user_claims,
          granted_claims: decision.granted_claims,
        }
      : {
          error: decision.error,
          error_description: decision.error_description,
        };

  const res = await interactionFetch(ticket, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { redirect_to: string };
}
