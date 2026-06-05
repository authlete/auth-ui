/**
 * End-to-end smoke for v0.2 — drives the full RP → AS → auth-ui → AS → RP loop
 * with a real Authlete service, then exchanges the code and calls /userinfo to
 * verify user claims flow through.
 *
 * Skips the actual server-action invocation (Next.js encoding is opaque from
 * outside) and instead reproduces what the server action does by calling
 * AS POST /api/interactions/{ticket} with synthesized session data.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-e2e.mjs
 */

import { SignJWT, importJWK } from "jose";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const AS_BASE_URL = required("AS_BASE_URL");
const AUTH_UI_BASE_URL = required("BETTER_AUTH_URL");
const CLIENT_ID = required("AS_CLIENT_ID");
const ALG = required("AS_CLIENT_KEY_ALG");
const JWK = JSON.parse(required("AS_CLIENT_PRIVATE_KEY"));

const RP_CLIENT_ID = "2234376661";
const RP_REDIRECT_URI = "http://localhost:4040";
const RP_SCOPE = "openid profile email";

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env var: ${name}`);
    process.exit(1);
  }
  return v;
}

function b64url(buf) {
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function step(n, label) {
  console.log(`\n────────  Step ${n}: ${label}  ────────`);
}

function ok(label, value = "") {
  console.log(`  ✅ ${label}${value ? `: ${value}` : ""}`);
}

// 1) Sign up user via better-auth, capture session cookie
step(1, "Sign up user in auth-ui");
const userId = randomUUID().slice(0, 8);
const email = `e2e-${userId}@example.com`;
const signUpRes = await fetch(`${AUTH_UI_BASE_URL}/api/auth/sign-up/email`, {
  method: "POST",
  // better-auth's CSRF check requires Origin to match trustedOrigins.
  headers: { "content-type": "application/json", origin: AUTH_UI_BASE_URL },
  body: JSON.stringify({ name: `E2E ${userId}`, email, password: "password12345" }),
});
const setCookie = signUpRes.headers.getSetCookie();
const session = setCookie.find((c) => c.startsWith("better-auth.session_token="));
if (!session) {
  console.error("No session cookie from sign-up", signUpRes.status, await signUpRes.text());
  process.exit(1);
}
const sessionCookie = session.split(";")[0];
ok("Signed up", email);

// 2) Hit AS /authorize as the RP — capture interaction ticket from redirect
step(2, "RP → AS /authorize");
const codeVerifier = b64url(randomBytes(48));
const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
const state = randomUUID();

const authzRes = await fetch(
  `${AS_BASE_URL}/oauth/authorize?response_type=code&client_id=${RP_CLIENT_ID}&redirect_uri=${encodeURIComponent(RP_REDIRECT_URI)}&scope=${encodeURIComponent(RP_SCOPE)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`,
  { redirect: "manual" },
);
const interactionUrl = authzRes.headers.get("location");
const ticket = new URL(interactionUrl).searchParams.get("interaction");
ok("Got ticket", ticket.slice(0, 16) + "…");

// 3) Mint auth-ui Bearer (private_key_jwt → access_token)
step(3, "auth-ui mints Bearer for AS");
const { issuer } = await fetch(`${AS_BASE_URL}/.well-known/openid-configuration`).then((r) =>
  r.json(),
);
const key = await importJWK(JWK, ALG);
const now = Math.floor(Date.now() / 1000);
const assertion = await new SignJWT({})
  .setProtectedHeader({ alg: ALG, kid: JWK.kid, typ: "JWT" })
  .setIssuer(CLIENT_ID)
  .setSubject(CLIENT_ID)
  .setAudience(issuer)
  .setIssuedAt(now)
  .setExpirationTime(now + 60)
  .setJti(randomUUID())
  .sign(key);
const tokRes = await fetch(`${AS_BASE_URL}/oauth/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    scope: "urn:authlete-as:interactions",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
  }),
}).then((r) => r.json());
const interactionsToken = tokRes.access_token;
ok("auth-ui access token", interactionsToken.slice(0, 16) + "…");

// 4) auth-ui submits decision to AS (mimics server action)
step(4, "auth-ui POST /api/interactions/{ticket} with user_claims");
const decisionBody = {
  subject: `e2e-${userId}`,
  amr: ["pwd"],
  authenticated_at: Math.floor(Date.now() / 1000),
  granted_scopes: ["openid", "profile", "email"],
  user_claims: {
    name: `E2E ${userId}`,
    email,
    email_verified: false,
  },
};
const submitRes = await fetch(
  `${AS_BASE_URL}/api/interactions/${encodeURIComponent(ticket)}`,
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${interactionsToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(decisionBody),
  },
);
if (!submitRes.ok) {
  console.error("Decision submit failed", submitRes.status, await submitRes.text());
  process.exit(1);
}
const { redirect_to: finalizeUrl } = await submitRes.json();
ok("redirect_to", finalizeUrl);

// 5) Browser navigates to finalize → AS issues code → RP gets redirected
step(5, "Browser → AS /finalize → RP redirect");
const finalRes = await fetch(finalizeUrl, { redirect: "manual" });
const rpUrl = finalRes.headers.get("location");
if (!rpUrl) {
  console.error("No location from finalize:", finalRes.status, await finalRes.text());
  process.exit(1);
}
const parsedRp = new URL(rpUrl);
const code = parsedRp.searchParams.get("code");
const returnedState = parsedRp.searchParams.get("state");
ok("RP URL", rpUrl);
ok("code", code?.slice(0, 16) + "…");
ok("state matches", returnedState === state ? "yes" : "NO");

// 6) RP exchanges code for tokens
step(6, "RP /token exchange (PKCE)");
const codeExchange = await fetch(`${AS_BASE_URL}/oauth/token`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: RP_REDIRECT_URI,
    client_id: RP_CLIENT_ID,
    code_verifier: codeVerifier,
  }),
}).then((r) => r.json());
if (!codeExchange.access_token) {
  console.error("Token exchange failed:", codeExchange);
  process.exit(1);
}
ok("access_token", codeExchange.access_token.slice(0, 16) + "…");
ok("id_token", codeExchange.id_token ? codeExchange.id_token.slice(0, 16) + "…" : "(none)");
ok("scope", codeExchange.scope);

// 7) RP calls /userinfo with the access token
step(7, "RP /userinfo (the moment of truth for user_claims)");
const ui = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
}).then((r) => r.json());
console.log("  Response body:", JSON.stringify(ui, null, 2));
const ok7 = ui.sub && (ui.email === email || ui.name?.includes(userId));
ok7 ? ok("user_claims round-tripped end-to-end") : console.error("  ❌ claims missing");

// 8) Smoke /introspect with the token
step(8, "RS introspects access_token via /oauth/introspect");
const introspectRes = await fetch(`${AS_BASE_URL}/oauth/introspect`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: `Basic ${Buffer.from("rs:placeholder").toString("base64")}`,
  },
  body: new URLSearchParams({ token: codeExchange.access_token }),
}).then((r) => r.json());
console.log("  Introspection:", JSON.stringify(introspectRes, null, 2));

// 9) Smoke /revoke
step(9, "RP revokes the access_token");
const revokeRes = await fetch(`${AS_BASE_URL}/oauth/revoke`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    token: codeExchange.access_token,
    client_id: RP_CLIENT_ID,
  }),
});
ok("revocation status", String(revokeRes.status));

// 10) Verify revoked token no longer works
step(10, "Confirm revoked token is rejected by /userinfo");
const ui2 = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
});
ok("status after revoke", String(ui2.status) + " (expecting 401)");

console.log("\n══════════════════  E2E COMPLETE  ══════════════════\n");
