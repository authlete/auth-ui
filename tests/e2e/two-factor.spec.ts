import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as OTPAuth from "otpauth";

/**
 * Two-factor (TOTP) — the security-critical property, end to end and AS-free:
 * once an account enrolls TOTP, a password sign-in is diverted to the
 * /auth/two-factor challenge and only a valid code completes it.
 *
 * Enrollment is done through better-auth's API (deterministic — no flaky
 * one-time-code UI in setup); the challenge itself is driven through the real
 * UI, which is the flow under test. Guards the whole 2FA wiring: server plugin,
 * client plugin, and the challenge view.
 */

const PASSWORD = "Test1234!";
let seq = 0;
const uniqueEmail = () => `tfa_${Date.now()}_${seq++}@test.local`;
const codeFor = (uri: string) => OTPAuth.URI.parse(uri).generate();

async function signUp(page: Page, email: string) {
  await page.goto("/auth/sign-up");
  await page.fill("input[name=name]", "TFA User");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL("/", { timeout: 15_000 });
}

/** Enable TOTP for the signed-in account via the API; returns the otpauth:// URI. */
async function enrollTotp(context: BrowserContext, baseURL: string): Promise<string> {
  const headers = { origin: baseURL }; // better-auth validates the request origin
  const enable = await context.request.post(`${baseURL}/api/auth/two-factor/enable`, {
    data: { password: PASSWORD },
    headers,
  });
  expect(enable.ok()).toBeTruthy();
  const { totpURI } = await enable.json();
  const verify = await context.request.post(`${baseURL}/api/auth/two-factor/verify-totp`, {
    data: { code: codeFor(totpURI) },
    headers,
  });
  expect(verify.ok()).toBeTruthy();
  return totpURI;
}

test("TOTP: an enrolled account is gated by the challenge on sign-in", async ({
  page,
  context,
  baseURL,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  const totpURI = await enrollTotp(context, baseURL!);

  // Fresh sign-in with just the password must divert to the TOTP challenge.
  await context.clearCookies();
  await page.goto("/auth/sign-in");
  await page.fill("input[name=email]", email);
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/auth\/two-factor/, { timeout: 15_000 });

  // A valid code (real keystrokes — input-otp auto-submits on the 6th) completes
  // sign-in and lands on the account home.
  const otp = page.locator('input[name="code"], input[data-input-otp="true"]').first();
  await otp.click();
  await otp.pressSequentially(codeFor(totpURI), { delay: 50 });
  await expect(page).toHaveURL("/", { timeout: 15_000 });
});

/** Sign in with password → complete the TOTP challenge; expects to land on `/`. */
async function otpSignIn(page: Page, email: string, totpURI: string) {
  await page.fill("input[name=email]", email);
  await page.locator("input[type=password]").fill(PASSWORD);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/auth\/two-factor/, { timeout: 15_000 });
  const otp = page.locator('input[name="code"], input[data-input-otp="true"]').first();
  await otp.click();
  await otp.pressSequentially(codeFor(totpURI), { delay: 50 });
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

// Regression: after signing out and signing back in with 2FA, the just-verified
// user must land on home — not be bounced back to sign-in by a stale "no
// session" cache from the sign-out (auth completion does a full reload, so the
// destination starts with a clean session query).
test("TOTP: re-login after sign-out lands on home, not back on sign-in", async ({
  page,
  context,
  baseURL,
}) => {
  const email = uniqueEmail();
  await signUp(page, email);
  const totpURI = await enrollTotp(context, baseURL!);

  // First sign-in (fresh).
  await context.clearCookies();
  await page.goto("/auth/sign-in");
  await otpSignIn(page, email, totpURI);

  // Sign out via the account home, then sign in again from the landed page.
  await page
    .getByRole("button", { name: /^Sign Out$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
  await otpSignIn(page, email, totpURI);
});
