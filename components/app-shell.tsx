"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Nav } from "./nav";
import { SignOutButton } from "./sign-out-button";

const APP_TITLE = "Quản Lý Nhà Trọ";

/**
 * Responsive app chrome.
 * - Desktop (md+): fixed left sidebar, as before.
 * - Mobile (<md): sidebar hidden; a sticky top bar with a hamburger opens a
 *   slide-over drawer holding the same nav. The drawer auto-closes on navigation.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5 text-lg font-semibold text-ink">{APP_TITLE}</div>
        <div className="flex-1 overflow-y-auto">
          <Nav />
        </div>
        <div className="border-t border-line p-3">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile slide-over drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-line bg-surface shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-semibold text-ink">{APP_TITLE}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-cream"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Nav />
            </div>
            <div className="border-t border-line p-3">
              <SignOutButton />
            </div>
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/95 px-3 py-2.5 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-cream"
          >
            <Menu size={24} aria-hidden />
          </button>
          <span className="text-base font-semibold text-ink">{APP_TITLE}</span>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-7">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
