/**
 * Catch-all settings route — renders <Settings path={...} /> from the
 * better-auth-ui shadcn registry inside our AppShell + SettingsShell layout.
 *
 * `hideNav` suppresses the registry's built-in tab strip; we render our own
 * left-rail nav instead.
 */

import { notFound } from "next/navigation";
import { AppShell } from "@/components/layouts/app-shell";
import { SettingsShell } from "@/components/layouts/settings-shell";
import { Settings } from "@/components/auth/settings/settings";

const VALID_SETTINGS_PATHS = new Set(["account", "security"]);

type PageProps = {
  params: Promise<{ path: string }>;
};

export default async function SettingsPage({ params }: PageProps) {
  const { path } = await params;
  if (!VALID_SETTINGS_PATHS.has(path)) notFound();

  return (
    <AppShell
      title="Settings"
      description="Manage your account profile and security."
    >
      <SettingsShell current={path}>
        <Settings path={path} hideNav />
      </SettingsShell>
    </AppShell>
  );
}
