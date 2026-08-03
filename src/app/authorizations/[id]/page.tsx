/**
 * /authorizations/[id] — entry point the AS redirects the user to for an
 * in-flight authorization transaction.
 *
 * The AS orchestrates two interactions; this page executes them:
 *   1. authenticate — ensure a session that meets the requirement (else →
 *      sign-in), then report the authenticated subject to the AS.
 *   2. consent — render the scopes the AS says still need consent (already-granted
 *      ones shown read-only for context); the server action reports the grant.
 * If the AS replies `done` (nothing to consent), redirect straight to its resume.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getAuthorization,
  submitOutcome,
  verifyInteraction,
  AuthorizationNotFoundError,
  type AuthorizationState,
} from "@/lib/as-client";
import { approveConsent, denyConsent, selectAccount } from "@/server/authorization-actions";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConsentForm } from "@/components/consent-form";
import { AccountChooser } from "@/components/account-chooser";
import { SplitLayout } from "@/components/layouts/split-layout";
import {
  clientDisplayName,
  signInUrlForAuthorization,
  ACCOUNT_SELECTED_PARAM,
} from "@/lib/authorization";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ interaction?: string; [ACCOUNT_SELECTED_PARAM]?: string }>;
};

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export default async function AuthorizationPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const { interaction } = sp;
  if (!interaction) return renderExpired();

  // The interaction token carries the AS callback base and request start time;
  // verify it once here.
  let asBase: string;
  let issuedAt: number;
  try {
    ({ asBase, issuedAt } = await verifyInteraction(interaction, id));
  } catch {
    return renderExpired();
  }

  const reqHeaders = await headers();
  let state: AuthorizationState;
  let session: Session;
  try {
    [state, session] = await Promise.all([
      getAuthorization(asBase, id),
      auth.api.getSession({ headers: reqHeaders }),
    ]);
  } catch (err) {
    if (err instanceof AuthorizationNotFoundError) return renderExpired();
    throw err;
  }

  // Interaction 1 — authenticate: ensure a session that meets the requirement.
  if (!session?.user || shouldForceReauth(state.authenticate, session, issuedAt)) {
    redirect(signInUrlForAuthorization(id, interaction, state.authenticate.login_hint));
  }

  // prompt=select_account: let the user pick which signed-in account to use
  // before proceeding. Fires once per request — the ACCOUNT_SELECTED marker set
  // on the return from the chooser breaks the loop, mirroring prompt=login above.
  const prompts = state.authenticate.prompt?.split(/\s+/) ?? [];
  if (prompts.includes("select_account") && sp[ACCOUNT_SELECTED_PARAM] !== "1") {
    const devices = await auth.api.listDeviceSessions({ headers: reqHeaders });
    const accounts = devices.map((d) => ({
      id: d.user.id,
      name: d.user.name,
      email: d.user.email,
      token: d.session.token,
    }));
    return (
      <SplitLayout
        brandHeadline="Choose an account"
        brandSubhead={`to continue to ${clientDisplayName(state.client)}`}
      >
        <AccountChooser
          authorizationId={id}
          interaction={interaction}
          client={state.client}
          accounts={accounts}
          addAccountUrl={signInUrlForAuthorization(id, interaction, state.authenticate.login_hint)}
          selectAction={selectAccount}
        />
      </SplitLayout>
    );
  }

  // Report the authenticate outcome; the AS reconciles → consent or done.
  const step = await submitOutcome(asBase, id, {
    type: "authenticate",
    subject: session.user.id,
    amr: ["pwd"],
    authenticated_at: authTime(session),
    user_claims: {
      sub: session.user.id,
      name: session.user.name,
      email: session.user.email,
      email_verified: session.user.emailVerified ?? false,
    },
  });
  if (step.next === "done") redirect(step.redirect_to);

  // Interaction 2 — consent: show what the AS says still needs consent.
  return (
    <SplitLayout
      brandHeadline={`${clientDisplayName(state.client)} needs your permission.`}
      brandSubhead="Review the requested permissions before continuing. You can deny at any time."
    >
      <ConsentForm
        authorizationId={id}
        asBase={asBase}
        client={state.client}
        subject={session.user.email ?? session.user.id}
        newScopes={step.consent.new}
        alreadyGranted={step.consent.already_granted}
        approveAction={approveConsent}
        denyAction={denyConsent}
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
            This authorization request has expired or was already completed. Please return to the
            application and try again.
          </CardDescription>
        </CardHeader>
      </Card>
    </SplitLayout>
  );
}

function shouldForceReauth(
  authenticate: AuthorizationState["authenticate"],
  session: { session?: { createdAt?: string | Date } },
  requestStartedAt: number,
): boolean {
  if (!session.session?.createdAt) return false;
  const authTimeSeconds = new Date(session.session.createdAt).getTime() / 1000;
  // prompt=login: re-authenticate unless the session was established for this
  // request (i.e. after it started) — otherwise the requirement never clears
  // and the user loops back to sign-in.
  if (authenticate.prompt?.split(/\s+/).includes("login")) {
    return authTimeSeconds < requestStartedAt;
  }
  // max_age <= 0 carries no constraint (Authlete reports 0 when max_age is absent).
  if (typeof authenticate.max_age === "number" && authenticate.max_age > 0) {
    if (Date.now() / 1000 - authTimeSeconds > authenticate.max_age) return true;
  }
  return false;
}

function authTime(session: NonNullable<Session>): number {
  return session.session.createdAt
    ? Math.floor(new Date(session.session.createdAt).getTime() / 1000)
    : Math.floor(Date.now() / 1000);
}
