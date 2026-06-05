/**
 * /authorizations/[id] — entry point the AS redirects the user to for an
 * in-flight authorization transaction. Drives the user through whatever steps
 * are required (auth, consent), then submits the decision via server actions.
 *
 * Branches:
 *   - id unknown to AS → "session expired"
 *   - needs auth and no session (or reauth required) → /auth/sign-in?next=...
 *   - prompt=none and signed-in → auto-approve, redirect to AS resume
 *   - otherwise → consent form
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getAuthorization,
  AuthorizationNotFoundError,
  type AuthorizationDetails,
  type Scope,
} from "@/lib/as-client";
import { approveAuthorization, denyAuthorization } from "@/server/authorization-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "@/components/consent-form";
import { SplitLayout } from "@/components/layouts/split-layout";
import { clientDisplayName, signInUrlForAuthorization } from "@/lib/authorization";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AuthorizationPage({ params }: PageProps) {
  const { id } = await params;

  // Read headers once, then fan out session lookup and AS fetch in parallel.
  const reqHeaders = await headers();
  let details: AuthorizationDetails;
  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    [details, session] = await Promise.all([
      getAuthorization(id),
      auth.api.getSession({ headers: reqHeaders }),
    ]);
  } catch (err) {
    if (err instanceof AuthorizationNotFoundError) return renderExpired();
    throw err;
  }

  const needsReauth =
    (details.needs.includes("authentication") && !session?.user) ||
    shouldForceReauth(details, session);
  if (needsReauth) redirect(signInUrlForAuthorization(id));

  // prompt=none — AS would have skipped UI if it had session info. Bridge by
  // auto-approving with the current session; the server action redirects.
  if (details.skip && session?.user) {
    await approveAuthorization(buildSkipFormData(id, details.requested_scopes));
    return null;
  }

  return (
    <SplitLayout
      brandHeadline={`${clientDisplayName(details.client)} needs your permission.`}
      brandSubhead="Review the requested permissions before continuing. You can deny at any time."
    >
      <ConsentForm
        authorizationId={id}
        client={details.client}
        subject={session?.user.email ?? session?.user.id ?? ""}
        scopes={details.requested_scopes}
        approveAction={approveAuthorization}
        denyAction={denyAuthorization}
      />
    </SplitLayout>
  );
}

function renderExpired() {
  return (
    <SplitLayout
      brandHeadline="Session expired."
      brandSubhead="The authorization request could not be completed."
    >
      <Card>
        <CardHeader>
          <CardTitle>Session expired</CardTitle>
          <CardDescription>
            This authorization request has expired or was already completed.
            Please return to the application and try again.
          </CardDescription>
        </CardHeader>
      </Card>
    </SplitLayout>
  );
}

function shouldForceReauth(
  details: { prompt?: string; max_age?: number },
  session: { session?: { createdAt?: string | Date } } | null,
): boolean {
  if (!session?.session?.createdAt) return false;
  if (details.prompt?.split(/\s+/).includes("login")) return true;
  if (typeof details.max_age === "number" && details.max_age > 0) {
    const ageSeconds = (Date.now() - new Date(session.session.createdAt).getTime()) / 1000;
    if (ageSeconds > details.max_age) return true;
  }
  return false;
}

function buildSkipFormData(id: string, scopes: Scope[]): FormData {
  const fd = new FormData();
  fd.set("authorization", id);
  for (const s of scopes) fd.append("granted_scope", s.name);
  return fd;
}
