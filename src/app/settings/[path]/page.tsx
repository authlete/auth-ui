/**
 * Catch-all settings route — renders the better-auth-ui `<Settings />` view
 * (its own account/security tab strip) inside the AppShell.
 */

import { notFound } from "next/navigation";
import { AppShell } from "@/components/layouts/app-shell";
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
      <Settings path={path} />
    </AppShell>
  );
}
