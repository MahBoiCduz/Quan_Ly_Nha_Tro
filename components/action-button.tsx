"use client";

import { useState } from "react";
import { useToast } from "./toast";

type ActionResult = { ok?: true; error?: string } | void;

/**
 * Client button that runs a server action and shows a success/error toast.
 * Use for deletes and one-shot actions inside server components, e.g.:
 *   <ActionButton action={deleteExpense.bind(null, e.id)} success="Đã xóa chi tiêu"
 *     confirm="Xóa chi tiêu này?" className="btn-link-danger"><Trash2 size={16}/>Xóa</ActionButton>
 */
export function ActionButton({
  action,
  success,
  confirm,
  className,
  children,
}: {
  action: () => Promise<ActionResult>;
  success: string;
  confirm?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const res = await action();
      if (res && "error" in res && res.error) toast.error(res.error);
      else toast.success(success);
    } catch {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className={className}>
      {children}
    </button>
  );
}
