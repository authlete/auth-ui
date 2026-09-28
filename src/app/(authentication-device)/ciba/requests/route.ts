// POST /ciba/requests — the AS pushes a pending CIBA request here as an
// AS-signed JWT (verifyJwt enforces issuer + audience). Not session-gated.
import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jws";
import { savePending, type PendingRequest } from "../../store";

export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return new NextResponse(null, { status: 401 });

  let pending: PendingRequest;
  try {
    // Request fields are flat top-level claims (alongside the JWT envelope).
    const c = (await verifyJwt(token)) as unknown as PendingRequest;
    pending = {
      ticket: c.ticket,
      login_hint: c.login_hint,
      client_name: c.client_name,
      scopes: c.scopes,
      authorization_details: c.authorization_details,
      binding_message: c.binding_message,
      expires_at: c.expires_at,
    };
  } catch {
    return new NextResponse(null, { status: 401 });
  }

  if (!pending?.ticket) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await savePending(pending);
  return new NextResponse(null, { status: 204 });
}
