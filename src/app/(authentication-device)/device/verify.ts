/**
 * Device Authorization Grant (RFC 8628) — look up a user_code at the AS.
 * Device flow pulls (vs CIBA's push): the UI resolves the code to the request
 * details so it can render consent. Server-only (signs the mutual-JWT to the AS).
 */

import "server-only";
import { getInteractionProtocolConfig } from "@/config";
import { fetchFromAs, type RarElement, type Scope } from "@/lib/as-client";

export type DeviceRequest = {
  client_name?: string;
  scopes: Scope[];
  authorization_details: RarElement[];
  expires_at?: number;
};

export type DeviceVerifyResult =
  { ok: true; request: DeviceRequest } | { ok: false; reason: "not_found" | "expired" | "error" };

export async function verifyUserCode(userCode: string): Promise<DeviceVerifyResult> {
  const res = await fetchFromAs(
    getInteractionProtocolConfig().asIssuerId,
    "/api/device/verification",
    { user_code: userCode },
    { method: "POST" },
  );
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (res.status === 410) return { ok: false, reason: "expired" };
  if (!res.ok) return { ok: false, reason: "error" };
  return { ok: true, request: (await res.json()) as DeviceRequest };
}
