import { expect, test } from "@playwright/test";
import { adminCredentials } from "./helpers";

/** The admin console is its own app (../admin-frontend), served next to the site. */
const ADMIN_URL = (process.env.E2E_ADMIN_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3200").replace(/\/+$/, "");

test("admin signs in and the console loads", async ({ page, request }) => {
  const reachable = await request
    .get(`${ADMIN_URL}/login`, { timeout: 60_000 })
    .then((r) => r.ok())
    .catch(() => false);
  test.skip(!reachable, `Admin console not running at ${ADMIN_URL} (set E2E_ADMIN_URL)`);

  const { email, password } = adminCredentials();
  await page.goto(`${ADMIN_URL}/login?next=/admin`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(`${ADMIN_URL}/admin`);
  await expect(page.getByRole("navigation", { name: "Admin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access denied" })).toHaveCount(0);
});
