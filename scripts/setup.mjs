#!/usr/bin/env node
/**
 * One-shot local setup: creates .env from .env.example, fills the two secrets
 * that would otherwise need manual generation, and migrates the local SQLite
 * schema. Idempotent — existing values are never overwritten.
 *
 *   npm install && npm run setup && npm run dev
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { generateJwks } from "./keygen.mjs";

const log = (msg) => console.log(`setup: ${msg}`);

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  log("created .env from .env.example");
} else {
  log(".env already exists — filling blanks only");
}

let env = readFileSync(".env", "utf-8");

function fill(name, value, description) {
  const blank = new RegExp(`^${name}=\\s*$`, "m");
  if (blank.test(env)) {
    env = env.replace(blank, `${name}=${value}`);
    log(`generated ${name} (${description})`);
  }
}

fill("BETTER_AUTH_SECRET", randomBytes(32).toString("base64"), "session secret");
fill("AUTH_UI_JWKS", await generateJwks(), "ES256 interaction signing key");
writeFileSync(".env", env);

const migrate = spawnSync("npm", ["run", "migrate"], { stdio: "inherit" });
if (migrate.status !== 0) {
  log("migrate failed — fix the DATABASE_URL in .env and run `npm run migrate`");
  process.exit(migrate.status ?? 1);
}
log("done — `npm run dev` to start");
