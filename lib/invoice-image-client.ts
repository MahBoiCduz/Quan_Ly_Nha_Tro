// Browser-only rasteriser: turns the invoice PDF into PNG (or JPEG) blobs.
//
// pdfjs-dist is imported dynamically so it never lands in the initial page
// bundle, and this module must stay client-side — never import it from a server
// component, route handler or server action.

import type { InvoiceImageFormat } from "./invoice-image";
import { INVOICE_IMAGE_TARGET_WIDTH, INVOICE_MOBILE_TARGET_WIDTH, scaleForTargetWidth, trimmedImageHeight } from "./invoice-image";

export type RenderedInvoiceImage = {
  blob: Blob;
  /** 0-based index of the page this image was rendered from. */
  pageIndex: number;
  pageCount: number;
  width: number;
  height: number;
};

export type RenderInvoiceOptions = {
  /** Desired pixel width of the output (default ~200 DPI for A4). */
  targetWidth?: number;
  mimeType?: InvoiceImageFormat;
  /** JPEG quality (ignored for PNG). */
  quality?: number;
  trimBottom?: boolean;
};

/** Downloads the invoice PDF for a bill, keeping the current session cookie. */
export async function fetchInvoicePdf(billId: string, layout: "print" | "mobile" = "print"): Promise<ArrayBuffer> {
  const res = await fetch(`/hoa-don/${billId}/pdf${layout === "mobile" ? "?layout=mobile" : ""}`, { credentials: "same-origin" });
  if (res.status === 404) throw new Error("Không tìm thấy hoá đơn.");
  if (!res.ok) throw new Error(`Không tải được hoá đơn (mã ${res.status}).`);

  // When the session has expired the middleware redirects to /login, so a
  // successful-looking response can still be the login page.
  const contentType = res.headers.get("content-type") ?? "";
  if (res.redirected || !contentType.includes("application/pdf")) {
    throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
  }
  return res.arrayBuffer();
}

/**
 * Renders every page of the PDF to a canvas and encodes it.
 * Pages are rendered one at a time and cleaned up immediately to keep memory low.
 */
export async function renderInvoiceImages(
  pdfData: ArrayBuffer,
  options: RenderInvoiceOptions = {},
): Promise<RenderedInvoiceImage[]> {
  const targetWidth = options.targetWidth ?? INVOICE_IMAGE_TARGET_WIDTH;
  const mimeType: InvoiceImageFormat = options.mimeType ?? "image/png";
  const quality = options.quality ?? 0.92;

  const pdfjs = await import("pdfjs-dist");
  // Served from public/ (see scripts/sync-pdf-worker.mjs): bundling the worker
  // itself makes `next build` fail, so it stays a plain static asset.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfData) }).promise;
  const images: RenderedInvoiceImage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      // pdf.js viewports are in PDF points, so the scale comes from the page's
      // own width — that way the output is always `targetWidth` pixels wide.
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: scaleForTargetWidth(baseViewport.width, targetWidth) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Trình duyệt không hỗ trợ canvas 2D.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      await page.render({ canvasContext: context, viewport }).promise;
      let output = canvas;
      if (options.trimBottom) {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const height = trimmedImageHeight(pixels, canvas.width, canvas.height, Math.ceil(targetWidth / 18));
        if (height < canvas.height) {
          output = document.createElement("canvas");
          output.width = canvas.width; output.height = height;
          const cropped = output.getContext("2d");
          if (!cropped) throw new Error("Trình duyệt không hỗ trợ canvas 2D.");
          cropped.drawImage(canvas, 0, 0);
        }
      }
      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, mimeType, quality),
      );
      page.cleanup();

      if (!blob) throw new Error("Không tạo được ảnh hoá đơn.");
      images.push({
        blob,
        pageIndex: pageNumber - 1,
        pageCount: pdf.numPages,
        width: output.width,
        height: output.height,
      });
      canvas.width = 0; canvas.height = 0;
      if (output !== canvas) { output.width = 0; output.height = 0; }
    }
  } finally {
    await pdf.destroy();
  }

  return images;
}

/** Shared mobile PNG layout for both single downloads and batch exports. */
export async function renderMobileInvoiceImages(billId: string) {
  return renderInvoiceImages(await fetchInvoicePdf(billId, "mobile"), { targetWidth: INVOICE_MOBILE_TARGET_WIDTH, trimBottom: true });
}

/** Triggers a browser download for an already-generated blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
