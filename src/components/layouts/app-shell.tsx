/**
 * Top-bar shell used by signed-in surfaces (home, /settings/*).
 *
 * Reads the better-auth session itself when not supplied, so simple callers
 * don't need to fetch one just to render the header. Callers that already
 * have the session in scope should pass it through to avoid a second read.
 */

import { headers } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth, type Session } from "@/lib/auth";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
  /** Caller-supplied session to skip a server-side re-read. */
  session?: Session | null;
};

export async function AppShell({ children, title, description, session: sessionProp }: Props) {
  const session = sessionProp !== undefined
    ? sessionProp
    : await auth.api.getSession({ headers: await headers() });

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <BrandMark variant="onLight" />
            <span>auth-ui</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {session?.user ? (
              <UserMenu name={session.user.name} email={session.user.email} />
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {(title || description) && (
          <div className="mb-6 space-y-1">
            {title ? <h1 className="text-2xl font-semibold tracking-tight">{title}</h1> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
