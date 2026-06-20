import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Styled "back" link shown at the top of detail / form screens. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-muted transition-colors hover:text-ink"
    >
      <ChevronLeft size={18} aria-hidden />
      {label}
    </Link>
  );
}
