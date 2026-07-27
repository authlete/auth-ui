/**
 * Single source of truth for env vars. Imports throughout the app should pull
 * from here so the env surface is explicit and easy to audit.
 *
 * Required vars throw at module load — fail fast in dev, fail at boot in prod.
 * Interaction-protocol config is read lazily via `getInteractionProtocolConfig()`.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export const config = {
  betterAuthSecret: required("BETTER_AUTH_SECRET"),
  betterAuthUrl: required("BETTER_AUTH_URL"),
  // libSQL connection. Local dev uses a plain file; Vercel points this at a
  // free Turso database. DATABASE_AUTH_TOKEN is only set for remote (Turso).
  databaseUrl: optional("DATABASE_URL", "file:./data/auth-ui.sqlite"),
  databaseAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  port: parseInt(optional("PORT", "3001"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
} as const;

// Two inputs: the AS's base URL (its identity, and the origin its JWKS is
// derived from) and auth-ui's own signing key. auth-ui's identity is its own
// base URL; the AS's callback base arrives per-request in the interaction token
// (INTERACTION_PROTOCOL.md §1).
export function getInteractionProtocolConfig() {
  const asUrl = optional("AS_URL", "http://localhost:3000");
  return {
    authUiIssuerId: required("BETTER_AUTH_URL"),
    asIssuerId: asUrl,
    asJwksUri: `${asUrl}/.well-known/jwks.json`,
    authUiJwks: required("AUTH_UI_JWKS"),
  };
}

export type Config = typeof config;
