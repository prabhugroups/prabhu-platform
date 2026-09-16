import { expect, test } from "@playwright/test";
import { UNKNOWN_HOST } from "../playwright.config";

test("home page renders with the resolved tenant's branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Prabhu Steels/);
  await expect(page.locator("header")).toContainText("Prabhu Steels");
  // theme color is injected as a CSS custom property by (site)/layout.tsx
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),
  );
  expect(primary).toMatch(/^#/);
});

test("an unknown domain is redirected to the tenant-not-found page", async ({ page }) => {
  await page.goto(`http://${UNKNOWN_HOST}:${process.env.DEV_PORT ?? "3010"}/`);
  await expect(page.getByText("Site not found")).toBeVisible();
});

test("contact form submits successfully", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("Name *").fill("Playwright Smoke Test");
  await page.getByLabel("Email").fill("smoke-test@example.com");
  await page.getByLabel("Message").fill("Automated smoke test submission.");
  await page.getByRole("button", { name: /Send Message/ }).click();
  await expect(page.getByText(/Thank you/)).toBeVisible();
});

test("faqs page renders without error", async ({ page }) => {
  const response = await page.goto("/faqs");
  expect(response?.status()).toBe(200);
});
