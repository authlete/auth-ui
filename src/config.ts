/**
 * Single source of truth for env vars. Imports throughout the app should pull
 * from here so the env surface is explicit and easy to audit.
 *
 * Required vars throw at module load — fail fast in dev, fail at boot in prod.
 * Interaction-protocol config is read lazily via `getInteractionProtocolConfig()`.
 */

import { socialProviderList, type SocialProvider } from "better-auth/social-providers";

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) throw new Error(`Missing required env var: ${name}`);
  return v;
}

/**
 * Social/OIDC sign-in is env-gated: a provider turns on only when both its
 * `<PROVIDER>_CLIENT_ID` and `<PROVIDER>_CLIENT_SECRET` are set (e.g.
 * GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET). Nothing set — the default for
 * local dev — means no social buttons, username/password only. Set the pair in
 * Vercel to light a provider up; no code change per provider. Covers the OIDC
 * majors (google, apple, microsoft, linkedin, cognito) and every other
 * better-auth built-in.
 */
function buildSocialProviders(): Record<string, { clientId: string; clientSecret: string }> {
  const providers: Record<string, { clientId: string; clientSecret: string }> = {};
  for (const id of socialProviderList) {
    const clientId = process.env[`${id.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${id.toUpperCase()}_CLIENT_SECRET`];
    if (clientId && clientSecret) providers[id] = { clientId, clientSecret };
  }
  return providers;
}

const socialProviders = buildSocialProviders();

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
  // Email. Optional in dev: with no RESEND_API_KEY, auth emails are logged to
  // the console instead of sent (see src/lib/email.ts), so local dev needs no
  // provider — the console is to email what the file: DB is to libSQL.
  resendApiKey: process.env.RESEND_API_KEY || undefined,
  emailFrom: optional("EMAIL_FROM", "Auth UI <onboarding@resend.dev>"),
  // Server-side provider config (carries secrets) + the public list of enabled
  // provider ids to hand to the client so it renders the matching buttons.
  socialProviders,
  enabledSocialProviderIds: Object.keys(socialProviders) as SocialProvider[],
} as const;

// Two inputs: the AS's issuer id (its stable identity — the trust anchor, and the
// origin its JWKS is fetched from) and auth-ui's own signing key. auth-ui's own
// identity is its base URL. The AS's per-request callback URL rides the interaction
// token (INTERACTION_PROTOCOL.md §1), not this config.
export function getInteractionProtocolConfig() {
  const asIssuerId = optional("AS_ISSUER_ID", "http://localhost:3000");
  return {
    authUiIssuerId: required("BETTER_AUTH_URL"),
    asIssuerId,
    asJwksUri: `${asIssuerId}/.well-known/jwks.json`,
    authUiJwks: required("AUTH_UI_JWKS"),
  };
}

export type Config = typeof config;
