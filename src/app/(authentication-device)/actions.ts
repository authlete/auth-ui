"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInteractionProtocolConfig } from "@/config";
import { fetchFromAs } from "@/lib/as-client";
import { getPending, markResolved } from "./store";

type Outcome =
  { subject: string; granted_scopes?: string[] } | { error: string; error_description?: string };

// Report the decision to the AS, which finalizes it via Authlete.
async function reportOutcome(ticket: string, outcome: Outcome): Promise<void> {
  const res = await fetchFromAs(
    getInteractionProtocolConfig().asIssuerId,
    "/api/backchannel/outcome",
    { ticket, outcome },
    { method: "POST" },
  );
  if (!res.ok) throw new Error(`backchannel outcome failed (${res.status})`);
}

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/requests");
  return session.user;
}

// Only act on a request addressed to this user (matched by login_hint).
async function ownedRequest(ticket: string, user: { id: string; email: string }) {
  const pending = await getPending(ticket);
  if (!pending || (pending.login_hint !== user.email && pending.login_hint !== user.id)) {
    throw new Error("sign-in request not found");
  }
  return pending;
}

export async function approveRequest(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ticket = String(formData.get("ticket") ?? "");
  const pending = await ownedRequest(ticket, user);
  await reportOutcome(ticket, {
    subject: user.id,
    granted_scopes: pending.scopes.map((s) => s.name),
  });
  await markResolved(ticket, "approved");
  revalidatePath("/requests");
}

export async function denyRequest(formData: FormData): Promise<void> {
  const user = await requireUser();
  const ticket = String(formData.get("ticket") ?? "");
  await ownedRequest(ticket, user);
  await reportOutcome(ticket, { error: "access_denied" });
  await markResolved(ticket, "denied");
  revalidatePath("/requests");
}
