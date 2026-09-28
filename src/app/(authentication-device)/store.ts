// Local store of CIBA sign-in requests. The AS pushes each request and forgets
// it, so auth-ui holds them until the user approves or denies. The full payload
// is kept as JSON; only the columns used for filtering are broken out.
import "server-only";
import { createClient } from "@libsql/client";
import { config } from "@/config";
import type { RarElement, Scope } from "@/lib/as-client";

export type PendingRequest = {
  ticket: string;
  login_hint?: string;
  client_name?: string;
  scopes: Scope[];
  authorization_details?: RarElement[];
  binding_message?: string;
  expires_at: number;
};

const db = createClient({ url: config.databaseUrl, authToken: config.databaseAuthToken });

let ready: Promise<unknown> | undefined;
const init = () =>
  (ready ??= db.execute(`CREATE TABLE IF NOT EXISTS ciba_request (
    ticket     TEXT PRIMARY KEY,
    login_hint TEXT,
    expires_at INTEGER NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending',
    payload    TEXT NOT NULL
  )`));

export async function savePending(req: PendingRequest): Promise<void> {
  await init();
  await db.execute({
    sql: `INSERT OR REPLACE INTO ciba_request (ticket, login_hint, expires_at, status, payload)
          VALUES (?, ?, ?, 'pending', ?)`,
    args: [req.ticket, req.login_hint ?? null, req.expires_at, JSON.stringify(req)],
  });
}

// login_hint is the AS's identifier for the account, matched against the user.
export async function listPendingForUser(hints: string[]): Promise<PendingRequest[]> {
  await init();
  const now = Math.floor(Date.now() / 1000);
  const { rows } = await db.execute({
    sql: `SELECT payload FROM ciba_request
          WHERE status = 'pending' AND expires_at > ?
            AND login_hint IN (${hints.map(() => "?").join(", ")})
          ORDER BY expires_at`,
    args: [now, ...hints],
  });
  return rows.map((r) => JSON.parse(String(r.payload)) as PendingRequest);
}

export async function getPending(ticket: string): Promise<PendingRequest | null> {
  await init();
  const { rows } = await db.execute({
    sql: `SELECT payload FROM ciba_request WHERE ticket = ?`,
    args: [ticket],
  });
  return rows[0] ? (JSON.parse(String(rows[0].payload)) as PendingRequest) : null;
}

export async function markResolved(ticket: string, status: "approved" | "denied"): Promise<void> {
  await init();
  await db.execute({
    sql: `UPDATE ciba_request SET status = ? WHERE ticket = ?`,
    args: [status, ticket],
  });
}
