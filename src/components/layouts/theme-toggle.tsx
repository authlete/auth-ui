/**
 * Theme toggle for the AppShell / SplitLayout. Defers the icon until mounted
 * to avoid hydration-time flashing of the wrong state.
 */

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {mounted ? (
        isDark ? <Moon className="size-4" /> : <Sun className="size-4" />
      ) : (
        // Reserve space so the header doesn't shift on hydration.
        <span className="size-4" />
      )}
    </button>
  );
}
