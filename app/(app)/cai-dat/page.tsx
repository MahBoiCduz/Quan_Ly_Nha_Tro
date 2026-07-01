import { db } from "@/lib/db";
import { SettingForm } from "./setting-form";
import { BillingProfiles, DefaultProfileForm } from "./billing-profiles";
import { RoomAssignment } from "./room-assignment";

export default async function SettingsPage() {
  const [setting, defaultProfile, profiles, units] = await Promise.all([
    db.setting.findUnique({ where: { id: "singleton" } }),
    db.billingProfile.findFirst({ where: { isDefault: true } }),
    db.billingProfile.findMany({ where: { isDefault: false }, orderBy: { name: "asc" } }),
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
      <DefaultProfileForm profile={defaultProfile} />
      <BillingProfiles profiles={profiles} />
      <RoomAssignment units={units} profiles={profileOptions} />
    </div>
  );
}
