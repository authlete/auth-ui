/**
 * Better-Auth server config — email + password against a local SQLite DB.
 *
 * `nextCookies()` MUST be the last plugin so server actions can set cookies
 * per better-auth's Next.js integration.
 */

import path from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { config } from "@/config";

const dbPath = path.isAbsolute(config.sqliteDbPath)
  ? config.sqliteDbPath
  : path.resolve(process.cwd(), config.sqliteDbPath);

export const auth = betterAuth({
  database: new Database(dbPath),
  emailAndPassword: { enabled: true },
  advanced: {
    useSecureCookies: config.nodeEnv === "production",
  },
  trustedOrigins: [config.betterAuthUrl, config.asBaseUrl],
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
