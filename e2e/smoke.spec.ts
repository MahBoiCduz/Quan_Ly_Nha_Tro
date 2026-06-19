import { test, expect } from "@playwright/test";

test("unauthenticated visit redirects to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Quản Lý Nhà Trọ")).toBeVisible();
});
