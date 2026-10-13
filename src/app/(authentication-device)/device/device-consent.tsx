import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsentPermissions } from "@/components/authorization/consent-permissions";
import { approveDevice, denyDevice } from "./actions";
import type { DeviceRequest } from "./verify";

export function DeviceConsent({
  userCode,
  request,
  subject,
}: {
  userCode: string;
  request: DeviceRequest;
  subject: string;
}) {
  const app = request.client_name ?? "An app";

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-center text-center">
        <CardTitle>{app} wants access to your account</CardTitle>
        <CardDescription>Signed in as {subject}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ConsentPermissions
          scopes={request.scopes}
          authorizationDetails={request.authorization_details ?? []}
        />
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-3">
        <form action={denyDevice}>
          <input type="hidden" name="user_code" value={userCode} />
          <Button type="submit" variant="outline" className="w-full">
            Deny
          </Button>
        </form>
        <form action={approveDevice}>
          <input type="hidden" name="user_code" value={userCode} />
          {request.scopes.map((s) => (
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
