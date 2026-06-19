import { db } from "@/lib/db";
import { SettingForm } from "./setting-form";

export default async function SettingsPage() {
  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Cài đặt</h1>
      <SettingForm setting={setting} />
    </div>
  );
}
