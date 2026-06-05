/**
 * Smoke test: obtain an AS access token via client_credentials + private_key_jwt.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-as-token.mjs
 *
 * Verifies, in one shot, that:
 *   - auth-ui's private JWK can sign an ES256 client_assertion
 *   - the AS /oauth/token endpoint accepts it
 *   - Authlete validates the assertion against the registered client JWKS
 *   - the AS issues a Bearer token with the urn:authlete-as:interactions scope
 *
 * Prints the public bits of the JWT it sent and the token response (truncated
 * access token). Exits non-zero on failure.
 */

import { SignJWT, importJWK } from "jose";
import { randomUUID } from "node:crypto";

const required = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var: ${k}`);
    process.exit(1);
  }
  return v;
};

const AS_BASE_URL = required("AS_BASE_URL");
const CLIENT_ID = required("AS_CLIENT_ID");
const ALG = required("AS_CLIENT_KEY_ALG");
const JWK = JSON.parse(required("AS_CLIENT_PRIVATE_KEY"));

const tokenUrl = `${AS_BASE_URL}/oauth/token`;
const scope = "urn:authlete-as:interactions";

// Discover the issuer — Authlete validates client_assertion's `aud` against
// the service's issuer URL, not the token endpoint URL.
const discoveryUrl = `${AS_BASE_URL}/.well-known/openid-configuration`;
const discoveryRes = await fetch(discoveryUrl);
if (!discoveryRes.ok) {
  console.error(`Discovery failed: ${discoveryRes.status}`);
  process.exit(1);
}
const { issuer } = await discoveryRes.json();
console.log("→ discovered issuer:", issuer);
const audience = issuer;

const key = await importJWK(JWK, ALG);
const now = Math.floor(Date.now() / 1000);
const assertion = await new SignJWT({})
  .setProtectedHeader({ alg: ALG, kid: JWK.kid, typ: "JWT" })
  .setIssuer(CLIENT_ID)
  .setSubject(CLIENT_ID)
  .setAudience(audience)
  .setIssuedAt(now)
  .setExpirationTime(now + 60)
  .setJti(randomUUID())
  .sign(key);

console.log("→ POST", tokenUrl);
console.log("→ client_assertion header:", assertion.split(".")[0]);
console.log("→ client_assertion payload:",
  Buffer.from(assertion.split(".")[1], "base64url").toString("utf-8"));

const body = new URLSearchParams({
  grant_type: "client_credentials",
  scope,
  client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  client_assertion: assertion,
});

const res = await fetch(tokenUrl, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body,
});

const text = await res.text();
console.log("\n← status:", res.status);
console.log("← content-type:", res.headers.get("content-type"));
console.log("← cache-control:", res.headers.get("cache-control"));
console.log("← www-authenticate:", res.headers.get("www-authenticate"));

let payload;
try {
  payload = JSON.parse(text);
} catch {
  console.log("← body (raw):", text);
  process.exit(res.ok ? 0 : 1);
}

if (payload.access_token) {
  const head = payload.access_token.slice(0, 16);
  const tail = payload.access_token.slice(-8);
  console.log("← access_token:", `${head}…${tail} (${payload.access_token.length} chars)`);
  console.log("← token_type:", payload.token_type);
  console.log("← expires_in:", payload.expires_in);
  console.log("← scope:", payload.scope);
} else {
  console.log("← body:", JSON.stringify(payload, null, 2));
}

process.exit(res.ok ? 0 : 1);
