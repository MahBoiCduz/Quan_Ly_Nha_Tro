import { describe, it, expect } from "vitest";
import { matchesQuery } from "@/lib/search";

describe("matchesQuery", () => {
  it("matches text case- and accent-insensitively", () => {
    expect(matchesQuery("Phòng 301 · Tháng 6/2026 · Trần Văn Bình", "phong")).toBe(true);
    expect(matchesQuery("Điện nước", "dien nuoc")).toBe(true);
  });

  it("matches a room number only as a whole number, not inside the year", () => {
    const room202 = "Phòng 202 · Tháng 8/2026 · Nguyễn Văn A · Tiền phòng";
    expect(matchesQuery(room202, "202")).toBe(true);
    // Room 201's bill must NOT match "202" even though its period contains "2026".
    const room201 = "Phòng 201 · Tháng 8/2026 · Nguyễn Văn A · Tiền phòng";
    expect(matchesQuery(room201, "202")).toBe(false);
  });

  it("does not match a digit token inside a longer number", () => {
    expect(matchesQuery("Phòng 301", "1")).toBe(false);
    expect(matchesQuery("Phòng 601", "6")).toBe(false);
  });

  it("matches a month number at its own boundary", () => {
    expect(matchesQuery("Phòng 601 · Tháng 6/2026", "6")).toBe(true);
  });

  it("matches a date token inside a longer date", () => {
    expect(matchesQuery("31/01/2026", "01/2026")).toBe(true);
    expect(matchesQuery("Tháng 5/2026", "01/2026")).toBe(false);
  });

  it("requires every whitespace-separated token (AND)", () => {
    expect(matchesQuery("Phòng 301 · Tháng 6/2026 · Trần Văn Bình", "301 tháng 6")).toBe(true);
    expect(matchesQuery("Phòng 202 · Tháng 8/2026", "202 8")).toBe(true);
    expect(matchesQuery("Phòng 301 · Tháng 6/2026", "301 8")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(matchesQuery("Phòng 202 · Tháng 8/2026", "")).toBe(true);
    expect(matchesQuery("Phòng 202 · Tháng 8/2026", "   ")).toBe(true);
  });
});
