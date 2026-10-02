"use client";
import { useEffect, useState } from "react";
export function ResponsiveDetails({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(window.matchMedia("(min-width: 768px)").matches); }, []);
  return <details open={open} onToggle={e => setOpen(e.currentTarget.open)}>
    <summary className="mb-3 cursor-pointer text-brand-ink">{title}</summary>
    {children}
  </details>;
}
