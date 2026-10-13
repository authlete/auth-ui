import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client, RarElement, Scope } from "@/lib/as-client";
import { clientDisplayName } from "@/lib/authorization";
import { ConsentPermissions } from "./consent-permissions";

type Props = {
  authorizationId: string;
  asBase: string;
  client: Client;
  subject: string;
  newScopes: Scope[];
  authorizationDetails: RarElement[];
  approveAction: (formData: FormData) => Promise<void>;
  denyAction: (formData: FormData) => Promise<void>;
};

export function ConsentForm({
  authorizationId,
  asBase,
  client,
  subject,
  newScopes,
  authorizationDetails,
  approveAction,
  denyAction,
}: Props) {
  const app = clientDisplayName(client);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-center text-center">
        {client.logo_uri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logo_uri} alt="" className="mb-2 h-12 w-12 rounded-md object-contain" />
        )}
        <CardTitle>{app} wants access to your account</CardTitle>
        <CardDescription>Signed in as {subject}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ConsentPermissions scopes={newScopes} authorizationDetails={authorizationDetails} />

        {(client.policy_uri || client.tos_uri) && (
          <p className="pt-1 text-xs text-muted-foreground">
            {client.policy_uri && (
              <a href={client.policy_uri} className="underline" target="_blank" rel="noreferrer">
                Privacy policy
              </a>
            )}
            {client.policy_uri && client.tos_uri && " · "}
            {client.tos_uri && (
              <a href={client.tos_uri} className="underline" target="_blank" rel="noreferrer">
                Terms of service
              </a>
            )}
          </p>
        )}
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-3">
        <form action={denyAction}>
          <input type="hidden" name="authorization" value={authorizationId} />
          <input type="hidden" name="as_base" value={asBase} />
          <Button type="submit" variant="outline" className="w-full">
            Deny
          </Button>
        </form>
        <form action={approveAction}>
          <input type="hidden" name="authorization" value={authorizationId} />
          <input type="hidden" name="as_base" value={asBase} />
          {newScopes.map((s) => (
            <input key={s.name} type="hidden" name="granted_scope" value={s.name} />
          ))}
          <Button type="submit" className="w-full">
            Approve
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
