"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { TenantForm } from "@/components/tenant-form";
import { useToast } from "@/components/toast";
import { updateTenant } from "./tenant-actions";

type Tenant = {
  id: string;
  fullName: string;
  phone: string;
  idCardNumber: string | null;
  idCardFrontImageUrl: string | null;
  idCardBackImageUrl: string | null;
  vehiclePlate: string | null;
  zaloId: string | null;
  notes: string | null;
};

export function TenantInfoSection({ tenant, unitId }: { tenant: Tenant; unitId: string }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-ink">Thông tin khách thuê</h2>
        <button onClick={() => setEditing((v) => !v)} className="btn-secondary text-sm">
          {editing ? <><X size={14} /> Hủy</> : <><Pencil size={14} /> Chỉnh sửa</>}
        </button>
      </div>

      {editing ? (
        <div className="card p-4">
          <TenantForm
            tenant={tenant}
            action={updateTenant.bind(null, tenant.id, unitId)}
            onSuccess={() => {
              toast.success("Đã cập nhật thông tin khách thuê");
              setEditing(false);
            }}
          />
        </div>
      ) : (
        <div className="card p-4">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted">Họ tên:</span>{" "}
              <span className="font-medium text-ink">{tenant.fullName}</span>
            </div>
            <div>
              <span className="text-muted">Số điện thoại:</span>{" "}
              <span className="text-ink">{tenant.phone}</span>
            </div>
            {tenant.idCardNumber && (
              <div>
                <span className="text-muted">CCCD/CMND:</span>{" "}
                <span className="text-ink">{tenant.idCardNumber}</span>
              </div>
            )}
            {tenant.vehiclePlate && (
              <div>
                <span className="text-muted">Biển số xe:</span>{" "}
                <span className="text-ink">{tenant.vehiclePlate}</span>
              </div>
            )}
            {tenant.zaloId && (
              <div>
                <span className="text-muted">Zalo:</span>{" "}
                <span className="text-ink">{tenant.zaloId}</span>
              </div>
            )}
            {tenant.notes && (
              <div className="col-span-2">
                <span className="text-muted">Ghi chú:</span>{" "}
                <span className="text-ink">{tenant.notes}</span>
              </div>
            )}
          </div>
          {(tenant.idCardFrontImageUrl || tenant.idCardBackImageUrl) && (
            <div className="mt-3 flex gap-3">
              {tenant.idCardFrontImageUrl && (
                <div>
                  <p className="mb-1 text-xs text-muted">CCCD mặt trước</p>
                  <img src={tenant.idCardFrontImageUrl} alt="mặt trước" className="h-20 rounded border object-cover" />
                </div>
              )}
              {tenant.idCardBackImageUrl && (
                <div>
                  <p className="mb-1 text-xs text-muted">CCCD mặt sau</p>
                  <img src={tenant.idCardBackImageUrl} alt="mặt sau" className="h-20 rounded border object-cover" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
