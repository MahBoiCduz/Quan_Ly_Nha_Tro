"use client";

import { useState } from "react";
import { Pencil, X, Trash2, UserPlus } from "lucide-react";
import { TenantForm } from "@/components/tenant-form";
import { ImageLightbox } from "@/components/image-lightbox";
import { ActionButton } from "@/components/action-button";
import { useToast } from "@/components/toast";
import { updateTenant, addCoTenant, removeCoTenant } from "./tenant-actions";

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

function IdCards({ tenant }: { tenant: Tenant }) {
  if (!tenant.idCardFrontImageUrl && !tenant.idCardBackImageUrl) return null;
  return (
    <div className="mt-3 flex gap-3">
      {tenant.idCardFrontImageUrl && (
        <div>
          <p className="mb-1 text-xs text-muted">CCCD mặt trước</p>
          <ImageLightbox src={tenant.idCardFrontImageUrl} alt="mặt trước" thumbClassName="h-20 rounded border object-cover" />
        </div>
      )}
      {tenant.idCardBackImageUrl && (
        <div>
          <p className="mb-1 text-xs text-muted">CCCD mặt sau</p>
          <ImageLightbox src={tenant.idCardBackImageUrl} alt="mặt sau" thumbClassName="h-20 rounded border object-cover" />
        </div>
      )}
    </div>
  );
}

function TenantReadView({ tenant }: { tenant: Tenant }) {
  return (
    <>
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
            <span className="text-muted">CCCD/CMND:</span> <span className="text-ink">{tenant.idCardNumber}</span>
          </div>
        )}
        {tenant.vehiclePlate && (
          <div>
            <span className="text-muted">Biển số xe:</span> <span className="text-ink">{tenant.vehiclePlate}</span>
          </div>
        )}
        {tenant.zaloId && (
          <div>
            <span className="text-muted">Zalo:</span> <span className="text-ink">{tenant.zaloId}</span>
          </div>
        )}
        {tenant.notes && (
          <div className="col-span-2">
            <span className="text-muted">Ghi chú:</span> <span className="text-ink">{tenant.notes}</span>
          </div>
        )}
      </div>
      <IdCards tenant={tenant} />
    </>
  );
}

/** One tenant's card: read view with an inline edit toggle; optional remove (co-tenants). */
function TenantCard({ tenant, unitId, onRemove }: { tenant: Tenant; unitId: string; onRemove?: () => Promise<{ ok?: true; error?: string }> }) {
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-end gap-2">
        {onRemove && !editing && (
          <ActionButton
            action={onRemove}
            success="Đã xóa khách"
            confirm={`Xóa khách "${tenant.fullName}" khỏi phòng?`}
            className="btn-link-danger inline-flex items-center gap-1 text-sm"
          >
            <Trash2 size={14} /> Xóa
          </ActionButton>
        )}
        <button onClick={() => setEditing((v) => !v)} className="btn-secondary text-sm">
          {editing ? <><X size={14} /> Hủy</> : <><Pencil size={14} /> Chỉnh sửa</>}
        </button>
      </div>
      {editing ? (
        <TenantForm
          tenant={tenant}
          action={updateTenant.bind(null, tenant.id, unitId)}
          onSuccess={() => {
            toast.success("Đã cập nhật thông tin khách thuê");
            setEditing(false);
          }}
        />
      ) : (
        <TenantReadView tenant={tenant} />
      )}
    </div>
  );
}

function AddCoTenant({ leaseId, unitId }: { leaseId: string; unitId: string }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary inline-flex items-center gap-1 text-sm">
        <UserPlus size={16} /> Thêm khách ở chung
      </button>
    );
  }
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-medium text-ink">Khách ở chung mới</h4>
        <button onClick={() => setOpen(false)} className="btn-secondary text-sm"><X size={14} /> Hủy</button>
      </div>
      <TenantForm
        action={addCoTenant.bind(null, leaseId, unitId)}
        submitLabel="Thêm khách"
        onSuccess={() => {
          toast.success("Đã thêm khách ở chung");
          setOpen(false);
        }}
      />
    </div>
  );
}

export function TenantInfoSection({
  primary,
  coTenants,
  leaseId,
  unitId,
}: {
  primary: Tenant;
  coTenants: Tenant[];
  leaseId: string;
  unitId: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="mb-2 font-semibold text-ink">Người đại diện</h2>
        <TenantCard tenant={primary} unitId={unitId} />
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-ink">Khách ở chung {coTenants.length > 0 && `(${coTenants.length})`}</h3>
        {coTenants.map((t) => (
          <TenantCard key={t.id} tenant={t} unitId={unitId} onRemove={removeCoTenant.bind(null, t.id, unitId)} />
        ))}
        <AddCoTenant leaseId={leaseId} unitId={unitId} />
      </div>
    </section>
  );
}
