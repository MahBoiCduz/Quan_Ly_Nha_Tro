"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { saveRoomAssignments } from "./setting-actions";

type RoomRow = { id: string; name: string; floor: number; billingProfileId: string | null };
type Profile = { id: string; name: string };

export function RoomAssignment({ units, profiles }: { units: RoomRow[]; profiles: Profile[] }) {
  const toast = useToast();
  const [map, setMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(units.map((u) => [u.id, u.billingProfileId ?? ""])),
  );
  const [saving, setSaving] = useState(false);

  // Nothing to assign to until at least one extra profile exists.
  if (profiles.length === 0) return null;

  async function onSave() {
    setSaving(true);
    const assignments = units.map((u) => ({ unitId: u.id, profileId: map[u.id] || null }));
    const res = await saveRoomAssignments(assignments);
    setSaving(false);
    if (res?.error) toast.error(res.error);
    else toast.success("Đã lưu gán phòng");
  }

  return (
    <section className="space-y-3">
      <h2>Gán hồ sơ cho phòng</h2>
      <p className="text-sm text-muted">Chọn hồ sơ thu tiền cho mỗi phòng. Để “Mặc định” nếu dùng tài khoản chính.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[420px] text-[15px]">
          <thead>
            <tr className="bg-cream text-muted text-sm">
              <th className="px-4 py-3 text-left font-medium">Phòng</th>
              <th className="px-4 py-3 text-left font-medium">Hồ sơ thu tiền</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 text-ink">{u.name}</td>
                <td className="px-4 py-2">
                  <select
                    className="input"
                    value={map[u.id] ?? ""}
                    onChange={(e) => setMap((m) => ({ ...m, [u.id]: e.target.value }))}
                  >
                    <option value="">Mặc định</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
        {saving ? "Đang lưu…" : "Lưu gán phòng"}
      </button>
    </section>
  );
}
