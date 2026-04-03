import { expect, test } from "@playwright/test";

const loginHeading = "Sign in to your Accelerate Global workspace";
const loginIntro =
  "Use the same email address you were invited with or your existing account. We will send a one-time sign-in link so you can continue into your workspace.";

test("renders the finalized login page on desktop", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();
  await expect(page.getByText(loginIntro)).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send secure link" })
  ).toBeVisible();
  await expect(page.getByText("Invite-only access").first()).toBeVisible();
  await expect(page.getByText("Magic link sign-in")).toHaveCount(0);
  await expect(
    page.getByText(
      "Use the same email address connected to your invite or authorized account record."
    )
  ).toHaveCount(0);
});

test("keeps the login experience usable on mobile", async ({ page }) => {
  await page.setViewportSize({
    height: 844,
    width: 390,
  });

  await page.goto("/login");

  await expect(page.getByRole("heading", { name: loginHeading })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send secure link" })
  ).toBeVisible();
  await expect(
    page.getByText(
      "Only invited or already authorized collaborators can receive a secure sign-in link."
    )
  ).toBeVisible();
  await expect(
    page.getByText(
      "No password required. The email tied to your account receives a one-time link."
    )
  ).toBeVisible();
});

test("submits a seeded email and lands on the success state", async ({
  page,
}) => {
  await page.route("**/login", async (route, request) => {
    if (request.method() === "POST") {
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }

    await route.continue();
  });

  await page.goto("/login");
  await page.getByLabel("Email address").fill("owner-a@accelerate.test");
  await page.getByRole("button", { name: "Send secure link" }).click();

  await expect(
    page.getByRole("button", { name: "Sending secure link..." })
  ).toBeDisabled();
  await expect(
    page.getByRole("status").filter({
      hasText: "Checking your account and preparing a secure sign-in link.",
    })
  ).toBeVisible();
  await page.waitForURL("**/login?status=sent");
  await expect(page.getByText("Check your email")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Use a different email" })
  ).toBeVisible();
});

test("shows the useful error state from redirect params", async ({ page }) => {
  await page.goto("/login?status=error");

  await expect(page.getByText("We couldn’t start sign-in")).toBeVisible();
  await expect(
    page.getByText(
      "Confirm the email address and try again. If access was recently granted, wait a moment and retry or contact the Accelerate team member who invited you."
    )
  ).toBeVisible();
});
