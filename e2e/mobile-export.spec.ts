import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { unzipSync } from "fflate";

test("batch ZIP uses phone PNG layout and remains readable at 360px", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(process.env.SEED_ADMIN_EMAIL ?? "admin@nhatro.local");
  await page.getByPlaceholder("Mật khẩu").fill(process.env.SEED_ADMIN_PASSWORD ?? "doimatkhau");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/hoa-don");
  const boxes = page.getByRole("checkbox", { name: /Chọn hoá đơn/ });
  await boxes.nth(0).check(); await boxes.nth(1).check();
  await page.getByRole("button", { name: "Xuất ảnh (2)", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Tải ZIP (2 ảnh)", exact: true }).click();
  const download = await downloading;
  await download.saveAs("test-results/mobile-batch.zip");
  const images = Object.values(unzipSync(readFileSync("test-results/mobile-batch.zip")));
  expect(images).toHaveLength(2);
  for (const image of images) expect(Buffer.from(image).readUInt32BE(16)).toBe(1080);
  const png = Buffer.from(images[0]);
  writeFileSync("test-results/mobile-batch-sample.png", png);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.setContent(`<body style="margin:0"><img alt="Hóa đơn PNG trên điện thoại" style="display:block;width:360px" src="data:image/png;base64,${png.toString("base64")}"></body>`);
  await expect(page.getByRole("img")).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-png-360.png", fullPage: true });
});
