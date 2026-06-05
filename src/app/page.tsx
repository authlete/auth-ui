/**
 * Root entry — pure home page. In-flight authorizations are handled by
 * /authorizations/[id]. This page covers two states:
 *   - signed-in user (no transaction in flight) → AppShell home
 *   - anonymous user → SplitLayout welcome with sign-in/sign-up links
 */

import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SignedInHome } from "@/components/signed-in-home";
import { AppShell } from "@/components/layouts/app-shell";
import { SplitLayout } from "@/components/layouts/split-layout";

export default async function Home() {
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
