import { Nav } from "@/components/nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ToastProvider } from "@/components/toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-cream">
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-surface">
          <div className="px-5 py-5 text-lg font-semibold text-ink">Quản Lý Nhà Trọ</div>
          <div className="flex-1 overflow-y-auto">
            <Nav />
          </div>
          <div className="border-t border-line p-3">
            <SignOutButton />
          </div>
        </aside>
        <main className="flex-1 overflow-x-auto px-6 py-7 md:px-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </ToastProvider>
  );
}
