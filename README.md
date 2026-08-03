# auth-ui

White-label **authentication & consent UI** for an Authlete-backed OAuth/OIDC Authorization Server (e.g. [`authlete/typescript-oauth-server`](https://github.com/authlete/typescript-oauth-server)). The AS is headless; **auth-ui renders every screen the user sees** during authentication and consent.

Built on **Next.js 16 · Tailwind 4 · Better Auth · libSQL**.

## Quickstart

Runs fully locally against a local AS — no cloud services needed (libSQL is just a file in dev).

```bash
git clone <repo> && cd auth-ui
npm install
cp .env.example .env    # fill BETTER_AUTH_SECRET, AS_ISSUER_ID, AUTH_UI_JWKS (see comments)
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
| `AS_ISSUER_ID` | the AS's stable identity — and the origin its public JWKS is fetched from to verify its JWTs |
| `AUTH_UI_JWKS` | this app's ES256 private JWKS (published, private fields stripped, at `/.well-known/jwks.json`) |
| `DATABASE_URL` | libSQL target — a file locally, a Turso URL when hosted |

## Deploy (hosted)

Vercel-ready; Next.js is auto-detected (no `vercel.json`). The only requirement is a **network database** — serverless has no persistent local disk — so use a free [Turso](https://turso.tech) libSQL database. Same code path as local, just a remote target.

**Turso** (same steps as local, remote target):
- create a Turso account (free) and a database
- put its URL + token in `.env` as `DATABASE_URL` (`libsql://…`) and `DATABASE_AUTH_TOKEN`
- `npm run migrate` to populate the schema

**Vercel env vars:** `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your deploy URL), `AS_BASE_URL`, `AS_ISSUER_ID`, `AUTH_UI_JWKS`. Mark the secrets Sensitive. Optional feature keys (email, social) live in `.env.example`.

Because back-channel is server-to-server, a hosted auth-ui needs an AS it can reach over the network (and the AS must reach it back). A hosted auth-ui can't talk to a localhost AS until front-channel lands.

## White-label

Ships unbranded. Rebrand from one file:

- [`src/brand/brand.ts`](src/brand/brand.ts) is the single source of truth — product name, logo, font, colors, sign-in panel copy. Colors flow into CSS variables; nothing else hardcodes a brand value.
- Set `logoMark` to an image in `/public/brand`, or keep the built-in neutral mark.
- Or replace the UI entirely — anything that speaks the same protocol to the AS works.

## Managed components

**Most of the UI is managed** — installed from the [better-auth-ui](https://better-auth-ui.com) registry (built on [shadcn/ui](https://ui.shadcn.com) primitives) into `src/components/auth`, `src/components/ui`, and `src/lib/auth`. Treat these as managed, not owned — don't hand-edit them; **update by re-installing**:

```bash
npx shadcn@latest add @better-auth-ui/<name>   # better-auth-ui: auth, two-factor, …
npx shadcn@latest add <name>                    # shadcn/ui primitives: button, dialog, …
```

The rest is thin glue we own — Better Auth config, plugin wiring, the email transport, and the brand. New features (2FA, passkeys, social, …) come from the registry: install the component, wire it in config, never fork it.

## How it works — Externalized Authentication & Consent

Decouples authentication and consent from the AS. The AS stays a thin, spec-compliant OAuth/OIDC surface holding **no per-transaction state**; auth-ui owns everything the user touches.

| Component | Role |
|---|---|
| **RP** | the app requesting access: starts `/authorize`, receives tokens. Integrates with the AS using standard OAuth/OIDC.|
| **AS** | OAuth/OIDC endpoints; delegates authentication/consent to auth-ui; owns the redirect back to the RP |
| **auth-ui** | the UI the user actually sees: authenticates the user, collects consent, records the decision against an opaque **authorization id** |
| **Authlete** | protocol engine; owns per-transaction state; only the AS calls it |

auth-ui holds the user session (Better Auth), not the OAuth transaction. It speaks a small component protocol to the AS, authenticated by **per-request mutual JWT** — each side publishes a JWKS and verifies the other:

- `GET  /api/authorizations/{id}` — fetch the in-flight authorization (auth-ui → AS)
- `POST /api/authorizations/{id}/outcome` — report an interaction outcome: authenticate, then consent (auth-ui → AS)
- `GET  /api/users/{id}` — resolve user claims (AS → auth-ui)
- `GET  /.well-known/jwks.json` — auth-ui's public keys (AS → auth-ui)

**Why:** the AS stays implementation-portable (Node service, sidecar, gateway, edge worker), while authentication (MFA, passkeys, federation) and consent (per-claim, RAR, grant management) evolve entirely in auth-ui — none of which the AS ever sees.

## Roadmap

Supported today (all from the registry): email/password, email verification, password reset, multi-account device sessions, **TOTP 2FA + backup codes**, and env-gated **social / OIDC sign-in** (Google, Microsoft, …).

Planned:

- **Front-channel interaction mode** — browser-mediated; enables split local/hosted setups
- **Passkeys** (WebAuthn) · **Magic link** · **custom-issuer OIDC** (Okta/Auth0 via discovery)
- **Richer consent** — per-claim choices, RAR, persistent grant management
- **Account recovery / step-up**

## License

Apache-2.0
