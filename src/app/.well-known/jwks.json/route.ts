/**
 * GET /.well-known/jwks.json
 *
 * Publishes auth-ui's interaction protocol public JWKS so the AS can verify
 * JWTs signed by auth-ui. Private fields are stripped before serving.
 *
 * Cache-Control: public, max-age=300 — verifiers cache the keyset for 5 min,
 * matching the verification-side cache TTL specified in INTERACTION_PROTOCOL.md.
 */

import { NextResponse } from "next/server";
import { getInteractionProtocolConfig } from "@/config";
import { getPublicJwks } from "@/lib/jwks";

export const dynamic = "force-static";

export function GET() {
  const cfg = getInteractionProtocolConfig();
  const jwks = getPublicJwks(cfg.authUiJwks);
  return NextResponse.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "application/jwk-set+json",
    },
  });
}
