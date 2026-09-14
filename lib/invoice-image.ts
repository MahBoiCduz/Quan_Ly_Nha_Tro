// Pure helpers for the "export invoice as an image" feature.
//
// The PNG itself is produced in the browser from the existing invoice PDF (see
// lib/invoice-image-client.ts), so everything here is dependency-free and
// unit-tested: how big the image is and what the downloaded file is called.

/**
 * Target width in pixels for the exported image. An A4 page is 595.28 pt wide,
 * so this renders at ~200 DPI (1654×2339 px) — sharp on a phone, still small
 * enough to send over Zalo.
 */
export const INVOICE_IMAGE_TARGET_WIDTH = 1654;

/** Formats the browser pipeline can encode. The UI currently exposes PNG only. */
export type InvoiceImageFormat = "image/png" | "image/jpeg";

/**
 * pdf.js viewports are measured in PDF points (1/72 inch), so a fixed "scale"
 * is not a fixed resolution. This converts a desired pixel width into the scale
 * factor for a page of `pageWidth` points.
 */
export function scaleForTargetWidth(
  pageWidth: number,
  targetWidth: number = INVOICE_IMAGE_TARGET_WIDTH,
): number {
  if (!Number.isFinite(pageWidth) || pageWidth <= 0) return 1;
  return targetWidth / pageWidth;
}

/**
 * Turns arbitrary text into a safe ASCII filename part:
 * strips Vietnamese diacritics ("Phòng 201" → "Phong-201"), collapses every run
 * of unsupported characters into a single dash and trims stray dashes.
 */
export function sanitizeFilenamePart(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining marks left over from NFD
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D") // NFD does not decompose đ/Đ
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * `hoa-don-Phong-201-Thang-9-2026.png`.
 * A page suffix is added only when the PDF really has more than one page.
 */
export function buildInvoicePngFilename(
  unitName: string,
  periodLabel: string,
  pageIndex = 0,
  pageCount = 1,
): string {
  const parts = [sanitizeFilenamePart(unitName), sanitizeFilenamePart(periodLabel)].filter(Boolean);
  const base = ["hoa-don", ...parts].join("-");
  const pageSuffix = pageCount > 1 ? `-trang-${pageIndex + 1}` : "";
  return `${base}${pageSuffix}.png`;
}
