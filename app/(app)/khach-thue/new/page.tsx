import { TenantForm } from "../tenant-form";
import { createTenant } from "../tenant-actions";

export default function NewTenantPage() {
  return (
    <div>
      <h1 className="mb-4">Thêm khách thuê</h1>
      <TenantForm action={createTenant} />
    </div>
  );
}
