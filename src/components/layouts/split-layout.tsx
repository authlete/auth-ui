/**
 * Two-column auth shell: brand panel on the left, content on the right.
 *
 * Used by /auth/[path] and /authorizations/[id]. Below `lg` the brand panel
 * collapses and the content takes the full viewport. Panel background, copy,
 * and accent all come from the active brand (src/brand).
 */

import type { ReactNode } from "react";
import { activeBrand } from "@/brand/brand";
import { BrandMark } from "./brand-mark";

type Props = {
  children: ReactNode;
  brandHeadline?: string;
  brandSubhead?: string;
};

export function SplitLayout({
  children,
  brandHeadline = activeBrand.panel.headline,
  brandSubhead = activeBrand.panel.subhead,
}: Props) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel headline={brandHeadline} subhead={brandSubhead} />
      <section className="relative flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </div>
  );
}

function BrandPanel({ headline, subhead }: { headline: string; subhead: string }) {
  return (
    <aside
      className="relative hidden overflow-hidden text-white lg:flex lg:items-center lg:px-12"
      style={{ background: "var(--brand-panel)" }}
    >
      <div className="absolute left-12 top-10 flex items-center gap-2 text-white">
        <BrandMark className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">{activeBrand.productName}</span>
      </div>
      <div className="relative max-w-md space-y-4">
        <span aria-hidden className="block h-[1.5px] w-[70px] bg-brand-accent" />
        <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {headline}
        </h2>
        <p className="text-sm text-white/80">{subhead}</p>
        {activeBrand.panel.bullets.length > 0 && (
          <ul className="mt-8 space-y-2 text-sm text-white/70">
            {activeBrand.panel.bullets.map((b) => (
              <Bullet key={b}>{b}</Bullet>
            ))}
          </ul>
        )}
      </div>
      <p className="absolute bottom-10 left-12 text-xs text-white/60">{activeBrand.panel.footer}</p>
    </aside>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-brand-accent"
      />
      <span>{children}</span>
    </li>
  );
}
