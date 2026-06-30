import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";

// Every page in this group is an authenticated, per-request dashboard that
// reads from the database. Force dynamic rendering so `next build` doesn't try
// to statically prerender them — at build time DATABASE_URL isn't set (Prisma
// falls back to an empty file DB), which would crash prerendering with
// "no such table". This cascades to all child routes in the (app) group.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
