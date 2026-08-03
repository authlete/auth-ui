/**
 * Brand mark for the top bar and sign-in panel. Renders the configured logo
 * image when set, otherwise a neutral built-in mark drawn in `currentColor` so
 * it adapts to whatever surface (light bar, dark panel) it sits on.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";
import { activeBrand } from "@/brand/brand";

export function BrandMark({ className }: { className?: string }) {
  if (activeBrand.logoMark) {
    return (
      <Image
        src={activeBrand.logoMark}
        alt={activeBrand.productName}
        width={24}
        height={24}
        className={cn("h-6 w-6", className)}
      />
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-6 w-6", className)}>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" opacity="0.12" />
      <rect
        x="3.75"
        y="3.75"
        width="16.5"
        height="16.5"
        rx="4.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 17c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
