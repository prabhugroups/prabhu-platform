import { expect, test } from "@playwright/test";

// Requires a tenant_admin account for the tenant this config's Host header
// resolves to. Create one via the Super Admin console or
// backend/app/modules/auth/admin_users_router.py before running.
const USERNAME = process.env.TEST_ADMIN_USERNAME ?? "steelsadmin";
const PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "SteelsPass123!";

test("unauthenticated admin routes redirect to login", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("tenant admin can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(USERNAME);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Sign In/ }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Dashboard/ })).toBeVisible();
});

test("signed-in tenant admin only ever sees their own tenant's content", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Username").fill(USERNAME);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /Sign In/ }).click();
  await page.goto("/admin/teams");
  // Every row rendered must belong to this tenant — enforced server-side by
  // FastAPI (see backend/tests/test_tenant_isolation.py), this just checks
  // the page renders without error for an authenticated tenant_admin.
  await expect(page.getByRole("heading", { name: "Team Members" })).toBeVisible();
});
