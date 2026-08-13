"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { revokeAuthorizedApp } from "@/lib/authorized-apps";

export async function revokeApp(formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/apps");
  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) throw new Error("revokeApp: missing client_id");
  // Subject comes from the session, never the client — a user revokes only their own.
  await revokeAuthorizedApp(session.user.id, clientId);
  revalidatePath("/apps");
}
