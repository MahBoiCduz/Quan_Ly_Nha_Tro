// Client-only orchestration for the batch invoice export.
//
// Rendering happens in the browser (see lib/invoice-image-client.ts), so the
// batch either writes the PNGs straight into a folder the user picked (File
// System Access API) or bundles them into one ZIP (fflate, store-only because
// PNGs are already compressed).

import {
  buildBatchInvoiceFilename,
  uniqueFileName,
  zipFileName,
  type BatchBill,
} from "./invoice-batch";
import { downloadBlob, fetchInvoicePdf, renderInvoiceImages } from "./invoice-image-client";

export type BatchExportMode = "zip" | "folder";

export type BatchExportProgress = {
  /** Bills finished so far. */
  done: number;
  total: number;
  /** Room currently being rendered. */
  current: string;
};

export type BatchExportFailure = { label: string; message: string };

export type BatchExportResult = {
  /** File names written (or added to the ZIP). */
  exported: string[];
  failures: BatchExportFailure[];
  cancelled: boolean;
};

export type BatchExportOptions = {
  bills: BatchBill[];
  mode: BatchExportMode;
  /** Required for folder mode — the directory already picked by the user. */
  directory?: FileSystemDirectoryHandle | null;
  onProgress?: (progress: BatchExportProgress) => void;
  /** Polled between bills so a long export can be cancelled. */
  shouldCancel?: () => boolean;
};

/** Edge/Chrome only; Firefox and Safari have no directory picker. */
export function supportsFolderExport(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/**
 * Opens the directory picker. MUST be called straight from a click handler:
 * the browser only allows it while the page still has transient user activation.
 * Returns null when the browser has no picker or the user cancels.
 */
export async function pickExportDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsFolderExport()) return null;
  try {
    return (await window.showDirectoryPicker?.({ id: "hoa-don-anh", mode: "readwrite" })) ?? null;
  } catch {
    return null;
  }
}

async function writeBlobToDirectory(
  directory: FileSystemDirectoryHandle,
  name: string,
  blob: Blob,
): Promise<void> {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export async function exportInvoiceBatch(options: BatchExportOptions): Promise<BatchExportResult> {
  const { bills, mode, directory, onProgress, shouldCancel } = options;
  const taken = new Set<string>();
  const exported: string[] = [];
  const failures: BatchExportFailure[] = [];
  const zipEntries: Record<string, Uint8Array> = {};
  const periodLabels: string[] = [];
  let cancelled = false;

  onProgress?.({ done: 0, total: bills.length, current: bills[0]?.unitName ?? "" });

  for (let index = 0; index < bills.length; index++) {
    if (shouldCancel?.()) {
      cancelled = true;
      break;
    }

    const bill = bills[index];
    onProgress?.({ done: index, total: bills.length, current: bill.unitName });

    try {
      if (mode === "folder" && !directory) throw new Error("Chưa chọn thư mục lưu ảnh.");
      const pdf = await fetchInvoicePdf(bill.id);
      const images = await renderInvoiceImages(pdf);

      for (const image of images) {
        const name = uniqueFileName(
          buildBatchInvoiceFilename(
            bill.unitName,
            bill.periodLabel,
            bill.type,
            image.pageIndex,
            image.pageCount,
          ),
          taken,
        );
        taken.add(name);

        if (mode === "folder") {
          // Written (and released) one at a time, so memory stays flat.
          await writeBlobToDirectory(directory as FileSystemDirectoryHandle, name, image.blob);
        } else {
          zipEntries[name] = new Uint8Array(await image.blob.arrayBuffer());
        }
        exported.push(name);
      }

      periodLabels.push(bill.periodLabel);
    } catch (error) {
      // One broken bill (expired session, corrupt PDF) must not kill the batch.
      failures.push({
        label: `${bill.unitName} · ${bill.periodLabel}`,
        message: messageOf(error),
      });
    }
  }

  if (mode === "zip" && exported.length > 0) {
    const { zipSync } = await import("fflate");
    const zipped = zipSync(zipEntries, { level: 0 });
    downloadBlob(new Blob([zipped], { type: "application/zip" }), zipFileName(periodLabels, exported.length));
  }

  onProgress?.({ done: bills.length, total: bills.length, current: "" });
  return { exported, failures, cancelled };
}
