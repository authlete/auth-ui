/**
 * Entry handler for `/` (with optional `?interaction=<ticket>`).
 *
 * Branches:
 *   - no ticket, signed-in → AppShell home
 *   - no ticket, anon → SplitLayout welcome
 *   - ticket bad → "session expired"
 *   - ticket good, needs auth and no session (or reauth required) → /auth/sign-in
 *   - ticket good, prompt=none and signed-in → auto-approve, redirect
 *   - ticket good, otherwise → consent form
 */

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInteraction, InteractionNotFoundError, type InteractionDetails, type InteractionScope } from "@/lib/as-client";
import { approveInteraction, denyInteraction } from "@/server/interaction-actions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "@/components/consent-form";
import { SignedInHome } from "@/components/signed-in-home";
import { AppShell } from "@/components/layouts/app-shell";
import { SplitLayout } from "@/components/layouts/split-layout";
import { clientDisplayName, signInUrlForInteraction } from "@/lib/interaction";

type SearchParams = Promise<{ interaction?: string }>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const { interaction: ticket } = await searchParams;

  if (!ticket) return renderWithoutTicket();
  return renderWithTicket(ticket);
}

async function renderWithoutTicket() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user) {
    return (
      <AppShell title="Home" description="Your auth-ui account." session={session}>
        <SignedInHome name={session.user.name} email={session.user.email} />
      </AppShell>
    );
  }

  return (
    <SplitLayout>
      <Card>
        <CardHeader>
          <CardTitle>Welcome to auth-ui</CardTitle>
          <CardDescription>
            This is the authentication front-end. An OAuth application will
            redirect you here when it needs you to sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Link href="/auth/sign-in" className={buttonVariants()}>Sign in</Link>
          <Link href="/auth/sign-up" className={buttonVariants({ variant: "outline" })}>Sign up</Link>
        </CardFooter>
      </Card>
    </SplitLayout>
  );
}

async function renderWithTicket(ticket: string) {
  // Fetch ticket details and session in parallel — both are independent.
  const sessionPromise = auth.api.getSession({ headers: await headers() });

  let details: InteractionDetails;
  try {
    details = await getInteraction(ticket);
  } catch (err) {
    if (err instanceof InteractionNotFoundError) return renderExpired();
    throw err;
  }

  const session = await sessionPromise;
  const needsReauth = (details.needs.includes("authentication") && !session?.user)
    || shouldForceReauth(details, session);
  if (needsReauth) redirect(signInUrlForInteraction(ticket));

  // prompt=none — AS would have skipped UI if it had session info. Bridge by
  // auto-approving with the current session; the server action redirects.
  if (details.skip && session?.user) {
    await approveInteraction(buildSkipFormData(ticket, details.requested_scopes));
    return null;
  }

  return (
    <SplitLayout
      brandHeadline={`${clientDisplayName(details.client)} needs your permission.`}
      brandSubhead="Review the requested permissions before continuing. You can deny at any time."
    >
      <ConsentForm
        ticket={ticket}
        client={details.client}
        subject={session?.user.email ?? session?.user.id ?? ""}
        scopes={details.requested_scopes}
        approveAction={approveInteraction}
        denyAction={denyInteraction}
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

/**
 * True when the session does not satisfy the AS's freshness requirements:
 * prompt=login forces re-auth; max_age caps session age.
 */
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

function buildSkipFormData(ticket: string, scopes: InteractionScope[]): FormData {
  const fd = new FormData();
  fd.set("ticket", ticket);
  for (const s of scopes) fd.append("granted_scope", s.name);
  return fd;
}
