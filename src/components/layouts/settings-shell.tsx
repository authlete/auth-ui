/**
 * Settings page chrome — left-rail nav + content column.
 *
 * Renders the section links on the left; the registry `<Settings hideNav>`
 * renders the actual panels on the right.
 */

import Link from "next/link";
import { Shield, User2 } from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

type SettingsNavItem = {
  path: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const SETTINGS_NAV: readonly SettingsNavItem[] = [
  { path: "account", label: "Account", icon: User2 },
  { path: "security", label: "Security", icon: Shield },
];

export function SettingsShell({
  current,
  children,
}: {
  current: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 md:grid-cols-[180px_1fr]">
      <nav aria-label="Settings sections" className="flex flex-col gap-1 text-sm">
        {SETTINGS_NAV.map(({ path, label, icon: Icon }) => {
          const active = path === current;
          return (
            <Link
              key={path}
              href={`/settings/${path}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                active && "bg-muted font-medium text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
