import Link from "next/link";

export const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/", label: "Tổng quan" },
  { href: "/phong", label: "Phòng" },
  { href: "/khach-thue", label: "Khách thuê" },
  { href: "/hoa-don", label: "Hóa đơn" },
  { href: "/so-sach", label: "Sổ sách" },
  { href: "/chi-tieu", label: "Chi tiêu" },
  { href: "/bao-tri", label: "Bảo trì" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export function Nav() {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded px-3 py-2 text-sm hover:bg-gray-100"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
