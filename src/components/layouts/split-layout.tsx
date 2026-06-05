/**
 * Two-column auth shell: dark brand panel on the left, content on the right.
 *
 * Used by /auth/[path] and /?interaction=... Below `lg` the brand panel
 * collapses and the content takes the full viewport.
 */

import type { ReactNode } from "react";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";

type Props = {
  children: ReactNode;
  brandHeadline?: string;
  brandSubhead?: string;
};

export function SplitLayout({
  children,
  brandHeadline = "Secure sign-in for modern applications.",
  brandSubhead = "Standards-based OAuth 2.1 and OpenID Connect, powered by Authlete.",
}: Props) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel headline={brandHeadline} subhead={brandSubhead} />
      <section className="relative flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}

function BrandPanel({ headline, subhead }: { headline: string; subhead: string }) {
  return (
    <aside className="relative hidden overflow-hidden bg-zinc-950 text-zinc-100 lg:flex lg:items-center lg:px-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 20%, rgba(99,102,241,0.25), transparent 70%), radial-gradient(50% 40% at 80% 80%, rgba(56,189,248,0.18), transparent 70%)",
        }}
      />
      <div className="absolute left-12 top-10 flex items-center gap-2 text-sm font-medium tracking-tight">
        <BrandMark variant="onDark" />
        <span>auth-ui</span>
      </div>
      <div className="relative max-w-md space-y-4">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {headline}
        </h2>
        <p className="text-sm text-zinc-300">{subhead}</p>
        <ul className="mt-8 space-y-2 text-sm text-zinc-400">
          <Bullet>OAuth 2.1 + OpenID Connect</Bullet>
          <Bullet>Backed by Authlete&rsquo;s certified AS engine</Bullet>
          <Bullet>Your account works across every connected app</Bullet>
        </ul>
      </div>
      <p className="absolute bottom-10 left-12 text-xs text-zinc-500">
        Powered by Authlete &middot; better-auth
      </p>
    </aside>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-zinc-500"
      />
      <span>{children}</span>
    </li>
  );
}
