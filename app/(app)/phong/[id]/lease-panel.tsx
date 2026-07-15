"use client";

import { useRouter } from "next/navigation";
import { formatVND, formatDate } from "@/lib/format";
import { endLease } from "./lease-actions";
import { useToast } from "@/components/toast";

const BILLING_CYCLE_LABEL: Record<string, string> = {
  monthly: "Theo tháng",
  quarterly: "Theo quý",
  custom: "Tùy chỉnh",
};

type ActiveLease = {
  id: string;
  agreedRent: number;
  depositAmount: number;
  startDate: string;
  billingCycle: string;
};

export function LeasePanel({
  unitId, activeLease,
}: { unitId: string; activeLease: ActiveLease }) {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="card p-4 space-y-3">
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <span className="text-muted">Ngày bắt đầu:</span>{" "}
          <span className="text-ink">{formatDate(activeLease.startDate)}</span>
        </div>
        <div>
          <span className="text-muted">Chu kỳ:</span>{" "}
          <span className="text-ink">{BILLING_CYCLE_LABEL[activeLease.billingCycle] ?? activeLease.billingCycle}</span>
        </div>
        <div>
          <span className="text-muted">Giá thuê:</span>{" "}
          <span className="font-medium text-ink">{formatVND(activeLease.agreedRent)}</span>
        </div>
        <div>
          <span className="text-muted">Tiền cọc:</span>{" "}
          <span className="text-ink">{formatVND(activeLease.depositAmount)}</span>
        </div>
      </div>
      <form
        action={async (fd) => {
          await endLease(activeLease.id, unitId, String(fd.get("endDate")));
          router.refresh();
          toast.success("Đã kết thúc hợp đồng");
        }}
        className="flex items-center gap-2 border-t border-line pt-3"
      >
        <input name="endDate" type="date" required className="input" />
        <button className="btn-danger">Kết thúc hợp đồng</button>
      </form>
    </div>
  );
}
