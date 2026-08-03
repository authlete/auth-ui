/**
 * Root entry — the signed-in account home.
 *
 * Unauthenticated users are redirected to sign-in; there is no separate
 * anonymous landing (auth-ui is a login/consent front-end, not a marketing
 * site — real users arrive at /authorizations/[id] via the AS, never here).
 *
 * The signed-in view is the native better-auth-ui account surface (`<Settings>`),
 * which includes the `useAuthenticate` guard — so signing out (via the account
 * card or the user menu) redirects back to sign-in.
 */

import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserPlus2 } from "lucide-react";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Settings } from "@/components/auth/settings/settings";
import { AppShell } from "@/components/layouts/app-shell";
import { cn } from "@/lib/utils";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in");

  return (
    <AppShell
      title="Account"
      description="Manage your profile and signed-in accounts."
    >
      <div className="space-y-6">
        <Settings view="account" hideNav />
        <Link
          href="/auth/sign-in"
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <UserPlus2 className="size-4" />
          Add another account
        </Link>
      </div>
    </AppShell>
  );
}
