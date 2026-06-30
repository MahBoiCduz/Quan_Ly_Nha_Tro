"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { ActionButton } from "@/components/action-button";
import { createBillingProfile, updateBillingProfile, deleteBillingProfile } from "./setting-actions";
import { Plus, Trash2 } from "lucide-react";

export type Profile = {
  id: string;
  name: string;
  bankAccountName: string | null;
  bankAccountNo: string | null;
  bankName: string | null;
  qrImageUrl: string | null;
  invoiceNotes: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("upload failed");
  return (await res.json()).url as string;
}

function ProfileCard({ profile, onDone }: { profile?: Profile; onDone?: () => void }) {
  const toast = useToast();
  const [qr, setQr] = useState(profile?.qrImageUrl ?? "");
  const isNew = !profile;

  async function onSubmit(formData: FormData) {
    const res = isNew
      ? await createBillingProfile(formData)
      : await updateBillingProfile(profile!.id, formData);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Đã lưu hồ sơ");
      if (isNew) onDone?.();
    }
  }

  return (
    <form action={onSubmit} className="card space-y-3 p-4">
      <input type="hidden" name="qrImageUrl" value={qr} />
      <div>
        <label className="label">Tên hồ sơ</label>
        <input name="name" defaultValue={profile?.name ?? ""} placeholder="vd: Tài khoản của bố" required className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Tên tài khoản</label>
          <input name="bankAccountName" defaultValue={profile?.bankAccountName ?? ""} className="input" />
        </div>
        <div>
          <label className="label">Số tài khoản</label>
          <input name="bankAccountNo" defaultValue={profile?.bankAccountNo ?? ""} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Ngân hàng</label>
        <input name="bankName" defaultValue={profile?.bankName ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Ghi chú trên hóa đơn</label>
        <textarea name="invoiceNotes" defaultValue={profile?.invoiceNotes ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Ảnh QR chuyển khoản</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block text-sm text-muted"
          onChange={async (e) => {
            if (e.target.files?.[0]) {
              try {
                setQr(await uploadImage(e.target.files[0]));
                toast.success("Đã tải ảnh QR");
              } catch {
                toast.error("Tải ảnh thất bại");
              }
            }
          }}
        />
        {qr && <img src={qr} alt="QR" className="mt-2 h-28 w-28 rounded border border-line object-contain" />}
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary">{isNew ? "Tạo hồ sơ" : "Lưu"}</button>
        {!isNew && (
          <ActionButton
            action={deleteBillingProfile.bind(null, profile!.id)}
            success="Đã xóa hồ sơ"
            confirm="Xóa hồ sơ này? Các phòng đang dùng sẽ quay về Mặc định."
            className="btn-link-danger inline-flex items-center gap-1"
          >
            <Trash2 size={16} />Xóa
          </ActionButton>
        )}
      </div>
    </form>
  );
}

export function BillingProfiles({ profiles }: { profiles: Profile[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="space-y-4">
      <div>
        <h2>Hồ sơ thu tiền</h2>
        <p className="mt-1 text-sm text-muted">
          Mỗi hồ sơ là một bộ số tài khoản + QR riêng. Hồ sơ <strong>Mặc định</strong> dùng thông tin ở phần trên.
          Gán hồ sơ cho từng phòng ở mục bên dưới.
        </p>
      </div>
      {profiles.map((p) => (
        <ProfileCard key={p.id} profile={p} />
      ))}
      {adding ? (
        <ProfileCard onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-secondary inline-flex items-center gap-1">
          <Plus size={18} />Thêm hồ sơ
        </button>
      )}
    </section>
  );
}
