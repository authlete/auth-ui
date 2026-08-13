/**
 * Minimal top-bar shell for signed-in surfaces (home, /settings/*): brand +
 * user menu. `UserButton` reads its own auth state (and hosts the theme
 * toggle via the theme plugin), so the shell carries no session itself. A
 * richer app shell can replace this later.
 */

import Link from "next/link";
import { AppWindow } from "lucide-react";
import type { ReactNode } from "react";
import { activeBrand } from "@/brand/brand";
import { BrandMark } from "./brand-mark";
import { UserButton } from "@/components/auth/user/user-button";

const USER_LINKS = [
  { label: "Connected apps", href: "/apps", icon: <AppWindow className="size-4" /> },
];

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
};

export function AppShell({ children, title, description }: Props) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <BrandMark />
            <span>{activeBrand.productName}</span>
          </Link>
          <UserButton size="icon" links={USER_LINKS} />
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
