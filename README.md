# auth-ui

White-label **login & consent UI** for an Authlete-backed OAuth/OIDC Authorization Server (e.g. [`authlete/typescript-oauth-server`](https://github.com/authlete/typescript-oauth-server)). The AS is headless; **auth-ui renders every screen the user sees** during sign-in and consent.

Built on **Next.js 16 · Tailwind 4 · Better Auth · libSQL**.

## Quickstart

Runs fully locally against a local AS — no cloud services needed (libSQL is just a file in dev).

```bash
git clone <repo> && cd auth-ui
npm install
cp .env.example .env    # fill BETTER_AUTH_SECRET, AS_JWKS_URI, AUTH_UI_JWKS (see comments)
npm run migrate         # create the local SQLite schema (data/auth-ui.sqlite)
npm run dev             # → http://localhost:3001
```

Needs a running AS reachable at `AS_BASE_URL` (default `http://localhost:3000`). End-to-end check against a running AS:

```bash
node --env-file=.env scripts/smoke-e2e.mjs
```

> **Channel note.** Only the **back-channel** (server-to-server) interaction mode is implemented today, so the AS and auth-ui must reach each other directly — which they do when both run locally. A **front-channel** (browser-mediated) mode, for split local/hosted setups, is **coming soon**.

## Configuration

`.env` — see `.env.example` for the full list and comments:

| Variable | Purpose |
|---|---|
| `BETTER_AUTH_SECRET` | session secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | this app's URL (default `http://localhost:3001`) |
| `AS_BASE_URL` | where the AS is reachable (default `http://localhost:3000`) |
| `AS_JWKS_URI` | the AS's public JWKS, used to verify its JWTs |
| `AUTH_UI_JWKS` | this app's ES256 private JWKS (published, private fields stripped, at `/.well-known/jwks.json`) |
| `DATABASE_URL` | libSQL target — a file locally, a Turso URL when hosted |

## Deploy (hosted)

Vercel-ready; Next.js is auto-detected (no `vercel.json`). The only requirement is a **network database** — serverless has no persistent local disk — so use a free [Turso](https://turso.tech) libSQL database. Same code path as local, just a remote target.

**Turso** (same steps as local, remote target):
- create a Turso account (free) and a database
- put its URL + token in `.env` as `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN`
- `npm run migrate` to populate the schema

**Vercel env vars:** `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your deploy URL), `AS_BASE_URL`, `AS_JWKS_URI`, `AUTH_UI_JWKS`. Mark the secrets Sensitive.

Because back-channel is server-to-server, a hosted auth-ui needs an AS it can reach over the network (and the AS must reach it back). A hosted auth-ui can't talk to a localhost AS until front-channel lands.

## White-label

Ships unbranded. Rebrand from one file:

- [`src/brand/brand.ts`](src/brand/brand.ts) is the single source of truth — product name, logo, font, colors, sign-in panel copy. Colors flow into CSS variables; nothing else hardcodes a brand value.
- Set `logoMark` to an image in `/public/brand`, or keep the built-in neutral mark.
- Or replace the UI entirely — anything that speaks the same protocol to the AS works.

## How it works — Externalized Login & Consent

Decouples authentication and consent from the AS. The AS stays a thin, spec-compliant OAuth/OIDC surface holding **no per-transaction state**; auth-ui owns everything the user touches.

| Component | Role |
|---|---|
| **RP** | the app requesting access: starts `/authorize`, receives tokens. Integrates with the AS using standard OAuth/OIDC.|
| **AS** | OAuth/OIDC endpoints; delegates login/consent to auth-ui; owns the redirect back to the RP |
| **auth-ui** | the UI the user actually sees: authenticates the user, collects consent, records the decision against an opaque **authorization id** |
| **Authlete** | protocol engine; owns per-transaction state; only the AS calls it |

auth-ui holds the user session (Better Auth), not the OAuth transaction. It speaks a small component protocol to the AS, authenticated by **per-request mutual JWT** — each side publishes a JWKS and verifies the other:

- `GET  /api/authorizations/{id}` — fetch the in-flight authorization (auth-ui → AS)
- `POST /api/authorizations/{id}/decision` — submit approve/deny (auth-ui → AS)
- `GET  /api/users/{id}` — resolve user claims (AS → auth-ui)
- `GET  /.well-known/jwks.json` — auth-ui's public keys (AS → auth-ui)

**Why:** the AS stays implementation-portable (Node service, sidecar, gateway, edge worker), while authentication (MFA, passkeys, federation) and consent (per-claim, RAR, grant management) evolve entirely in auth-ui — none of which the AS ever sees.

## Roadmap

- **Front-channel interaction mode** — browser-mediated; enables split local/hosted setups
- **MFA** (TOTP, WebAuthn 2FA) · **Passkeys** · **Magic link**
- **Federated sign-in** (Google, Microsoft, Okta, custom OIDC)
- **Richer consent** — per-claim choices, RAR, persistent grant management
- **Account recovery / step-up**

## License

Apache-2.0
