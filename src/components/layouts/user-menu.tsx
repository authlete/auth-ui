/**
 * User-menu avatar in the AppShell top bar. Drops down to account links
 * and sign-out.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { SETTINGS_NAV } from "./settings-shell";

type Props = {
  name: string | null | undefined;
  email: string;
};

export function UserMenu({ name, email }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.refresh();
  }

  const initials = (name || email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open user menu"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-56">
        <div className="flex flex-col gap-0.5 px-2 py-1.5">
          {name ? <span className="text-sm font-medium">{name}</span> : null}
          <span className="text-xs text-muted-foreground">{email}</span>
        </div>
        <DropdownMenuSeparator />
        {SETTINGS_NAV.map(({ path, label, icon: Icon }) => (
          <DropdownMenuItem key={path} render={<Link href={`/settings/${path}`} />}>
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
