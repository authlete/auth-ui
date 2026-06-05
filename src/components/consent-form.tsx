/**
 * Consent form — client component.
 *
 * Renders the upstream RP's identity + requested scopes with checkboxes
 * (default-checked, user can uncheck). Two submit buttons: Approve (uses
 * `approveInteraction` server action) and Deny (uses `denyInteraction`).
 *
 * Server actions are passed in via props rather than imported here so this
 * file stays purely UI; the server component owns the action binding.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { InteractionClient, InteractionScope } from "@/lib/as-client";
import { clientDisplayName } from "@/lib/interaction";

type Props = {
  ticket: string;
  client: InteractionClient;
  subject: string;
  scopes: InteractionScope[];
  approveAction: (formData: FormData) => Promise<void>;
  denyAction: (formData: FormData) => Promise<void>;
};

export function ConsentForm({
  ticket,
  client,
  subject,
  scopes,
  approveAction,
  denyAction,
}: Props) {
  // Pre-check all requested scopes. Users can uncheck individual ones.
  const [granted, setGranted] = useState<Set<string>>(new Set(scopes.map((s) => s.name)));

  const toggle = (name: string) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{clientDisplayName(client)} wants access to your account</CardTitle>
        <CardDescription>Signed in as {subject}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">It is requesting the following permissions:</p>
        <div className="space-y-3">
          {scopes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scopes requested.</p>
          ) : (
            scopes.map((s) => (
              <div key={s.name} className="flex items-start gap-3">
                <Checkbox
                  id={`scope-${s.name}`}
                  checked={granted.has(s.name)}
                  onCheckedChange={() => toggle(s.name)}
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor={`scope-${s.name}`} className="font-medium">
                    {s.name}
                  </Label>
                  {s.description ? (
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
        {(client.policy_uri || client.tos_uri) && (
          <p className="text-xs text-muted-foreground">
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
      <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <form action={denyAction}>
          <input type="hidden" name="ticket" value={ticket} />
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            Deny
          </Button>
        </form>
        <form action={approveAction}>
          <input type="hidden" name="ticket" value={ticket} />
          {Array.from(granted).map((s) => (
            <input key={s} type="hidden" name="granted_scope" value={s} />
          ))}
          <Button type="submit" className="w-full sm:w-auto">
            Approve
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
