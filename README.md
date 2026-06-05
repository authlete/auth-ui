# auth-ui

The **login & consent application** in the *Externalized Login & Consent* pattern — paired with `authlete/typescript-oauth-server` (or any conforming Authlete-backed AS).

Built on **Next.js 16 · Tailwind 4 · Better Auth · better-sqlite3**.

> The AS is the headless half of this pair. **auth-ui is the head** — every screen a user sees during sign-in or consent is rendered here.

## The pattern: Externalized Login & Consent

**Intent.** Decouple user authentication and consent from the OAuth/OIDC Authorization Server. The AS stays a thin, spec-compliant surface; a separate UI application owns everything the user touches. The AS holds no per-transaction state.

### Roles

| Component | Responsibility | What it sees |
|---|---|---|
| **Relying Party (RP)** | Initiates `/authorize`; receives code/tokens. | Only the AS. |
| **Authorization Server (AS)** | OAuth/OIDC endpoints (`/authorize`, `/token`, `/userinfo`, `/par`, `/introspect`, `/revoke`, `/jwks`, `.well-known/*`). Delegates user-facing flow to the login app; owns the final redirect back to the RP. | RP, Authlete, login app — never external IdPs. |
| **auth-ui (this app)** | Authenticates the user with any combination of factors (password, MFA, passkeys, federation); collects consent; records the decision against the opaque interaction ticket. | Only the opaque ticket id — no codes, no tokens, no RP `redirect_uri`s. |
| **Authlete** | OAuth/OIDC protocol engine. Owns per-transaction state via tickets. | Never reachable from the browser; only the AS calls it. |

### State model

- The **Authlete ticket** is the only handle for an in-flight authorization. Auth result, consent decision, and request context all hang off it on Authlete's side.
- The **AS holds no per-transaction state**. The browser carries only the ticket id; the AS exchanges it back for context as needed. (One transitional exception is documented inline in the AS at `src/userstore.ts`.)
- **auth-ui** holds the user session (Better Auth) but not the OAuth transaction. It learns what's being requested via `GET /api/interactions/{ticket}`, posts back the user's decision, and forwards the user to the AS for finalization.

### Trust boundaries

```
 ┌──────────┐    OAuth / OIDC    ┌──────────┐   component protocol    ┌──────────┐
 │   RP     │ ─────────────────→ │    AS    │ ───(bearer-auth)──────→ │ auth-ui  │
 └──────────┘                    │  (thin)  │                          │(this app)│
                                 │          │   @authlete/sdk          │          │
                                 │          │ ─────────────────→  Authlete         │
                                 └──────────┘                          └─────┬────┘
                                                                             │
                                                  (future) federated IdPs · MFA · passkeys
                                                                             │
                                                                          External
```

- **AS outward to RPs**: standard OAuth/OIDC. One spec.
- **AS ↔ auth-ui**: a bespoke 2-endpoint component protocol (`GET/POST /api/interactions/{ticket}`), bearer-authenticated. auth-ui obtains the bearer via `client_credentials` + `private_key_jwt`.
- **auth-ui outward**: everything else — federated IdPs, MFA factors, passkeys, account management. None of this is visible to the AS.

### Why this pattern

- **Implementation-portable AS.** A thin Authlete client with no user state can run as a Node service, a sidecar, a reverse proxy plugin, or live inside an API gateway / edge worker. The same auth-ui works against any of them.
- **Authentication evolves independently.** MFA, passkeys, federation, step-up, risk-based prompts — all in auth-ui, none of which the AS ever sees.
- **Consent evolves independently.** Granular per-scope/per-claim UI, Rich Authorization Requests (RAR), persistent grant management — all UI work behind the same ticket interface.
- **Independent deploy and scale.** Two services, one narrow protocol between them.

This separation matches the architecture Authlete is designed around: the engine owns the spec + per-transaction state; you own the user experience.

## What this app currently provides

- Sign-in / sign-up / forgot-password (Better Auth — email + password today).
- Consent surface against an in-flight AS ticket.
- Account self-service: `/settings/account`, `/settings/security` via `better-auth-ui`.
- Server-to-server client of the AS's component protocol (`src/lib/as-client.ts`).
- Server actions that bridge user decisions back to the AS (`src/server/interaction-actions.ts`).
- End-to-end smoke harness (`scripts/smoke-e2e.mjs`).

## Run locally

```bash
pnpm install
cp .env.example .env
# Fill in BETTER_AUTH_SECRET (32+ chars):   openssl rand -base64 32
# Fill in AS_BASE_URL, AS_CLIENT_ID, AS_CLIENT_PRIVATE_KEY (matching the AS registration)
pnpm dev
```

Server boots at `http://localhost:3001`. The AS must be reachable at `AS_BASE_URL`.

Run the end-to-end smoke against a running AS:

```bash
node --env-file=.env scripts/smoke-e2e.mjs
```

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
