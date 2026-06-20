import { BackLink } from "@/components/back-link";
import { TenantForm } from "../tenant-form";
import { createTenant } from "../tenant-actions";

export default function NewTenantPage() {
  return (
    <div>
      <BackLink href="/khach-thue" label="Danh sách khách thuê" />
      <h1 className="mb-4">Thêm khách thuê</h1>
      <TenantForm action={createTenant} />
    </div>
  );
}
