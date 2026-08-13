// Client for the AS authorized-apps management API (mutual JWT, subject-asserted).
import "server-only";
import { getInteractionProtocolConfig } from "@/config";
import { fetchFromAs } from "./as-client";

export type AuthorizedApp = {
  client: {
    client_id: string;
    name?: string;
    logo_uri?: string;
    client_uri?: string;
    redirect_uris?: string[];
  };
  scopes: string[];
};

// These calls are authenticated by the subject alone (not an authorization id),
// and target the AS's stable issuer origin rather than a per-request callback base.
const asOrigin = () => getInteractionProtocolConfig().asIssuerId;

export async function listAuthorizedApps(subject: string): Promise<AuthorizedApp[]> {
  const res = await fetchFromAs(asOrigin(), "/api/authorized-apps", { subject });
  if (!res.ok) throw new Error(`authorized-apps list failed (${res.status})`);
  return ((await res.json()) as { apps: AuthorizedApp[] }).apps;
}

export async function revokeAuthorizedApp(subject: string, clientId: string): Promise<void> {
  const res = await fetchFromAs(
    asOrigin(),
    `/api/authorized-apps/${encodeURIComponent(clientId)}`,
    { subject },
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(`authorized-apps revoke failed (${res.status})`);
}
