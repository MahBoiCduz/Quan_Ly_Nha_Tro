import { test, expect } from "@playwright/test";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local";
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau";

async function login(page) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Mật khẩu").fill(PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL("http://localhost:3000/");
}

test("admin can add a tenant, lease a room, bill it, and record a payment", async ({ page }) => {
  await login(page);

  // Create a tenant — redirects to /khach-thue list after save
  await page.goto("/khach-thue/new");
  await page.getByPlaceholder("Họ tên").fill("E2E Khách");
  await page.getByPlaceholder("Số điện thoại").fill("0900000000");
  await page.getByRole("button", { name: "Lưu" }).click();
  await expect(page).toHaveURL("http://localhost:3000/khach-thue");
  await expect(page.getByText("E2E Khách").first()).toBeVisible();

  // Assign a lease on Phòng 101
  await page.goto("/phong");
  await page.getByText("Phòng 101").click();
  await page.locator('select[name="tenantId"]').selectOption({ label: "E2E Khách" });
  await page.locator('input[name="startDate"]').fill("2026-06-01");
  await page.locator('input[name="agreedRent"]').fill("4800000");
  await page.locator('input[name="depositAmount"]').fill("4800000");
  await page.getByRole("button", { name: "Tạo hợp đồng" }).click();
  // Wait for server action + revalidation, then reload to confirm active lease
  await page.waitForTimeout(1500);
  await page.reload();
  // Active lease panel shows "Kết thúc hợp đồng" (end lease) instead of the create form
  await expect(page.getByText("Kết thúc hợp đồng")).toBeVisible();

  // Generate a bill — /hoa-don/new only lists occupied rooms
  await page.goto("/hoa-don/new");
  await page.locator('select[name="unitId"]').selectOption({ label: "Phòng 101" });
  await page.getByPlaceholder("Kì thanh toán (vd: Tháng 6/2026)").fill("Tháng 6/2026");
  await page.locator('input[name="dueDate"]').fill("2026-06-05");
  await page.getByRole("button", { name: "Tạo hóa đơn" }).click();
  // Redirects to /hoa-don/[id] — bill detail page with PaymentPanel

  // Record a full payment
  await page.locator('input[name="amount"]').fill("4800000");
  await page.locator('input[name="paidAt"]').fill("2026-06-03");
  await page.getByRole("button", { name: "Lưu thanh toán" }).click();
  // After payment, bill status becomes "Đã thu"
  await expect(page.getByText("Đã thu")).toBeVisible();

  // It appears in the ledger
  await page.goto("/so-sach");
  await expect(page.getByText("Phòng 101 - Tháng 6/2026")).toBeVisible();
});
