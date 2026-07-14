# auth-ui

A **white-label login & consent application** in the *Externalized Login & Consent* pattern — paired with `authlete/typescript-oauth-server` (or any conforming Authlete-backed AS).

Built on **Next.js 16 · Tailwind 4 · Better Auth · better-sqlite3**.

> The AS is the headless half of this pair. **auth-ui is the head** — every screen a user sees during sign-in or consent is rendered here.

## White-label by design

This app ships **unbranded** — the default look is a neutral reference UI, meant to be made yours.

- **Rebrand from one file.** [`src/brand/brand.ts`](src/brand/brand.ts) is the single source of truth for product name, logo, font, colors, and sign-in panel copy. Colors flow into CSS variables; copy and assets are read from the active brand. No brand value is hardcoded elsewhere.
- **Drop in your logo.** Set `logoMark` to an image under `/public/brand`, or keep the neutral built-in mark.
- **Or replace the UI entirely.** Any app that speaks the same Interaction Protocol to the AS can stand in for this one — this repo is a working reference, not a requirement.

## The pattern: Externalized Login & Consent

**Intent.** Decouple user authentication and consent from the OAuth/OIDC Authorization Server. The AS stays a thin, spec-compliant surface; a separate UI application owns everything the user touches. The AS holds no per-transaction state.

### Roles

| Component | Responsibility | What it sees |
|---|---|---|
| **Relying Party (RP)** | Initiates `/authorize`; receives code/tokens. | Only the AS. |
| **Authorization Server (AS)** | OAuth/OIDC endpoints. Delegates the user-facing flow to auth-ui; owns the final redirect back to the RP. | RP, Authlete, auth-ui — never external IdPs. |
| **auth-ui (this app)** | Authenticates the user with any combination of factors (password, MFA, passkeys, federation); collects consent; records the decision against the opaque authorization id. | Only the opaque authorization id — no codes, no tokens, no RP `redirect_uri`s. |
| **Authlete** | OAuth/OIDC protocol engine. Owns per-transaction state. | Never reachable from the browser; only the AS calls it. |

### State and protocol

- The **AS holds no per-transaction state**; the browser carries only an opaque **authorization id**.
- **auth-ui** holds the user session (Better Auth), not the OAuth transaction. It talks to the AS over the **Interaction Protocol** (specified in `INTERACTION_PROTOCOL.md` in the `typescript-oauth-server` repo), authenticated by **per-request mutual JWT** (no bearer tokens):
  - `GET  /api/authorizations/{id}` — fetch the in-flight authorization.
  - `POST /api/authorizations/{id}/decision` — submit the user's approve/deny decision.
  - `GET  /api/users/{id}` (on auth-ui) — the AS calls back to resolve user claims.
  - `GET  /.well-known/jwks.json` (on auth-ui) — publishes auth-ui's public keys so the AS can verify those JWTs.

### Why this pattern

- **Implementation-portable AS.** A thin Authlete client with no user state can run as a Node service, a sidecar, a reverse proxy plugin, or live inside an API gateway / edge worker. The same auth-ui works against any of them.
- **Authentication evolves independently.** MFA, passkeys, federation, step-up, risk-based prompts — all in auth-ui, none of which the AS ever sees.
- **Consent evolves independently.** Granular per-scope/per-claim UI, Rich Authorization Requests (RAR), persistent grant management — all UI work behind the same authorization interface.
- **Independent deploy and scale.** Two services, one narrow protocol between them.

This separation matches the architecture Authlete is designed around: the engine owns the spec + per-transaction state; you own the user experience.

## What this app currently provides

- Sign-in / sign-up / forgot-password (Better Auth — email + password today).
- Consent surface for an in-flight AS authorization (`/authorizations/[id]`).
- Account self-service: `/settings/account`, `/settings/security` via `better-auth-ui`.
- Server-to-server client of the AS's Interaction Protocol (`src/lib/as-client.ts`).
- Server actions that bridge user decisions back to the AS (`src/server/authorization-actions.ts`).
- End-to-end smoke harness (`scripts/smoke-e2e.mjs`).

## Prerequisites

- An **Authlete 3.0 service**, provisioned as described in the `typescript-oauth-server` README (service JWK Set registered, test RP client created).
- The AS running and reachable at `AS_BASE_URL` (default `http://localhost:3000`).

## Run locally

```bash
pnpm install
cp .env.example .env
# Fill in BETTER_AUTH_SECRET, AS_BASE_URL, AUTH_UI_JWKS — see .env.example
# for the full set and key generation commands.
```

Create the SQLite schema once before first run. The migrate CLI does not read `.env`, so pass the vars inline:

```bash
BETTER_AUTH_SECRET=<your-secret> BETTER_AUTH_URL=http://localhost:3001 pnpm exec better-auth migrate -y
```

Then start the dev server:

```bash
pnpm dev
```

Server boots at `http://localhost:3001`.

## End-to-end smoke test

`scripts/smoke-e2e.mjs` drives the full flow against a running AS and auth-ui: authorize → login → decision → code → token → userinfo → introspect → revoke.

Set `RP_CLIENT_ID` in `.env` to the test client registered on your Authlete service, then:

```bash
node --env-file=.env scripts/smoke-e2e.mjs
```

Expect `E2E COMPLETE` at the end. Note the script exercises the protocol, not the UI: it signs up a user via API and signs the decision JWT itself instead of clicking through the login and consent screens.

## Roadmap

Authentication and consent grow here; the AS does not change for these.

- **MFA** (TOTP, WebAuthn second-factor)
- **Passkeys** (WebAuthn primary)
- **Magic link**
- **Federated sign-in** (Google, Microsoft, Okta, custom OIDC IdPs)
- **Richer consent** — granular per-claim choices, RAR rendering, persistent grant management
- **Account-recovery and step-up** flows

## License

Apache-2.0
