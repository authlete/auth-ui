/**
 * Account chooser — shown for OIDC prompt=select_account.
 *
 * Lists the accounts currently signed in on this device (better-auth
 * multi-session), plus an "use another account" link that routes to sign-in.
 * Each row submits the `selectAccount` server action with that account's session
 * token; the action sets it active and returns to the authorization flow.
 */

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clientDisplayName } from "@/lib/authorization";
import type { Client } from "@/lib/as-client";

type Account = {
  id: string;
  name?: string | null;
  email: string;
  token: string;
};

type Props = {
  authorizationId: string;
  interaction: string;
  client: Client;
  accounts: Account[];
  addAccountUrl: string;
  selectAction: (formData: FormData) => Promise<void>;
};

function initials(account: Account): string {
  return (account.name || account.email).slice(0, 2).toUpperCase();
}

export function AccountChooser({
  authorizationId,
  interaction,
  client,
  accounts,
  addAccountUrl,
  selectAction,
}: Props) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose an account</CardTitle>
        <CardDescription>to continue to {clientDisplayName(client)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {accounts.map((account) => (
          <form key={account.token} action={selectAction}>
            <input type="hidden" name="authorization" value={authorizationId} />
            <input type="hidden" name="interaction" value={interaction} />
            <input type="hidden" name="session_token" value={account.token} />
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar className="size-8 shrink-0 bg-muted">
                <AvatarFallback className="text-xs font-medium">{initials(account)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {account.name || account.email}
                </span>
                {account.name ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {account.email}
                  </span>
                ) : null}
              </span>
            </button>
          </form>
        ))}
        <Link
          href={addAccountUrl}
          className="flex w-full items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-base leading-none">
            +
          </span>
          Use another account
        </Link>
      </CardContent>
    </Card>
  );
}
