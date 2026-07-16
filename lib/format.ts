export function formatVND(amount: number): string {
  const digits = Math.trunc(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (amount < 0 ? "-" : "") + digits + " ₫";
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
