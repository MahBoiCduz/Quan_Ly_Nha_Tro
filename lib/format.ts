export function formatVND(amount: number): string {
  const digits = Math.trunc(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (amount < 0 ? "-" : "") + digits + " ₫";
}
