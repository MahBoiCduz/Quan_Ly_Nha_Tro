import Link from "next/link";
import { db } from "@/lib/db";

export default async function TenantsPage() {
  const tenants = await db.tenant.findMany({ orderBy: { fullName: "asc" } });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Khách thuê</h1>
        <Link href="/khach-thue/new" className="rounded bg-blue-600 px-3 py-2 text-white">+ Thêm khách</Link>
      </div>
      <ul className="rounded border bg-white">
        {tenants.map((t) => (
          <li key={t.id} className="border-b last:border-0">
            <Link href={`/khach-thue/${t.id}`} className="flex justify-between px-3 py-2 hover:bg-gray-50">
              <span>{t.fullName}</span>
              <span className="text-sm text-gray-500">{t.phone}</span>
            </Link>
          </li>
        ))}
        {tenants.length === 0 && <li className="px-3 py-2 text-sm text-gray-400">Chưa có khách thuê.</li>}
      </ul>
    </div>
  );
}
