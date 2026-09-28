import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layouts/app-shell";
import { listPendingForUser } from "../store";
import { RequestList } from "../request-list";
import { AutoRefresh } from "../auto-refresh";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/requests");
  const requests = await listPendingForUser([session.user.email, session.user.id]);

  return (
    <AppShell
      title="Sign-in requests"
      description="Approve or deny requests to sign in to apps using this account."
    >
      <AutoRefresh />
      <RequestList requests={requests} />
    </AppShell>
  );
}
