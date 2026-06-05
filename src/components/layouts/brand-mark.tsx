/**
 * Square brand mark used across the AppShell and SplitLayout.
 * `variant` chooses a light gradient (for dark surfaces) or a darker gradient
 * (for light surfaces).
 */

import { cn } from "@/lib/utils";

type Props = {
  variant?: "onLight" | "onDark";
  className?: string;
};

export function BrandMark({ variant = "onLight", className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
        variant === "onLight"
          ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white"
          : "bg-gradient-to-br from-indigo-400 to-sky-400 text-zinc-900",
        className,
      )}
    >
      A
    </span>
  );
}
