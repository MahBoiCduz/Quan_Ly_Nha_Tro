import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
test("cross-year periods, partial/full payment, duplicate prevention, PDF and mobile view", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local");
  await page.getByPlaceholder("Mật khẩu").fill(process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/hoa-don/new");
  await page.locator('select[name="unitId"]').selectOption({ label: "Phòng 202" });
  await expect(page.getByRole("spinbutton", { name: "Năm ghi nhận" })).toBeVisible();
  const year = page.getByRole("spinbutton", { name: "Năm ghi nhận" });
  await year.fill("2031");
  for (const label of ["Tiền phòng", "Điện/nước"]) {
    await page.getByRole("button", { name: `${label} tháng 11/2031`, exact: true }).click();
    await page.getByRole("button", { name: `${label} tháng 12/2031`, exact: true }).click();
  }
  await year.fill("2032");
  for (const label of ["Tiền phòng", "Điện/nước"]) await page.getByRole("button", { name: `${label} tháng 1/2032`, exact: true }).click();
  await expect(page.locator('input[name="roomMonths"]')).toHaveValue('["2031-11","2031-12","2032-01"]');
  await page.locator('input[name="dueDate"]').fill("2032-01-05");
  for (const [name, value] of [["electricityOld", "0"], ["electricityNew", "10"], ["waterOld", "0"], ["waterNew", "1"]]) await page.locator(`input[name="${name}"]`).fill(value);
  const total = Number((await page.getByTestId("bill-total").innerText()).replace(/\D/g, ""));
  await page.screenshot({ path: "test-results/tracking-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Tạo hóa đơn", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Phòng 202/ })).toBeVisible();
  const billUrl = page.url();
  const mobilePdf = await page.request.get(`${billUrl}/pdf?layout=mobile`);
  expect(mobilePdf.ok()).toBe(true);
  const mobileBuffer = await mobilePdf.body();
  writeFileSync("test-results/tracking-mobile.pdf", mobileBuffer);
  const pdf = await page.request.get(`${billUrl}/pdf`);
  expect(pdf.ok()).toBe(true);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.getByRole("button", { name: "Xuất hoá đơn" }).click();
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Ảnh PNG (điện thoại)" }).click();
  const download = await pngDownload;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  await download.saveAs("test-results/tracking-invoice.png");
  const png = readFileSync("test-results/tracking-invoice.png");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.readUInt32BE(20)).toBeGreaterThan(2000);
  await page.locator('input[name="amount"]').fill(String(Math.floor(total / 2)));
  await page.locator('input[name="paidAt"]').fill("2031-11-01");
  await page.getByRole("button", { name: "Lưu thanh toán" }).click();
  await expect(page.getByText("Đã ghi nhận thanh toán", { exact: true })).toBeVisible();
  await page.goto("/tracking-thanh-toan");
  await page.getByRole("spinbutton", { name: "Năm tracking" }).fill("2031");
  await expect(page.getByRole("button", { name: "Phòng 202, 2031-11, tiền phòng: Đang trả", exact: true })).toBeVisible();
  await page.goto("/hoa-don/new");
  await page.locator('select[name="unitId"]').selectOption({ label: "Phòng 202" });
  await page.getByRole("spinbutton", { name: "Năm ghi nhận" }).fill("2031");
  await expect(page.getByRole("button", { name: "Tiền phòng tháng 11/2031", exact: true })).toHaveCount(0);
  await page.goto(billUrl);
  await page.getByRole("button", { name: /Điền số còn thiếu/ }).click();
  await page.locator('input[name="paidAt"]').fill("2031-11-02");
  await page.getByRole("button", { name: "Lưu thanh toán" }).click();
  await expect(page.getByText("Đã thu", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/tracking-mobile.png", fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/tracking-thanh-toan");
  await page.getByRole("spinbutton", { name: "Năm tracking" }).fill("2032");
  await expect(page.getByRole("button", { name: "Phòng 202, 2032-01, tiền phòng: Đã đóng", exact: true })).toBeVisible();
  await page.goto("/hoa-don/new");
  await page.locator('select[name="unitId"]').selectOption({ label: "Phòng 202" });
  await page.getByRole("spinbutton", { name: "Năm ghi nhận" }).fill("2031");
  await expect(page.getByRole("button", { name: "Tiền phòng tháng 11/2031", exact: true })).toHaveCount(0);
});

test("form fits desktop, tablet and phone without page overflow", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local");
  await page.getByPlaceholder("Mật khẩu").fill(process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/hoa-don/new");
  await page.locator('select[name="unitId"]').selectOption({ label: "Phòng 202" });
  await expect(page.getByRole("spinbutton", { name: "Năm ghi nhận" })).toBeVisible();
  for (const width of [1280, 768, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/tracking-form-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `viewport ${width}px`).toBe(true);
  }
});

test("legacy tracking assignment keeps money and validates non-consecutive utilities", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local");
  await page.getByPlaceholder("Mật khẩu").fill(process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/tracking-thanh-toan");
  await page.getByRole("button", { name: /Có .*hóa đơn cần gán kỳ tracking/ }).click();
  const candidates = await page.getByRole("link", { name: /Phòng \d+ ·/ }).evaluateAll(links => links.map(link => link.getAttribute("href") ?? ""));
  let foundCombined = false;
  for (const href of candidates) {
    await page.goto(href);
    const detail = await page.locator("table").textContent();
    if (detail?.includes("Tiền điện") && detail.includes("Tổng tiền nhà")) { foundCombined = true; break; }
  }
  expect(foundCombined).toBe(true);
  const totalBefore = await page.getByText("Tổng thanh toán", { exact: true }).locator("..").innerText();
  await page.getByRole("button", { name: "Gán / sửa kỳ tracking" }).click();
  const year = page.getByRole("spinbutton", { name: "Năm ghi nhận" });
  await year.fill("2035");
  await page.getByRole("button", { name: "Tiền phòng tháng 10/2035", exact: true }).click();
  await page.getByRole("button", { name: "Điện/nước tháng 10/2035", exact: true }).click();
  await page.getByRole("button", { name: "Điện/nước tháng 12/2035", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận kỳ tracking" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Kỳ điện/nước phải liên tiếp" })).toBeVisible();
  await page.getByRole("button", { name: "Điện/nước tháng 12/2035", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận kỳ tracking" }).click();
  await expect(page.getByText("Kỳ tracking đã được gán", { exact: true })).toBeVisible();
  expect(await page.getByText("Tổng thanh toán", { exact: true }).locator("..").innerText()).toBe(totalBefore);
});
