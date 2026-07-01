"use client";

import { Search } from "lucide-react";

export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative mb-4 max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        size={18}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Tìm kiếm…"}
        className="input pl-10"
      />
    </div>
  );
}
