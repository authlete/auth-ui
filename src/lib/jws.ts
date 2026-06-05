/**
 * JWT signing and verification for the interaction protocol — server-side.
 *
 *   - signJwt: signs a JWT going to the AS using auth-ui's private
 *     key from AUTH_UI_JWKS (resolved by jwks.ts's key resolver).
 *   - verifyJwt: verifies a JWT received from the AS against the AS's
 *     published JWKS (fetched and cached at AS_JWKS_URI).
 *
 * Standard envelope claims (iss, sub, aud, iat, exp, jti) are applied per
 * INTERACTION_PROTOCOL.md §4. Per-operation claims are passed in as the payload.
 *
 * TODO(naming): `signJwt` / `verifyJwt` are placeholder names. These JWTs are
 * per-request signed credentials that also carry an operation payload
 * (decision, authorization id, etc.) between AS and auth-ui — they are NOT
 * generic JWTs. Settle on a purpose-naming pass when the protocol stabilises.
 * Candidates considered:
 *   - `assertion` (RFC 7521/7523 heritage; matches the `private_key_jwt`
 *     primitive applied per-call)
 *   - `proof` (RFC 9449 DPoP-style single-use signed JWT)
 *   - `signedRequest` (descriptive; no spec baggage)
 *   - `signedMessage` (plain language)
 */

import "server-only";
import {
  SignJWT,
  jwtVerify,
  createRemoteJWKSet,
  importJWK,
  type JWTPayload,
  type KeyLike,
} from "jose";
import { randomUUID } from "node:crypto";
import { getInteractionProtocolConfig } from "@/config";
import { parseJwks, resolveSigningKey } from "./jwks";

const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const JWKS_COOLDOWN_MS = 30 * 1000;
const DEFAULT_EXP_SECONDS = 60;
const CLOCK_TOLERANCE_SECONDS = 5;

type ResolvedSigningKey = { key: KeyLike | Uint8Array; kid: string; alg: string };

let signingKeyPromise: Promise<ResolvedSigningKey> | undefined;
let remoteAsJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

async function getSigningKey(): Promise<ResolvedSigningKey> {
  if (!signingKeyPromise) {
    signingKeyPromise = (async () => {
      const cfg = getInteractionProtocolConfig();
      const jwks = parseJwks(cfg.authUiJwks);
      const jwk = resolveSigningKey(jwks, {
        kid: cfg.signingKid,
        alg: "ES256",
      });
      if (!jwk.kid) throw new Error("auth-ui signing JWK must include a kid");
      const key = await importJWK(jwk, jwk.alg ?? "ES256");
      return { key, kid: jwk.kid, alg: jwk.alg ?? "ES256" };
    })().catch((err) => {
      // Don't pin a rejected promise; let the next call retry.
      signingKeyPromise = undefined;
      throw err;
    });
  }
  return signingKeyPromise;
}

function getRemoteAsJwks() {
  if (!remoteAsJwks) {
    const cfg = getInteractionProtocolConfig();
    remoteAsJwks = createRemoteJWKSet(new URL(cfg.asJwksUri), {
      cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
      cooldownDuration: JWKS_COOLDOWN_MS,
    });
  }
  return remoteAsJwks;
}

/** Sign a JWT addressed to the AS (audience = AS_ISSUER_ID by default). */
export async function signJwt(
  payload: Record<string, unknown>,
  opts: { audience?: string; expiresInSeconds?: number } = {},
): Promise<string> {
  const { key, kid, alg } = await getSigningKey();
  const cfg = getInteractionProtocolConfig();
  const audience = opts.audience ?? cfg.asIssuerId;
  const exp = opts.expiresInSeconds ?? DEFAULT_EXP_SECONDS;

  return new SignJWT(payload)
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setIssuer(cfg.authUiIssuerId)
    .setSubject(cfg.authUiIssuerId)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${exp}s`)
    .setJti(randomUUID())
    .sign(key);
}

/** Verify a JWT from the AS. Throws on any verification failure. */
export async function verifyJwt(jwt: string): Promise<JWTPayload> {
  const cfg = getInteractionProtocolConfig();
  const { payload } = await jwtVerify(jwt, getRemoteAsJwks(), {
    issuer: cfg.asIssuerId,
    audience: cfg.authUiIssuerId,
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  });
  return payload;
}
