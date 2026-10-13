import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ConsentPermissions } from "@/components/authorization/consent-permissions";
import { approveRequest, denyRequest } from "./actions";
import { Expiry } from "./expiry";
import type { PendingRequest } from "./store";

export function RequestList({ requests }: { requests: PendingRequest[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending sign-in requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const rar = req.authorization_details ?? [];
        const hasBody = rar.length > 0 || req.scopes.length > 0;
        return (
          <Card key={req.ticket}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ShieldCheck className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {req.client_name ?? "An app"} wants to sign you in
                    </p>
                    {req.binding_message ? (
                      <p className="text-sm text-muted-foreground">
                        Check this matches your other screen:{" "}
                        <span className="font-mono font-semibold text-foreground">
                          {req.binding_message}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <Expiry expiresAt={req.expires_at} />
              </div>
            </CardHeader>

            {hasBody && (
              <CardContent className="space-y-4">
                <ConsentPermissions scopes={req.scopes} authorizationDetails={rar} />
              </CardContent>
            )}

            <CardFooter className="grid grid-cols-2 gap-3">
              <form action={denyRequest}>
                <input type="hidden" name="ticket" value={req.ticket} />
                <Button type="submit" variant="outline" className="w-full">
                  Deny
                </Button>
              </form>
              <form action={approveRequest}>
                <input type="hidden" name="ticket" value={req.ticket} />
                <Button type="submit" className="w-full">
                  Approve
                </Button>
              </form>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
