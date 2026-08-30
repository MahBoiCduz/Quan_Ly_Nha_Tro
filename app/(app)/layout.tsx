import { AppShell } from "@/components/app-shell";
import { ToastProvider } from "@/components/toast";

// Force this layout dynamic so `next build` doesn't statically prerender it —
// at build time DATABASE_URL isn't set (Prisma falls back to an empty file DB),
// which would crash with "no such table".
// NOTE: in Next.js 14 this does NOT cascade to child pages (see
// vercel/next.js#57075), so each data-reading page also sets its own
// `export const dynamic = "force-dynamic"` — otherwise it would be cached as
// static and serve stale DB data.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
