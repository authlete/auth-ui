"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInteractionProtocolConfig } from "@/config";
import { fetchFromAs } from "@/lib/as-client";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/device");
  return session.user;
}

async function reportOutcome(userCode: string, outcome: Record<string, unknown>): Promise<void> {
  const res = await fetchFromAs(
    getInteractionProtocolConfig().asIssuerId,
    "/api/device/outcome",
    { user_code: userCode, outcome },
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`device outcome failed (${res.status})`);
}

export async function submitCode(formData: FormData): Promise<void> {
  // RFC 8628 §6.1: user codes are case-insensitive; strip separators, uppercase.
  const code = String(formData.get("user_code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  redirect(code ? `/device?user_code=${encodeURIComponent(code)}` : "/device");
}

export async function approveDevice(formData: FormData): Promise<void> {
  const user = await requireUser();
  const userCode = String(formData.get("user_code") ?? "");
  const grantedScopes = formData.getAll("granted_scope").map(String);
  await reportOutcome(userCode, { subject: user.id, granted_scopes: grantedScopes });
  redirect("/device?done=approved");
}

export async function denyDevice(formData: FormData): Promise<void> {
  await requireUser();
  const userCode = String(formData.get("user_code") ?? "");
  await reportOutcome(userCode, { error: "access_denied" });
  redirect("/device?done=denied");
}
