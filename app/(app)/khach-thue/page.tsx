import Link from "next/link";
import { db } from "@/lib/db";
import { Plus } from "lucide-react";

export default async function TenantsPage() {
  const tenants = await db.tenant.findMany({ orderBy: { fullName: "asc" } });
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1>Khách thuê</h1>
        <Link href="/khach-thue/new" className="btn-primary">
          <Plus size={18} /> Thêm khách
        </Link>
      </div>
      <ul className="card overflow-hidden">
        {tenants.map((t) => (
          <li key={t.id} className="border-b border-line last:border-0">
            <Link
              href={`/khach-thue/${t.id}`}
              className="flex justify-between px-4 py-3 text-[15px] hover:bg-cream"
            >
              <span className="text-ink">{t.fullName}</span>
              <span className="text-sm text-muted">{t.phone}</span>
            </Link>
          </li>
        ))}
        {tenants.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Chưa có khách thuê.</li>
        )}
      </ul>
    </div>
  );
}
