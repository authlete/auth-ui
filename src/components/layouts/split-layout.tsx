/**
 * Two-column auth shell: dark brand panel on the left, content on the right.
 *
 * Used by /auth/[path] and /?interaction=... Below `lg` the brand panel
 * collapses and the content takes the full viewport.
 */

import type { ReactNode } from "react";
import Image from "next/image";
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
    <aside
      className="relative hidden overflow-hidden bg-[image:var(--gradient-authlete-brand)] text-white lg:flex lg:items-center lg:px-12"
    >
      <div className="absolute left-12 top-10">
        <Image
          src="/brand/authlete-wordmark-white.svg"
          alt="Authlete"
          width={140}
          height={33}
          priority
        />
      </div>
      <div className="relative max-w-md space-y-4">
        <span
          aria-hidden
          className="block h-[1.5px] w-[70px] bg-authlete-yellow"
        />
        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {headline}
        </h2>
        <p className="text-sm text-white/80">{subhead}</p>
        <ul className="mt-8 space-y-2 text-sm text-white/70">
          <Bullet>OAuth 2.1 + OpenID Connect</Bullet>
          <Bullet>Backed by Authlete&rsquo;s certified AS engine</Bullet>
          <Bullet>Your account works across every connected app</Bullet>
        </ul>
      </div>
      <p className="absolute bottom-10 left-12 text-xs text-white/60">
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
        className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-authlete-yellow"
      />
      <span>{children}</span>
    </li>
  );
}
