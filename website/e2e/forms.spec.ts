import { expect, test } from "@playwright/test";
import { adminApi, readCode, readLink, sharedUser, uiLogin, uniqueEmail } from "./helpers";

interface Paged<T> {
  items: T[];
}

test.describe("public forms", () => {
  test("enquiry to a Pro provider is delivered", async ({ page }) => {
    const email = uniqueEmail("enquiry");
    await page.goto("/providers/execujet");
    const form = page.locator("section", { has: page.getByRole("heading", { name: "Send Enquiry" }) });

    // Client-side validation first.
    await form.getByRole("button", { name: "Send Enquiry" }).click();
    await expect(form.getByText("Please enter at least 2 characters")).toBeVisible();

    await form.getByLabel("Your name").fill("Enquiry Tester");
    await form.getByLabel("Phone number").fill("20 7946 0000");
    await form.getByLabel("Service").selectOption({ index: 1 });
    await form.getByLabel("Message or requirements").fill("Arriving OMDB next Tuesday with a G650, need handling and fuel.");

    // Personal mailboxes are refused before any code is sent.
    await form.locator("#enq-email").fill("someone@gmail.com");
    await form.getByRole("button", { name: "Send OTP" }).click();
    await expect(form.getByText(/use your work email/i)).toBeVisible();

    // A work address must be verified with the emailed code before the enquiry is accepted.
    await form.locator("#enq-email").fill(email);
    await form.getByRole("button", { name: "Send Enquiry" }).click();
    await expect(form.getByText(/verify your email address/i).first()).toBeVisible();

    const since = Date.now();
    await form.getByRole("button", { name: "Send OTP" }).click();
    await expect(form.getByText(`We sent a 4-digit code to ${email}`)).toBeVisible();
    const code = await readCode(email, { subject: "Confirm", since, digits: 4 });
    await form.getByLabel("Digit 1", { exact: true }).click();
    await page.keyboard.type(code);
    await form.getByRole("button", { name: "Verify" }).click();
    await expect(form.getByText("✓ Verified")).toBeVisible();

    await form.getByRole("button", { name: "Send Enquiry" }).click();
    await expect(form.getByRole("status").filter({ hasText: "your enquiry has been sent to ExecuJet" })).toBeVisible();

    // The provider's inbox (via the admin API) has it.
    const admin = await adminApi();
    const list = await admin.ok<Paged<{ email: string; status: string }>>("GET", `/admin/enquiries?provider=execujet&q=${encodeURIComponent(email)}`);
    expect(list.items.map((e) => e.email)).toContain(email);
  });

  test("review: submit → pending → approved by admin → shown on the profile", async ({ page }) => {
    const user = await sharedUser();
    const slug = "gate-gourmet";
    const title = `E2E review ${Date.now().toString(36)}`;

    await uiLogin(page, user.email, user.password, `/providers/${slug}?tab=reviews`);
    await page.getByRole("button", { name: "Share Your Experience" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Too-short review is rejected client-side with the API's rules.
    await dialog.getByLabel("Review Title *").fill(title);
    await dialog.getByLabel("Your Review *").fill("Too short");
    await dialog.getByRole("button", { name: "Submit Review" }).click();
    await expect(dialog.getByText("Please choose a rating")).toBeVisible();
    await expect(dialog.getByText("Please write at least 20 characters")).toBeVisible();

    await dialog.getByRole("radio", { name: /4 stars/ }).check({ force: true });
    await dialog.getByLabel("Your Review *").fill("Fresh, well-presented catering delivered right on time to the aircraft.");
    await dialog.getByLabel("Your Role").fill("Flight Attendant");
    await dialog.getByRole("button", { name: "Submit Review" }).click();
    await expect(dialog.getByRole("status")).toContainText("will appear once our team has checked it");

    // Pending in moderation; approve it as the dev admin.
    const admin = await adminApi();
    const pending = await admin.ok<Paged<{ id: string; title: string; status: string }>>(
      "GET",
      `/admin/reviews?status=pending&provider=${slug}&q=${encodeURIComponent(title)}`,
    );
    const review = pending.items.find((r) => r.title === title);
    expect(review?.status).toBe("pending");
    await admin.ok("POST", `/admin/reviews/${review!.id}/approve`);

    // A second review for the same provider is refused (409).
    await page.goto(`/providers/${slug}?tab=reviews`);
    await expect(page.getByText(title)).toBeVisible();
    await page.getByRole("button", { name: "Share Your Experience" }).click();
    await dialog.getByRole("radio", { name: /5 stars/ }).check({ force: true });
    await dialog.getByLabel("Review Title *").fill("Second opinion");
    await dialog.getByLabel("Your Review *").fill("Trying to review the same provider twice should fail.");
    await dialog.getByRole("button", { name: "Submit Review" }).click();
    await expect(dialog.getByRole("alert")).toContainText("already reviewed");
  });

  test("contact form with email OTP", async ({ page }) => {
    const email = uniqueEmail("contact");
    await page.goto("/contact");
    await page.getByLabel("First name").fill("Contact");
    await page.getByLabel("Last name").fill("Tester");

    // Sending without verifying is blocked.
    await page.locator("#contact-email").fill(email);
    await page.getByLabel("Your message").fill("Please tell me more about Pro listings for our FBO.");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText(/verify your email address/i).first()).toBeVisible();

    const since = Date.now();
    await page.getByRole("button", { name: "Send OTP" }).click();
    await expect(page.getByText(`We sent a 4-digit code to ${email}`)).toBeVisible();
    const code = await readCode(email, { subject: "Confirm", since, digits: 4 });
    await page.getByLabel("Digit 1", { exact: true }).click();
    await page.keyboard.type(code);
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("✓ Verified")).toBeVisible();

    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thanks for getting in touch" })).toBeVisible();

    const admin = await adminApi();
    const leads = await admin.ok<Paged<{ email: string }>>("GET", `/admin/leads?type=contact&q=${encodeURIComponent(email)}`);
    expect(leads.items.map((l) => l.email)).toContain(email);
  });

  test("newsletter subscribe → confirm link → confirmation banner", async ({ page }) => {
    const email = uniqueEmail("news");
    await page.goto("/");
    const since = Date.now();
    await page.locator("#newsletter-email").fill(email);
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByRole("status").filter({ hasText: /check your inbox/i })).toBeVisible();

    const link = await readLink(email, { subject: "Confirm", since });
    await page.goto(link);
    await expect(page).toHaveURL(/\/\?newsletter=confirmed/);
    await expect(page.getByTestId("newsletter-result")).toContainText("Subscription confirmed");

    // A tampered token lands on the "invalid" banner.
    await page.goto("/?newsletter=invalid");
    await expect(page.getByTestId("newsletter-result")).toContainText("didn't work");
  });
});
