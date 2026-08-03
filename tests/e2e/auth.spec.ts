import { test, expect, type Page } from "@playwright/test";

/**
 * Critical auth-ui flows, all driven through the native better-auth-ui surface
 * (no custom components under test). Each test provisions fresh accounts, so
 * runs are independent and repeatable against the local store.
 *
 * Coverage:
 *  - anonymous users are gated to sign-in, with no theme toggle on signed-out
 *    surfaces (theme control is sign-in-gated, per product decision)
 *  - sign-up lands on the account home; the user menu exposes the native theme
 *    control (theme plugin), and sign-out redirects back to sign-in
 *  - native `redirectTo` returns the user to the requested page after sign-in
 *  - multi-session: a second account joins the switcher; signing out the active
 *    account switches to the other (list stays live); the final sign-out
 *    redirects to sign-in (regression guard for the sign-out reactivity fix)
 */

const PASSWORD = "Test1234!";
let seq = 0;
// Unique per test run + per call, so repeated runs never collide on email.
const uniqueEmail = () => `e2e_${Date.now()}_${seq++}@test.local`;

async function signUp(page: Page, email: string, name: string) {
  await page.goto("/auth/sign-up");
  await page.fill("input[name=name]", name);
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL("/", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
}

async function signIn(page: Page, email: string) {
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", PASSWORD);
  await page.click('button[type=submit]');
}

/** The account home renders a Settings "Sign Out" button; sign out the active session. */
function signOutButton(page: Page) {
  return page.getByRole("button", { name: /^Sign Out$/ });
}

test("anonymous users are gated to sign-in with no signed-out theme toggle", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(page.locator("input[name=email]")).toBeVisible();
  await expect(page.locator("input[name=password]")).toBeVisible();

  // No user menu and no theme control on signed-out surfaces.
  await expect(page.getByLabel("Account")).toHaveCount(0);
  await expect(page.getByLabel("Light")).toHaveCount(0);
  await expect(page.getByLabel("Dark")).toHaveCount(0);

  // Social sign-in is env-gated: with no provider env set (the default), only
  // username/password is offered — no social buttons.
  await expect(page.getByRole("button", { name: /Continue with/i })).toHaveCount(0);
});

test("sign-up lands on account home, exposes native theme control, and sign-out redirects", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email, "Nova One");

  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("link", { name: /Add another account/ })).toBeVisible();

  // The user menu carries the native theme toggle (theme plugin), not a custom one.
  await page.getByRole("button", { name: "Account" }).click();
  await expect(page.getByRole("menuitem", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Theme" })).toBeVisible();
  await page.keyboard.press("Escape");

  await signOutButton(page).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
});

test("native redirectTo returns the user to the requested page after sign-in", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email, "Redirect Rae");
  await signOutButton(page).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });

  await page.goto("/auth/sign-in?redirectTo=/settings/security");
  await signIn(page, email);
  await expect(page).toHaveURL(/\/settings\/security/, { timeout: 15_000 });
});

test("multi-session: add a second account, switch on sign-out, redirect on final sign-out", async ({ page }) => {
  const a = uniqueEmail();
  const b = uniqueEmail();

  await signUp(page, a, "Alice A");

  // Add a second account via "Add another account" → Sign Up.
  await page.getByRole("link", { name: /Add another account/ }).click();
  await page.waitForURL(/\/auth\/sign-in/);
  await page.getByRole("link", { name: "Sign Up" }).click();
  await page.waitForURL(/\/auth\/sign-up/);
  await page.fill("input[name=name]", "Bob B");
  await page.fill("input[name=email]", b);
  await page.fill("input[name=password]", PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL("/", { timeout: 15_000 });

  // Active account is the newly-added B; the switcher lists both.
  await expect(page.getByText(b)).toBeVisible();
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: /Switch Account/ }).click();
  await expect(page.getByRole("menuitem").filter({ hasText: a })).toBeVisible();
  await expect(page.getByRole("menuitem").filter({ hasText: b })).toBeVisible();
  // Close the submenu, then the root menu, and wait for the portal to detach so
  // its overlay stops intercepting the sign-out click below.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Theme" })).toHaveCount(0);

  // Sign out the active account (B): stays authenticated on the home, switched to A.
  await signOutButton(page).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText(a)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(b)).toHaveCount(0);

  // Sign out the last account: now redirected to sign-in.
  await signOutButton(page).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 15_000 });
});
