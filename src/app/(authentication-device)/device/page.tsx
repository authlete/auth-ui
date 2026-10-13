import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layouts/app-shell";
import { verifyUserCode } from "./verify";
import { CodeEntry } from "./code-entry";
import { DeviceConsent } from "./device-consent";

export const dynamic = "force-dynamic";

// The RFC 8628 verification_uri target. The device shows the user this URL + a
// user_code; the user signs in here, we resolve the code at the AS, and they
// approve. (verification_uri_complete puts the code in ?user_code.)
export default async function DevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; done?: string }>;
}) {
  const { user_code: userCode, done } = await searchParams;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const back = userCode ? `/device?user_code=${encodeURIComponent(userCode)}` : "/device";
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(back)}`);
  }

  if (done) {
    return (
      <AppShell title="Device sign-in">
        <p className="text-sm text-muted-foreground">
          {done === "approved"
            ? "Approved. Return to your device — it will continue automatically."
            : "Denied. You can close this page."}
        </p>
      </AppShell>
    );
  }

  if (!userCode) {
    return (
      <AppShell title="Device sign-in" description="Enter the code shown on your device.">
        <CodeEntry />
      </AppShell>
    );
  }

  const result = await verifyUserCode(userCode);
  if (!result.ok) {
    return (
      <AppShell title="Device sign-in" description="Enter the code shown on your device.">
        <CodeEntry notFound />
      </AppShell>
    );
  }

  return (
    <AppShell title="Device sign-in">
      <DeviceConsent
        userCode={userCode}
        request={result.request}
        subject={session.user.email ?? session.user.id}
      />
    </AppShell>
  );
}
