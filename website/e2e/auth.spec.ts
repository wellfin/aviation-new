import { expect, test, type Page } from "@playwright/test";
import { createVerifiedUser, fillOtp, PASSWORD, readCode, sharedUser, uiLogin, uniqueEmail } from "./helpers";

async function openUserMenu(page: Page, firstName: string) {
  await page.getByRole("banner").getByRole("button", { name: new RegExp(firstName) }).click();
}

test.describe("authentication", () => {
  test("provider signup → email code → verified → account", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/signup?type=provider&plan=pro");
    await expect(page.getByText(/Selected plan:/)).toBeVisible();

    // Step 01 — account basics.
    await page.getByLabel("First name").fill("Amelia");
    await page.getByLabel("Last name").fill("Earhart");
    await page.getByLabel("Email address").fill(email);
    await page.locator("#signup-password").fill(PASSWORD);
    await page.getByRole("button", { name: "Next →" }).click();

    // Step 02 — profile details (provider service preselected).
    await expect(page.getByRole("form", { name: "Profile details" })).toBeVisible();
    await page.locator("#phone").fill("20 7946 0000");
    await page.getByText("Charter Operator").click();
    await page.locator("#company").fill("E2E Charter Ltd");
    const since = Date.now();
    await page.getByRole("button", { name: /Create Account/ }).click();

    await page.waitForURL(/\/verify-email\?email=/);
    const code = await readCode(email, { subject: "Verify", since, digits: 6 });
    await fillOtp(page, code);
    await page.locator('form button[type="submit"]').click();

    await page.waitForURL("**/account");
    await openUserMenu(page, "Amelia");
    await expect(page.getByRole("menu")).toContainText(email);

    // Signed-in providers go from pricing straight to billing with the plan preselected.
    await page.goto("/pricing");
    await expect(page.locator('a[href="/account/billing?plan=pro&billing=yearly"]')).toBeVisible();
  });

  test("login, logout and wrong password", async ({ page }) => {
    const user = await sharedUser();

    // Wrong password → inline error, stays on /login.
    await page.goto("/login");
    await page.getByLabel("Email address").fill(user.email);
    await page.locator('input[name="password"]').fill("WrongPass123");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole("alert").filter({ hasText: /incorrect|invalid/i })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // Correct password → account; log out from a public page.
    await uiLogin(page, user.email, user.password);
    await page.goto("/directory");
    await openUserMenu(page, user.firstName);
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("banner").getByRole("link", { name: /log ?in|sign in/i }).first()).toBeVisible();

    // The session is really gone: /auth/me is unauthorised after a reload.
    await page.reload();
    await expect(page.getByRole("banner").getByRole("button", { name: new RegExp(user.firstName) })).toHaveCount(0);
  });

  test("forgot password → emailed code → reset → sign in with the new password", async ({ page }) => {
    const user = await createVerifiedUser("reset");
    const newPassword = "N3wRunway2026";

    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(user.email);
    const since = Date.now();
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText(/we've sent a 6-digit reset code/i)).toBeVisible();
    await page.getByRole("link", { name: /Enter reset code/ }).click();
    await page.waitForURL(/\/reset-password/);

    const code = await readCode(user.email, { subject: "reset", since, digits: 6 });
    await fillOtp(page, code);
    await page.getByLabel("New password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm new password").fill(newPassword);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/login\?reset=1/);
    await expect(page.getByText(/password has been updated/i)).toBeVisible();

    await uiLogin(page, user.email, newPassword);
  });
});
