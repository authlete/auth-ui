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
  asBaseUrl: optional("AS_BASE_URL", "http://localhost:3000"),
  sqliteDbPath: optional("SQLITE_DB_PATH", "./data/auth-ui.sqlite"),
  port: parseInt(optional("PORT", "3001"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
} as const;

export function getInteractionProtocolConfig() {
  const authUiBase = required("BETTER_AUTH_URL");
  const asBase = required("AS_BASE_URL");
  return {
    authUiIssuerId: optional("AUTH_UI_ISSUER_ID", authUiBase),
    asIssuerId: optional("AS_ISSUER_ID", asBase),
    asJwksUri: optional("AS_JWKS_URI", `${asBase}/oauth/jwks`),
    authUiJwks: required("AUTH_UI_JWKS"),
    signingKid: process.env.AUTH_UI_SIGNING_KID || undefined,
    interactionChannel: optional("INTERACTION_CHANNEL", "backchannel") as
      | "backchannel"
      | "frontchannel",
  };
}

export type Config = typeof config;
