/**
 * Better-Auth server config — email + password over libSQL.
 *
 * libSQL means one code path for both environments: a local file
 * (`file:./data/auth-ui.sqlite`) in dev, and a Turso database in production
 * via DATABASE_URL + DATABASE_AUTH_TOKEN. See `config.ts`.
 *
 * `nextCookies()` MUST be the last plugin so server actions can set cookies
 * per better-auth's Next.js integration.
 */

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { multiSession } from "better-auth/plugins";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { config } from "@/config";
import { sendEmail } from "@/lib/email";

const dialect = new LibsqlDialect({
  url: config.databaseUrl,
  authToken: config.databaseAuthToken,
});

export const auth = betterAuth({
  database: { dialect, type: "sqlite" },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password:\n${url}`,
      });
    },
  },
  // Sends a verification link on sign-up. Not required for sign-in yet (flip
  // requireEmailVerification on emailAndPassword to enforce it).
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Verify your email:\n${url}`,
      });
    },
  },
  // Env-gated (see config.ts). Empty when no provider env is set — callback
  // URLs are auto-derived as {BETTER_AUTH_URL}/api/auth/callback/{provider}.
  socialProviders: config.socialProviders,
  advanced: {
    useSecureCookies: config.nodeEnv === "production",
  },
  trustedOrigins: [config.betterAuthUrl],
  // multiSession lets several accounts stay signed in on one device (device
  // sessions), which powers the prompt=select_account chooser. nextCookies MUST
  // stay last so server actions can set the session cookies it writes.
  plugins: [multiSession(), nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
