import { Nav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r bg-white">
        <div className="border-b p-4 font-bold">Quản Lý Nhà Trọ</div>
        <Nav />
        <div className="p-4">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
