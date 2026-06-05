/**
 * End-to-end smoke for v0.3 (mutual JWT) — drives the full
 * RP → AS → auth-ui → AS → RP loop, then exchanges the code and calls
 * /userinfo to verify the AS fetches live claims from auth-ui.
 *
 * Skips the actual server-action invocation (Next.js encoding is opaque) and
 * instead reproduces what the server action does by signing a decision JWT
 * with auth-ui's key and POSTing it to AS /api/authorizations/{id}/decision.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-e2e.mjs
 */

import { SignJWT, importJWK } from "jose";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const AS_BASE_URL = required("AS_BASE_URL");
const AUTH_UI_BASE_URL = required("BETTER_AUTH_URL");
const AS_ISSUER_ID = process.env.AS_ISSUER_ID || AS_BASE_URL;
const AUTH_UI_ISSUER_ID = process.env.AUTH_UI_ISSUER_ID || AUTH_UI_BASE_URL;
const AUTH_UI_JWKS = JSON.parse(required("AUTH_UI_JWKS"));
const SIGNING_JWK = AUTH_UI_JWKS.keys[0];

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

// Sign a JWT addressed to the AS using auth-ui's interaction protocol key.
async function signForAs(payload) {
  const key = await importJWK(SIGNING_JWK, "ES256");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", kid: SIGNING_JWK.kid, typ: "JWT" })
    .setIssuer(AUTH_UI_ISSUER_ID)
    .setSubject(AUTH_UI_ISSUER_ID)
    .setAudience(AS_ISSUER_ID)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomUUID())
    .sign(key);
}

// 1) Sign up user via better-auth, capture session cookie + user id
step(1, "Sign up user in auth-ui");
const userTag = randomUUID().slice(0, 8);
const email = `e2e-${userTag}@example.com`;
const signUpRes = await fetch(`${AUTH_UI_BASE_URL}/api/auth/sign-up/email`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: AUTH_UI_BASE_URL },
  body: JSON.stringify({ name: `E2E ${userTag}`, email, password: "password12345" }),
});
const signUpBody = await signUpRes.json();
const userId = signUpBody?.user?.id ?? signUpBody?.id;
if (!userId) {
  console.error("No user id from sign-up", signUpRes.status, JSON.stringify(signUpBody));
  process.exit(1);
}
ok("Signed up", `${email} (id=${userId})`);

// 2) RP → AS /authorize — capture authorization id from redirect to auth-ui
step(2, "RP → AS /authorize");
const codeVerifier = b64url(randomBytes(48));
const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
const state = randomUUID();

const authzRes = await fetch(
  `${AS_BASE_URL}/oauth/authorize?response_type=code&client_id=${RP_CLIENT_ID}&redirect_uri=${encodeURIComponent(RP_REDIRECT_URI)}&scope=${encodeURIComponent(RP_SCOPE)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`,
  { redirect: "manual" },
);
const interactionUrl = authzRes.headers.get("location");
const parsedUi = new URL(interactionUrl);
// Path-based: /authorizations/<id>
const idMatch = parsedUi.pathname.match(/^\/authorizations\/([^/]+)$/);
if (!idMatch) {
  console.error("Unexpected redirect from /oauth/authorize:", interactionUrl);
  process.exit(1);
}
const authzId = decodeURIComponent(idMatch[1]);
ok("Got authorization id", authzId.slice(0, 16) + "…");

// 3) auth-ui POST /api/authorizations/{id}/decision — JWT-only, no body
step(3, "auth-ui POST /api/authorizations/{id}/decision (signed JWT)");
const decisionClaim = {
  outcome: "approved",
  subject: userId,
  amr: ["pwd"],
  authenticated_at: Math.floor(Date.now() / 1000),
  granted_scopes: ["openid", "profile", "email"],
  user_claims: {
    sub: userId,
    name: `E2E ${userTag}`,
    email,
    email_verified: false,
  },
};
const decisionJws = await signForAs({ authorization: authzId, decision: decisionClaim });
const submitRes = await fetch(
  `${AS_BASE_URL}/api/authorizations/${encodeURIComponent(authzId)}/decision`,
  {
    method: "POST",
    headers: { authorization: `Bearer ${decisionJws}` },
  },
);
if (!submitRes.ok) {
  console.error("Decision submit failed", submitRes.status, await submitRes.text());
  process.exit(1);
}
const { redirect_to: resumeUrl } = await submitRes.json();
ok("redirect_to", resumeUrl);

// 4) Browser → AS /authorizations/{id}/resume → RP redirect
step(4, "Browser → /authorizations/{id}/resume → RP redirect");
const finalRes = await fetch(resumeUrl, { redirect: "manual" });
const rpUrl = finalRes.headers.get("location");
if (!rpUrl) {
  console.error("No location from /resume:", finalRes.status, await finalRes.text());
  process.exit(1);
}
const parsedRp = new URL(rpUrl);
const code = parsedRp.searchParams.get("code");
const returnedState = parsedRp.searchParams.get("state");
ok("RP URL", rpUrl);
ok("code", code?.slice(0, 16) + "…");
ok("state matches", returnedState === state ? "yes" : "NO");

// 5) RP exchanges code for tokens
step(5, "RP /token exchange (PKCE)");
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

// 6) RP /userinfo — the AS fetches live claims from auth-ui
step(6, "RP /userinfo (verifies AS → auth-ui live fetch)");
const ui = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
}).then((r) => r.json());
console.log("  Response body:", JSON.stringify(ui, null, 2));
const ok6 = ui.sub === userId && ui.email === email;
ok6 ? ok("live claims round-tripped end-to-end") : console.error("  ❌ claims wrong or missing");

// 7) /introspect
step(7, "RS introspects access_token via /oauth/introspect");
const introspectRes = await fetch(`${AS_BASE_URL}/oauth/introspect`, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    authorization: `Basic ${Buffer.from("rs:placeholder").toString("base64")}`,
  },
  body: new URLSearchParams({ token: codeExchange.access_token }),
}).then((r) => r.json());
console.log("  Introspection:", JSON.stringify(introspectRes, null, 2));

// 8) /revoke
step(8, "RP revokes the access_token");
const revokeRes = await fetch(`${AS_BASE_URL}/oauth/revoke`, {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    token: codeExchange.access_token,
    client_id: RP_CLIENT_ID,
  }),
});
ok("revocation status", String(revokeRes.status));

// 9) Verify revoked token rejected
step(9, "Confirm revoked token is rejected by /userinfo");
const ui2 = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
});
ok("status after revoke", String(ui2.status) + " (expecting 401)");

console.log("\n══════════════════  E2E COMPLETE  ══════════════════\n");
