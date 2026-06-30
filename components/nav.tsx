"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DoorOpen,
  Receipt,
  BookText,
  Wallet,
  Wrench,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/phong", label: "Phòng", icon: DoorOpen },
  { href: "/hoa-don", label: "Hóa đơn", icon: Receipt },
  { href: "/so-sach", label: "Sổ sách", icon: BookText },
  { href: "/chi-tieu", label: "Chi tiêu", icon: Wallet },
  { href: "/bao-tri", label: "Bảo trì", icon: Wrench },
  { href: "/nguoi-dung", label: "Người dùng", icon: Users },
  { href: "/cai-dat", label: "Cài đặt", icon: Settings },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
              active
                ? "bg-brand-tint font-medium text-brand-ink"
                : "text-ink/80 hover:bg-cream"
            }`}
          >
            <Icon size={20} className={active ? "text-brand" : "text-muted"} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
