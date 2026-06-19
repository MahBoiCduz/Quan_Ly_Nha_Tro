import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TenantForm } from "../tenant-form";
import { updateTenant } from "../tenant-actions";

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await db.tenant.findUnique({ where: { id: params.id } });
  if (!tenant) notFound();
  const action = updateTenant.bind(null, tenant.id);
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{tenant.fullName}</h1>
      <TenantForm tenant={tenant} action={action} />
    </div>
  );
}
