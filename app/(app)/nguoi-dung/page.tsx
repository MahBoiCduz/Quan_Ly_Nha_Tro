import { db } from "@/lib/db";
import { auth } from "@/auth";
import { formatDate } from "@/lib/format";
import { UserForm } from "./user-form";
import { deleteUser } from "./user-actions";
import { ActionButton } from "@/components/action-button";
import { Trash2 } from "lucide-react";

export default async function UsersPage() {
  const session = await auth();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-ink">Người dùng</h1>
      <UserForm />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] text-[15px]">
          <thead>
            <tr className="bg-cream text-muted text-sm">
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-center font-medium">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isCurrent = u.email === session?.user?.email;
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">
                    {u.email}
                    {isCurrent && <span className="ml-2 text-xs text-muted">(bạn)</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-muted">{u.role}</td>
                  <td className="px-4 py-3 text-ink">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    {!isCurrent && (
                      <ActionButton
                        action={deleteUser.bind(null, u.id)}
                        success="Đã xóa người dùng"
                        confirm={`Xóa người dùng ${u.email}?`}
                        className="btn-link-danger inline-flex items-center gap-1"
                      >
                        <Trash2 size={16} />Xóa
                      </ActionButton>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-muted">Chưa có người dùng.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
