// Accent- and case-insensitive substring matching for the in-page search boxes.
// "phong 301" matches "Phòng 301"; "01/2026" matches the date string "31/01/2026".
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/đ/g, "d"); // đ -> d
}

function tokenMatches(hay: string, token: string): boolean {
  // Numeric / date tokens ("6", "01/2026") must sit at a number boundary so
  // "tháng 1" doesn't match the "1" inside "301", yet "01/2026" still matches
  // inside "31/01/2026". Text tokens match as a plain substring (flexible names).
  if (/^[0-9/]+$/.test(token)) {
    const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^0-9])${esc}`).test(hay);
  }
  return hay.includes(token);
}

// Every whitespace-separated token must appear (AND), so "301 tháng 6" matches
// "Phòng 301 · Tháng 6/2026" even though a separator sits between the tokens.
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = normalize(haystack);
  return tokens.every((t) => tokenMatches(hay, t));
}
