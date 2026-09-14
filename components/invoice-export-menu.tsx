"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileDown, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/toast";
import { buildInvoicePngFilename } from "@/lib/invoice-image";
import { downloadBlob, fetchInvoicePdf, renderInvoiceImages } from "@/lib/invoice-image-client";

/**
 * "Xuất hoá đơn" menu: the original PDF download plus a PNG export that is
 * rasterised in the browser from that same PDF.
 */
export function InvoiceExportMenu({
  billId,
  unitName,
  periodLabel,
}: {
  billId: string;
  unitName: string;
  periodLabel: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  async function exportPng() {
    setOpen(false);
    setBusy(true);
    try {
      const pdf = await fetchInvoicePdf(billId);
      const images = await renderInvoiceImages(pdf);
      for (const image of images) {
        downloadBlob(
          image.blob,
          buildInvoicePngFilename(unitName, periodLabel, image.pageIndex, image.pageCount),
        );
      }
      toast.success(images.length > 1 ? `Đã tải ${images.length} ảnh PNG` : "Đã tải ảnh PNG hoá đơn");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tạo được ảnh hoá đơn.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        className="btn-secondary"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FileDown size={18} /> {busy ? "Đang tạo ảnh…" : "Xuất hoá đơn"}
        <ChevronDown size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          <a
            role="menuitem"
            href={`/hoa-don/${billId}/pdf`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-cream"
          >
            <FileDown size={16} className="text-muted" /> Tải PDF
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={exportPng}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink hover:bg-cream"
          >
            <ImageIcon size={16} className="text-muted" /> Ảnh PNG (nét)
          </button>
        </div>
      )}
    </div>
  );
}
