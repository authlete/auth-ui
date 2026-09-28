#!/usr/bin/env node
/**
 * Seeds the CIBA authentication-device table. Run once via `npm run migrate`,
 * alongside better-auth's own migration — not at request time. Idempotent.
 * Connection mirrors config.ts (libSQL file locally, Turso in prod).
 */
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.DATABASE_URL ?? "file:./data/auth-ui.sqlite",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await db.execute(`CREATE TABLE IF NOT EXISTS ciba_request (
  ticket     TEXT PRIMARY KEY,
  login_hint TEXT,
  expires_at INTEGER NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  payload    TEXT NOT NULL
)`);

console.log("migrate: ciba_request ready");
