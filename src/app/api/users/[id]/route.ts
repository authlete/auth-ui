/**
 * GET /api/users/{id}
 *
 * Live user resource lookup called by the AS at /userinfo time. Inbound JWT
 * auth verified against the AS's published JWKS. Returns a flat user resource;
 * the AS owns the OIDC-claim projection. See INTERACTION_PROTOCOL.md §7.3.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyJwt } from "@/lib/jws";

type UserRecord = {
  id: string;
  name?: string | null;
  email?: string;
  emailVerified?: boolean;
  image?: string | null;
};

type BetterAuthAdapter = {
  findOne: <T>(opts: {
    model: string;
    where: Array<{ field: string; value: string }>;
  }) => Promise<T | null>;
};

// better-auth resolves its server context lazily; hoist the adapter once.
const adapterPromise: Promise<BetterAuthAdapter> = (
  auth as unknown as { $context: Promise<{ adapter: BetterAuthAdapter }> }
).$context.then((ctx) => ctx.adapter);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const jwt = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return unauthorized("missing Authorization Bearer JWT");
  try {
    await verifyJwt(jwt);
  } catch (err) {
    return unauthorized((err as Error).message);
  }

  const { id } = await params;
  const adapter = await adapterPromise;
  const user = await adapter.findOne<UserRecord>({
    model: "user",
    where: [{ field: "id", value: id }],
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified: user.emailVerified ?? false,
    picture: user.image ?? undefined,
  });
}

function unauthorized(description: string): NextResponse {
  return NextResponse.json(
    { error: "invalid_token", error_description: description },
    {
      status: 401,
      headers: { "www-authenticate": 'Bearer realm="auth-ui", error="invalid_token"' },
    },
  );
}
