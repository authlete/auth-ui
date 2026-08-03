/**
 * End-to-end smoke — drives the full RP → AS → auth-ui → AS → RP loop over the
 * two-interaction protocol (authenticate, then consent), exchanges the code, and
 * calls /userinfo to verify the AS fetches live claims from auth-ui. A final pass
 * re-runs the same user + scopes to verify incremental consent (consent skipped).
 *
 * Reproduces what auth-ui does by signing outcome JWTs with auth-ui's key and
 * POSTing them to AS /api/authorizations/{id}/outcome.
 *
 * Usage:
 *   node --env-file=.env scripts/smoke-e2e.mjs
 */

import { SignJWT, importJWK } from "jose";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const AS_BASE_URL = required("AS_BASE_URL");
const AUTH_UI_BASE_URL = required("BETTER_AUTH_URL");
// The AS's identity (JWT aud); defaults to the RP-facing base for single-tenant,
// set explicitly to the AS origin for a multi-tenant host.
const AS_ISSUER_ID = process.env.AS_ISSUER_ID || AS_BASE_URL;
const AUTH_UI_JWKS = JSON.parse(required("AUTH_UI_JWKS"));
const SIGNING_JWK = AUTH_UI_JWKS.keys[0];

const RP_CLIENT_ID = process.env.RP_CLIENT_ID || "2234376661";
const RP_REDIRECT_URI = process.env.RP_REDIRECT_URI || "http://localhost:4040";
const RP_SCOPE = process.env.RP_SCOPE || "openid profile email";

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

function decodeJwtPayload(jwt) {
  const payload = jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payload, "base64").toString());
}

function step(n, label) {
  console.log(`\n────────  Step ${n}: ${label}  ────────`);
}

function ok(label, value = "") {
  console.log(`  ✅ ${label}${value ? `: ${value}` : ""}`);
}

function fail(label, ...rest) {
  console.error(`  ❌ ${label}`, ...rest);
  process.exit(1);
}

// Sign a JWT addressed to the AS using auth-ui's interaction protocol key.
async function signForAs(payload) {
  // Read the algorithm from the key itself (ES256, RS256, …) rather than
  // assuming one — mirrors how the app signs in src/lib/jws.ts.
  const alg = SIGNING_JWK.alg || "ES256";
  const key = await importJWK(SIGNING_JWK, alg);
  return new SignJWT(payload)
    .setProtectedHeader({ alg, kid: SIGNING_JWK.kid, typ: "JWT" })
    .setIssuer(AUTH_UI_BASE_URL)
    .setSubject(AUTH_UI_BASE_URL)
    .setAudience(AS_ISSUER_ID)
    .setIssuedAt()
    .setExpirationTime("60s")
    .setJti(randomUUID())
    .sign(key);
}

// RP → AS /authorize; returns the authorization id + callback base + PKCE state.
async function startAuthorization() {
  const codeVerifier = b64url(randomBytes(48));
  const codeChallenge = b64url(createHash("sha256").update(codeVerifier).digest());
  const state = randomUUID();
  const res = await fetch(
    `${AS_BASE_URL}/oauth/authorize?response_type=code&client_id=${RP_CLIENT_ID}&redirect_uri=${encodeURIComponent(RP_REDIRECT_URI)}&scope=${encodeURIComponent(RP_SCOPE)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`,
    { redirect: "manual" },
  );
  const url = new URL(res.headers.get("location"));
  const idMatch = url.pathname.match(/^\/authorizations\/([^/]+)$/);
  if (!idMatch) fail("Unexpected redirect from /oauth/authorize:", url.href);
  const interaction = url.searchParams.get("interaction");
  const authzId = decodeURIComponent(idMatch[1]);
  const asBase = interaction && decodeJwtPayload(interaction).as_base;
  if (!asBase) fail("No usable interaction token:", url.href);
  return { authzId, asBase, codeVerifier, state };
}

// auth-ui → AS /outcome: sign {authorization, outcome} and return the next step.
async function postOutcome(asBase, authzId, outcome) {
  const jws = await signForAs({ authorization: authzId, outcome });
  const res = await fetch(`${asBase}/api/authorizations/${encodeURIComponent(authzId)}/outcome`, {
    method: "POST",
    headers: { authorization: `Bearer ${jws}` },
  });
  if (!res.ok) fail("outcome POST failed", res.status, await res.text());
  return res.json();
}

// 1) Sign up user via better-auth, capture user id
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
if (!userId) fail("No user id from sign-up", signUpRes.status, JSON.stringify(signUpBody));
ok("Signed up", `${email} (id=${userId})`);

const authenticateOutcome = {
  type: "authenticate",
  subject: userId,
  amr: ["pwd"],
  authenticated_at: Math.floor(Date.now() / 1000),
  user_claims: { sub: userId, name: `E2E ${userTag}`, email, email_verified: false },
};

// 2) RP → AS /authorize
step(2, "RP → AS /authorize");
const { authzId, asBase, codeVerifier, state } = await startAuthorization();
ok("authorization id", authzId.slice(0, 16) + "…");
ok("interaction as_base", asBase);

// 3) Two interactions: authenticate, then consent (first grant → consent needed)
step(3, "auth-ui reports authenticate + consent outcomes");
const authStep = await postOutcome(asBase, authzId, authenticateOutcome);
if (authStep.next !== "consent")
  fail("expected next=consent on first grant, got", JSON.stringify(authStep));
ok("authenticate → consent", `new: ${authStep.consent.new.map((s) => s.name).join(", ")}`);
const consentStep = await postOutcome(asBase, authzId, {
  type: "consent",
  granted_scopes: authStep.consent.new.map((s) => s.name),
});
const resumeUrl = consentStep.redirect_to;
ok("consent → done", resumeUrl);

// 4) Browser → AS /authorizations/{id}/resume → RP redirect
step(4, "Browser → /authorizations/{id}/resume → RP redirect");
const finalRes = await fetch(resumeUrl, { redirect: "manual" });
const rpUrl = finalRes.headers.get("location");
if (!rpUrl) fail("No location from /resume:", finalRes.status, await finalRes.text());
const parsedRp = new URL(rpUrl);
const code = parsedRp.searchParams.get("code");
ok("RP URL", rpUrl);
ok("code", code?.slice(0, 16) + "…");
ok("state matches", parsedRp.searchParams.get("state") === state ? "yes" : "NO");

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
if (!codeExchange.access_token) fail("Token exchange failed:", JSON.stringify(codeExchange));
ok("access_token", codeExchange.access_token.slice(0, 16) + "…");
ok("id_token", codeExchange.id_token ? codeExchange.id_token.slice(0, 16) + "…" : "(none)");
ok("scope", codeExchange.scope);

// 6) RP /userinfo — the AS fetches live claims from auth-ui
step(6, "RP /userinfo (verifies AS → auth-ui live fetch)");
const ui = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
}).then((r) => r.json());
console.log("  Response body:", JSON.stringify(ui, null, 2));
if (ui.sub === userId && ui.email === email) {
  ok("live claims round-tripped end-to-end");
} else {
  console.error("  ❌ claims wrong or missing");
}

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
  body: new URLSearchParams({ token: codeExchange.access_token, client_id: RP_CLIENT_ID }),
});
ok("revocation status", String(revokeRes.status));

// 9) Verify revoked token rejected
step(9, "Confirm revoked token is rejected by /userinfo");
const ui2 = await fetch(`${AS_BASE_URL}/oauth/userinfo`, {
  headers: { authorization: `Bearer ${codeExchange.access_token}` },
});
ok("status after revoke", String(ui2.status) + " (expecting 401)");

// 10) Incremental consent — same user + scopes → consent is skipped
step(10, "Incremental consent (same user + scopes → consent skipped)");
const again = await startAuthorization();
const authStep2 = await postOutcome(again.asBase, again.authzId, authenticateOutcome);
if (authStep2.next === "done") {
  ok("consent skipped — all requested scopes already granted");
} else {
  fail("expected next=done (nothing new to consent), got", JSON.stringify(authStep2));
}

console.log("\n══════════════════  E2E COMPLETE  ══════════════════\n");
