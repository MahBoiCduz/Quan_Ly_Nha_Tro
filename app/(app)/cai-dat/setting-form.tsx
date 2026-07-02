"use client";

import { saveSettings } from "./setting-actions";
import { useToast } from "@/components/toast";

type Setting = {
  adminZaloUserId?: string | null;
  defaultElectricityRate?: number | null;
  defaultWaterRate?: number | null;
};

export function SettingForm({ setting }: { setting: Setting | null }) {
  const toast = useToast();

  async function onSubmit(formData: FormData) {
    const res = await saveSettings(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Đã lưu cài đặt");
    }
  }

  return (
    <form action={onSubmit} className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Đơn giá điện (đ/kWh)</label>
          <input name="defaultElectricityRate" type="number" min="0" defaultValue={setting?.defaultElectricityRate ?? 4000} placeholder="4000" className="input" />
        </div>
        <div>
          <label className="label">Đơn giá nước (đ/m³)</label>
          <input name="defaultWaterRate" type="number" min="0" defaultValue={setting?.defaultWaterRate ?? 35000} placeholder="35000" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Zalo user id của admin</label>
        <input name="adminZaloUserId" defaultValue={setting?.adminZaloUserId ?? ""} placeholder="Zalo user id của admin" className="input" />
      </div>
      <button className="btn-primary">Lưu cài đặt</button>
    </form>
  );
}
