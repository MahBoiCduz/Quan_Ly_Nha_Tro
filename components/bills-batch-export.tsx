"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, FolderDown, Loader2, X } from "lucide-react";
import { useToast } from "@/components/toast";
import type { BatchBill } from "@/lib/invoice-batch";
import {
  exportInvoiceBatch,
  pickExportDirectory,
  supportsFolderExport,
  type BatchExportProgress,
} from "@/lib/invoice-batch-client";

/**
 * Toolbar for the batch invoice export: shows how many bills are ticked and
 * exports all of them either as one ZIP or straight into a picked folder.
 */
export function BillsBatchExport({
  bills,
  onClearSelection,
}: {
  bills: BatchBill[];
  onClearSelection: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<BatchExportProgress | null>(null);
  const [folderSupported, setFolderSupported] = useState(false);
  const cancelRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const busy = progress !== null;
  const total = bills.length;

  useEffect(() => {
    setFolderSupported(supportsFolderExport());
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function run(mode: "zip" | "folder") {
    setOpen(false);
    if (total === 0 || busy) return;

    // The directory picker needs the user's click, so it is opened before any
    // rendering starts.
    let directory: FileSystemDirectoryHandle | null = null;
    if (mode === "folder") {
      directory = await pickExportDirectory();
      if (!directory) return;
    }

    cancelRef.current = false;
    setProgress({ done: 0, total, current: bills[0]?.unitName ?? "" });
    try {
      const result = await exportInvoiceBatch({
        bills,
        mode,
        directory,
        onProgress: setProgress,
        shouldCancel: () => cancelRef.current,
      });

      const where = mode === "folder" ? " vào thư mục đã chọn" : "";
      if (result.cancelled) {
        toast.error(`Đã huỷ — đã xuất ${result.exported.length}/${total} ảnh`);
      } else if (result.failures.length === 0) {
        toast.success(`Đã xuất ${result.exported.length} ảnh${where}`);
      } else {
        toast.error(
          `Đã xuất ${result.exported.length}/${total} ảnh — lỗi: ${result.failures
            .map((failure) => failure.label)
            .join(", ")}`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xuất được ảnh hoá đơn.");
    } finally {
      setProgress(null);
      cancelRef.current = false;
    }
  }

  if (busy) {
    const percent = Math.round((progress.done / Math.max(1, progress.total)) * 100);
    return (
      <div className="flex w-full items-center gap-3 sm:w-auto" aria-live="polite">
        <Loader2 size={16} className="shrink-0 animate-spin text-brand" />
        <span className="shrink-0 text-sm text-ink">
          Đang xuất {Math.min(progress.done + 1, progress.total)}/{progress.total}
          {progress.current ? ` · ${progress.current}` : ""}
        </span>
        <span className="h-1.5 min-w-[80px] flex-1 overflow-hidden rounded-full bg-cream">
          <span
            className="block h-full rounded-full bg-brand transition-all"
            style={{ width: `${percent}%` }}
          />
        </span>
        <button
          type="button"
          onClick={() => {
            cancelRef.current = true;
          }}
          className="btn-secondary shrink-0"
        >
          <X size={16} /> Huỷ
        </button>
      </div>
    );
  }

  if (total === 0) {
    return <span className="text-sm text-muted">Chọn hoá đơn để xuất ảnh hàng loạt.</span>;
  }

  return (
    <div className="flex w-full items-center gap-3 sm:w-auto">
      <span className="text-sm text-ink">
        Đã chọn <strong>{total}</strong>
      </span>
      <button type="button" onClick={onClearSelection} className="text-sm text-muted underline">
        Bỏ chọn
      </button>
      <div className="relative ml-auto" ref={rootRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn-primary"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Archive size={18} /> Xuất ảnh ({total})
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => run("zip")}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-cream"
            >
              <Archive size={16} className="text-muted" /> Tải ZIP ({total} ảnh)
            </button>
            {folderSupported && (
              <button
                type="button"
                role="menuitem"
                onClick={() => run("folder")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-cream"
              >
                <FolderDown size={16} className="text-muted" /> Lưu vào thư mục…
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
