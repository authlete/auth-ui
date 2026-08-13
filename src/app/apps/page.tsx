import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAuthorizedApps } from "@/lib/authorized-apps";
import { revokeApp } from "@/server/authorized-apps-actions";
import { RevokeButton } from "@/components/apps/revoke-button";
import { AppShell } from "@/components/layouts/app-shell";
import { Card, CardAction, CardContent, CardHeader } from "@/components/ui/card";
import { scopeLabel } from "@/lib/consent-labels";
import { scopeIcon } from "@/lib/scope-icons";

export default async function AppsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/apps");
  const apps = await listAuthorizedApps(session.user.id);

  return (
    <AppShell title="Connected apps" description="Apps you've given access to your account.">
      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No apps have access to your account yet.</p>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const name = app.client.name ?? app.client.client_id;
            const redirects = app.client.redirect_uris ?? [];
            return (
              <Card key={app.client.client_id}>
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    {app.client.logo_uri ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={app.client.logo_uri}
                        alt=""
                        className="size-10 rounded-lg object-contain"
                      />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {app.client.client_id}
                      </p>
                    </div>
                  </div>
                  <CardAction>
                    <form action={revokeApp}>
                      <input type="hidden" name="client_id" value={app.client.client_id} />
                      <RevokeButton />
                    </form>
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">Can access</p>
                    <ul className="space-y-1.5">
                      {app.scopes.map((s) => {
                        const Icon = scopeIcon(s);
                        return (
                          <li key={s} className="flex items-center gap-2 text-sm">
                            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <span>{scopeLabel(s)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {(app.client.client_uri || redirects.length > 0) && (
                    <dl className="space-y-0.5 border-t pt-3 text-xs text-muted-foreground">
                      {app.client.client_uri && (
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0">Website</dt>
                          <dd className="truncate">
                            <a
                              href={app.client.client_uri}
                              className="underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {app.client.client_uri}
                            </a>
                          </dd>
                        </div>
                      )}
                      {redirects.length > 0 && (
                        <div className="flex gap-2">
                          <dt className="w-24 shrink-0">Redirects to</dt>
                          <dd className="truncate font-mono">{redirects.join(", ")}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
