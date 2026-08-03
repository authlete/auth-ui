/**
 * Root entry — the signed-in account home (native better-auth-ui `<Settings>`).
 *
 * Auth is gated by `proxy.ts` — a per-request session-cookie check that's
 * always fresh, so it can't be raced by App Router caches (which is what bounced
 * just-signed-in users after 2FA / re-login). No server-component session read
 * here; `<Settings>` also runs the native `useAuthenticate` guard as a fallback.
 * Real users reach the app via /authorizations/[id] from the AS, not this page.
 */

import Link from "next/link";
import { UserPlus2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Settings } from "@/components/auth/settings/settings";
import { AppShell } from "@/components/layouts/app-shell";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <AppShell title="Account" description="Manage your profile and signed-in accounts.">
      <div className="space-y-6">
        <Settings view="account" hideNav />
        <Link href="/auth/sign-in" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
          <UserPlus2 className="size-4" />
          Add another account
        </Link>
      </div>
    </AppShell>
  );
}
