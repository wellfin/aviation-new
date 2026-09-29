import { expect, test } from "@playwright/test";

test.describe("public browsing", () => {
  test("home → directory filter, sort, paginate → provider profile tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Seeded sections render from the API.
    await expect(page.locator('a[href^="/airports/"]').first()).toBeVisible();

    await page.goto("/directory");
    await expect(page.getByRole("heading", { level: 1, name: "Aviation Services Directory" })).toBeVisible();
    const showing = page.getByText(/^Showing \d+ providers?/);
    await expect(showing).toBeVisible();

    // Category filter (pill link) narrows the list and is reflected in the URL.
    await page.getByRole("navigation", { name: "Service categories" }).getByRole("link", { name: "FBO", exact: true }).click();
    await expect(page).toHaveURL(/category=fbo/);
    await expect(page.getByText(/in FBO/)).toBeVisible();
    const fboCards = page.locator("h3 a[href^='/providers/']");
    await expect(fboCards.first()).toBeVisible();

    // Sort by name: the first two cards within the same tier are alphabetical.
    await page.getByLabel("Sort providers").selectOption("name");
    await expect(page).toHaveURL(/sort=name/);

    // Pagination across the full list (24 seeded providers, 9 per page).
    await page.goto("/directory");
    const pager = page.getByRole("navigation", { name: "Pagination" });
    const firstPageNames = await page.locator("h3 a[href^='/providers/']").allTextContents();
    await pager.getByRole("link", { name: "2", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pager.getByRole("link", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
    const secondPageNames = await page.locator("h3 a[href^='/providers/']").allTextContents();
    expect(secondPageNames.length).toBeGreaterThan(0);
    expect(secondPageNames.some((n) => firstPageNames.includes(n))).toBe(false);

    // Search with no matches shows the empty state.
    await page.goto("/directory?q=zzzz-no-such-provider");
    await expect(page.getByText(/couldn't find any providers/i)).toBeVisible();

    // Provider profile + tabs.
    await page.goto("/providers/tag-aviation");
    await expect(page.getByRole("heading", { level: 1, name: /TAG Aviation/ })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Profile sections" });
    await tabs.getByRole("link", { name: /Aircraft Fleet/ }).click();
    await expect(page).toHaveURL(/tab=fleet/);
    await expect(page.getByRole("heading", { name: "Aircraft Fleet" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Enquire Now/ }).first()).toBeVisible();
    await tabs.getByRole("link", { name: /Reviews/ }).click();
    await expect(page).toHaveURL(/tab=reviews/);
    await expect(page.getByRole("heading", { name: "WHAT OUR CLIENTS SAY" })).toBeVisible();
    await tabs.getByRole("link", { name: /About/ }).click();
    await expect(page).toHaveURL(/\/providers\/tag-aviation$/);

    // Pricing CTAs carry the chosen plan into signup for visitors.
    await page.goto("/pricing");
    await expect(page.locator('a[href="/signup?type=provider&plan=pro&billing=yearly"]')).toBeVisible();

    // Unknown provider → 404 page.
    const res = await page.goto("/providers/no-such-provider-e2e");
    expect(res?.status()).toBe(404);
  });

  test("airport search → airport page tabs", async ({ page }) => {
    await page.goto("/airports");
    await page.getByLabel("Search airports").fill("heathrow");
    await page.getByLabel("Search airports").press("Enter");
    await expect(page).toHaveURL(/q=heathrow/);
    await page.locator('a[href="/airports/egll"]').first().click();
    await expect(page).toHaveURL(/\/airports\/egll/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Heathrow/i);

    const tabs = page.getByRole("navigation", { name: "Airport details" });
    await tabs.getByRole("link", { name: "Runways" }).click();
    await expect(page).toHaveURL(/tab=runways/);
    await expect(tabs.getByRole("link", { name: "Runways" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/09L\/27R|27R|09L/).first()).toBeVisible();

    await tabs.getByRole("link", { name: "Airport Communication" }).click();
    await expect(page).toHaveURL(/tab=communication/);
    await expect(tabs.getByRole("link", { name: "Airport Communication" })).toHaveAttribute("aria-current", "page");

    await tabs.getByRole("link", { name: "Nearby Airport" }).click();
    await expect(page).toHaveURL(/tab=nearby/);
    await expect(page.locator('a[href^="/airports/eg"]').filter({ hasNotText: "Heathrow" }).first()).toBeVisible();

    const res = await page.goto("/airports/zzzz");
    expect(res?.status()).toBe(404);
  });

  test("tools: weather, NOTAMs and distance", async ({ page }) => {
    await page.goto("/tools/weather?icao=EGLL");
    await expect(page.getByText(/METAR/).first()).toBeVisible();
    await expect(page.getByText(/EGLL/).first()).toBeVisible();

    await page.goto("/tools/notams?icao=KJFK");
    await expect(page.getByText(/NOTAM/i).first()).toBeVisible();
    await expect(page.getByText(/KJFK/).first()).toBeVisible();

    await page.goto("/tools/distance?from=EGLL&to=KJFK");
    // Great-circle EGLL–KJFK is ~2,990 NM / ~5,540 km.
    await expect(page.getByText(/5,5\d\d|2,99\d|2,98\d/).first()).toBeVisible();
  });
});
