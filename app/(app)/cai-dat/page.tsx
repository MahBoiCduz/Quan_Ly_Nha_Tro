import { db } from "@/lib/db";
import { SettingForm } from "./setting-form";
import { BillingProfiles } from "./billing-profiles";
import { RoomAssignment } from "./room-assignment";

export default async function SettingsPage() {
  const [setting, profiles, units] = await Promise.all([
    db.setting.findUnique({ where: { id: "singleton" } }),
    db.billingProfile.findMany({ orderBy: { name: "asc" } }),
    db.unit.findMany({
      orderBy: [{ floor: "asc" }, { name: "asc" }],
      select: { id: true, name: true, floor: true, billingProfileId: true },
    }),
  ]);
  const profileOptions = profiles.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6">Cài đặt</h1>
        <SettingForm setting={setting} />
      </div>
      <BillingProfiles profiles={profiles} />
      <RoomAssignment units={units} profiles={profileOptions} />
    </div>
  );
}
