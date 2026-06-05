/**
 * Single source of truth for env vars. Imports throughout the app should pull
 * from here so the env surface is explicit and easy to audit.
 *
 * Required vars throw at module load — fail fast in dev, fail at boot in prod.
 * Vars only needed for Phase C onward (AS client integration) are read lazily
 * via `getAsClientConfig()` so Phases A and B can run without them.
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

export function getAsClientConfig() {
  return {
    asBaseUrl: required("AS_BASE_URL"),
    clientId: required("AS_CLIENT_ID"),
    clientPrivateKey: required("AS_CLIENT_PRIVATE_KEY"),
    clientKeyAlg: optional("AS_CLIENT_KEY_ALG", "RS256"),
  };
}

export type Config = typeof config;
