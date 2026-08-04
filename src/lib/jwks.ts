/**
 * JWKS handling for the interaction protocol.
 *
 * Server-side only. Owns:
 *   - parsing the private JWKS from env into structured keys,
 *   - selecting the signing key by the spec's "Key resolution" rules,
 *   - producing the public JWKS for publication at /.well-known/jwks.json.
 *
 * Spec: INTERACTION_PROTOCOL.md in the typescript-oauth-server repo.
 */

import "server-only";
import type { JWK } from "jose";

export type JWKS = { keys: JWK[] };

const PRIVATE_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"] as const;

/** Parse a JWKS env value into a typed JWKS, validating the shape. */
export function parseJwks(raw: string): JWKS {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JWKS env: not JSON (${(err as Error).message})`);
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as JWKS).keys)) {
    throw new Error("Invalid JWKS env: missing 'keys' array");
  }
  const { keys } = parsed as JWKS;
  if (keys.length === 0) throw new Error("Invalid JWKS env: 'keys' array is empty");
  return { keys };
}

/**
 * Resolve the signing key from the local JWKS (spec: "Key resolution"):
 *   1. the only key in the set, if there is exactly one
 *   2. else the first key whose `alg` matches the signing alg
 *   3. else the first key in the set
 */
export function resolveSigningKey(jwks: JWKS, alg: string): JWK {
  if (jwks.keys.length === 1) return jwks.keys[0]!;
  return jwks.keys.find((k) => k.alg === alg) ?? jwks.keys[0]!;
}

/** Strip private fields from a JWKS, producing the public JWKS for publication. */
export function publicJwks(jwks: JWKS): JWKS {
  return {
    keys: jwks.keys.map((k) => {
      const out: Record<string, unknown> = { ...k };
      for (const f of PRIVATE_FIELDS) delete out[f];
      return out as unknown as JWK;
    }),
  };
}

let cachedPublicJwks: JWKS | null = null;

/** Memoized public JWKS for /.well-known/jwks.json — parsed once per process. */
export function getPublicJwks(rawJwks: string): JWKS {
  if (!cachedPublicJwks) cachedPublicJwks = publicJwks(parseJwks(rawJwks));
  return cachedPublicJwks;
}
