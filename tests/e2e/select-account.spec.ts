import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { createHash, randomBytes, randomUUID } from "node:crypto";

/**
 * Integration E2E for OIDC `prompt=select_account`, the one auth-ui flow that
 * can't be exercised in isolation: it needs the paired Authorization Server
 * (the typescript-oauth-server on :3000) to drive the interaction protocol.
 *
 * The test is opt-in: when the AS isn't reachable (e.g. CI running auth-ui
 * alone) it skips cleanly, so it lives in the mergeable suite without making
 * CI depend on the AS. Run it locally with the paired AS up on :3000.
 *
 * Flow: register a throwaway RP via Dynamic Client Registration → start an
 * authorize with `prompt=select_account` → auth-ui shows the account chooser
 * over both signed-in device sessions → pick one → the AS returns to consent
 * for that account → approve → the RP receives an authorization code.
 */

const PASSWORD = "Test1234!";
const AS_BASE_URL = process.env.AS_BASE_URL;
const RP_REDIRECT_URI = "http://localhost:4040/callback";

const b64url = (buf: Buffer) =>
  buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Register a throwaway public (PKCE) RP client via RFC 7591 DCR. */
async function registerClient(asBase: string): Promise<string | null> {
  try {
    const res = await fetch(`${asBase}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "auth-ui select_account E2E",
        redirect_uris: [RP_REDIRECT_URI],
        grant_types: ["authorization_code"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "openid profile email",
        application_type: "web",
      }),
    });
    if (!res.ok) return null;
    return (await res.json()).client_id ?? null;
  } catch {
    return null; // AS unreachable → caller skips.
  }
}

/** Start an authorize with prompt=select_account; returns the auth-ui URL the AS redirects to. */
async function selectAccountAuthorizeUrl(asBase: string, clientId: string): Promise<string> {
  const codeChallenge = b64url(
    createHash("sha256")
      .update(b64url(randomBytes(48)))
      .digest(),
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: RP_REDIRECT_URI,
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: randomUUID(),
    prompt: "select_account",
  });
  const res = await fetch(`${asBase}/oauth/authorize?${params}`, { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) throw new Error(`authorize did not redirect (status ${res.status})`);
  return location;
}

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/auth/sign-up");
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("/", { timeout: 15_000 });
}

/** Capture the RP redirect_uri hit (the browser can't load :4040, but the URL carries the code). */
function captureRpCallback(context: BrowserContext, page: Page): Promise<URL> {
  return new Promise((resolve) => {
    const onUrl = (url: string) => {
      if (url.startsWith("http://localhost:4040")) resolve(new URL(url));
    };
    context.route("http://localhost:4040/**", (route) => {
      onUrl(route.request().url());
      return route.fulfill({ status: 200, contentType: "text/html", body: "OK" });
    });
    page.on("requestfailed", (r) => onUrl(r.url()));
  });
}

test.describe("OIDC prompt=select_account (requires paired AS on :3000)", () => {
  let clientId: string | null = null;

  test.beforeAll(async () => {
    if (AS_BASE_URL) clientId = await registerClient(AS_BASE_URL);
  });

  test("chooser lists signed-in accounts; selection drives consent → RP code", async ({
    page,
    context,
  }) => {
    test.skip(!AS_BASE_URL, "AS_BASE_URL not set — paired AS unavailable");
    test.skip(!clientId, "Paired AS not reachable on AS_BASE_URL — start it on :3000");

    const a = `sa_a_${Date.now()}@test.local`;
    const b = `sa_b_${Date.now()}@test.local`;

    // Two signed-in device sessions (multi-session); the second is active.
    await signUp(page, a, "Alice A");
    await page.getByRole("link", { name: /Add another account/ }).click();
    await page.waitForURL(/\/auth\/sign-in/);
    await page.getByRole("link", { name: "Sign Up" }).click();
    await page.waitForURL(/\/auth\/sign-up/);
    await page.fill("input[name=name]", "Bob B");
    await page.fill("input[name=email]", b);
    await page.fill("input[name=password]", PASSWORD);
    await page.click("button[type=submit]");
    await page.waitForURL("/", { timeout: 15_000 });

    const rpCallback = captureRpCallback(context, page);

    // Enter the authorization flow; auth-ui must show the account chooser.
    const authUrl = await selectAccountAuthorizeUrl(AS_BASE_URL!, clientId!);
    await page.goto(authUrl);
    // The chooser card lists both signed-in accounts as selectable buttons.
    await expect(page.getByRole("button").filter({ hasText: a })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button").filter({ hasText: b })).toBeVisible();

    // Pick account A → the AS returns the consent step for that account.
    await page.getByRole("button").filter({ hasText: a }).first().click();
    await expect(page.getByRole("button", { name: /Approve/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(a)).toBeVisible();

    // Approve → the RP receives an authorization code at its redirect_uri.
    await page.getByRole("button", { name: /Approve/ }).click();
    const callback = await rpCallback;
    expect(callback.searchParams.get("code")).toBeTruthy();
  });
});
