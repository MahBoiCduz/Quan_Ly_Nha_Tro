type ServiceUnit = { name: string; measureUnit: string };

const normalize = (name: string) => name.normalize("NFC").trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");
const aliases: Record<string, string> = {
  "intenet": "internet",
  "sử dụng máy giặt": "máy giặt",
  "chỗ để xe máy": "gửi xe",
  "chỗ để xe": "gửi xe",
  "để xe": "gửi xe",
};
const canonical = (name: string) => {
  const key = normalize(name).replace(/\s*\([^()]*\)\s*$/, "").trim();
  return aliases[key] ?? key;
};

/** Room configuration is authoritative for display; never change invoice amounts. */
export function invoiceServiceUnit(item: ServiceUnit, services: ServiceUnit[]): string {
  const exact = services.filter(service => normalize(service.name) === normalize(item.name));
  const matches = exact.length ? exact : services.filter(service => canonical(service.name) === canonical(item.name));
  if (matches.length === 1 && matches[0].measureUnit.trim()) return matches[0].measureUnit;
  // Removed/renamed or ambiguous services and historical aggregate rows retain
  // their own unit instead of borrowing one from an unrelated service.
  return item.measureUnit || "—";
}
