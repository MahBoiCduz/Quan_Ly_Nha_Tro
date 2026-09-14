import { describe, expect, it } from "vitest";
import {
  buildBatchInvoiceFilename,
  buildPeriodOptions,
  billTypeSlug,
  periodKey,
  periodOptionLabel,
  periodSortKey,
  uniqueFileName,
  zipFileName,
  type BatchBill,
} from "./invoice-batch";

// The real period labels found in the family's workbook ("Thông tin thuê nhà.xlsx").
// They are deliberately messy — that is exactly what the grouping has to survive.
const REAL_LABELS: [string, number][] = [
  ["15/6 đến hết tháng 8/2026", 2],
  ["Tháng 4 + 5 + 6/ 2026", 2],
  ["Tháng 5+6+7/2026", 6],
  ["Tháng 5+6+7/2026 (giữa tháng)", 2],
  ["Tháng 6, 7, 8/2026", 2],
  ["Tháng 6/2026", 6],
  ["Tháng 6/2026 (giữa tháng)", 1],
  ["Tháng 6+7/2026", 2],
  ["Tháng 7/2026", 4],
  ["Tháng 7+8+9/ 2026", 2],
  ["Tháng 7+8+9/2026", 1],
];

function billsFromRealLabels(): BatchBill[] {
  const bills: BatchBill[] = [];
  for (const [label, count] of REAL_LABELS) {
    for (let i = 0; i < count; i++) {
      bills.push({
        id: `${label}-${i}`,
        unitName: `Phòng ${200 + i}`,
        periodLabel: label,
        type: "both",
      });
    }
  }
  return bills;
}

describe("periodKey", () => {
  it("ignores spaces, case and diacritics", () => {
    expect(periodKey("Tháng 7+8+9/ 2026")).toBe(periodKey("Tháng 7+8+9/2026"));
    expect(periodKey("tháng 6/2026")).toBe(periodKey("Tháng 6/2026"));
    expect(periodKey("Tháng 4 + 5 + 6/2026")).toBe(periodKey("Tháng 4+5+6/2026"));
  });

  it("keeps '(giữa tháng)' a separate period", () => {
    expect(periodKey("Tháng 6/2026 (giữa tháng)")).not.toBe(periodKey("Tháng 6/2026"));
  });
});

describe("periodSortKey", () => {
  it("uses the latest month mentioned in the label", () => {
    expect(periodSortKey("Tháng 7+8+9/2026")).toBe(202609);
    expect(periodSortKey("Tháng 7+8+9/ 2026")).toBe(202609);
    expect(periodSortKey("Tháng 5+6+7/2026")).toBe(202607);
    expect(periodSortKey("Tháng 6, 7, 8/2026")).toBe(202608);
    expect(periodSortKey("Tháng 4 + 5 + 6/ 2026")).toBe(202606);
    expect(periodSortKey("Tháng 6/2026")).toBe(202606);
  });

  it("does not mistake a day/month pair for the period", () => {
    // "15/6 đến hết tháng 8/2026" → August 2026, not month 15.
    expect(periodSortKey("15/6 đến hết tháng 8/2026")).toBe(202608);
  });

  it("returns 0 when there is no M/YYYY pair", () => {
    expect(periodSortKey("Kỳ đầu tiên")).toBe(0);
    expect(periodSortKey("")).toBe(0);
  });
});

describe("buildPeriodOptions", () => {
  it("merges only the whitespace variants of the real labels", () => {
    const options = buildPeriodOptions(billsFromRealLabels());
    // 11 raw labels → 10 periods ("Tháng 7+8+9/ 2026" merges with ".../2026").
    expect(options).toHaveLength(10);
    const merged = options.find((option) => option.key === periodKey("Tháng 7+8+9/2026"));
    expect(merged?.count).toBe(3);
    // The cleanest spelling wins.
    expect(merged?.label).toBe("Tháng 7+8+9/2026");
  });

  it("sorts newest period first", () => {
    const options = buildPeriodOptions(billsFromRealLabels());
    expect(options[0].label).toBe("Tháng 7+8+9/2026");
    expect(periodSortKey(options[0].label)).toBe(202609);
    expect(options[1].sortKey).toBe(202608);
    const sortKeys = options.map((option) => option.sortKey);
    expect(sortKeys).toEqual([...sortKeys].sort((a, b) => b - a));
    expect(options[options.length - 1].sortKey).toBe(202606);
  });

  it("keeps labels without a date at the end", () => {
    const options = buildPeriodOptions([
      { id: "a", unitName: "Phòng 201", periodLabel: "Kỳ đặc biệt", type: "both" },
      { id: "b", unitName: "Phòng 202", periodLabel: "Tháng 9/2026", type: "both" },
    ]);
    expect(options[0].label).toBe("Tháng 9/2026");
    expect(options[1].label).toBe("Kỳ đặc biệt");
  });

  it("counts every bill and labels empty periods", () => {
    const bills: BatchBill[] = [
      { id: "1", unitName: "Phòng 201", periodLabel: "Tháng 9/2026", type: "room" },
      { id: "2", unitName: "Phòng 202", periodLabel: " Tháng 9/2026 ", type: "elec_water" },
      { id: "3", unitName: "Phòng 203", periodLabel: "", type: "both" },
    ];
    const options = buildPeriodOptions(bills);
    expect(options).toHaveLength(2);
    expect(periodOptionLabel(options[0])).toBe("Tháng 9/2026 (2)");
    expect(periodOptionLabel(options[1])).toBe("(không có kỳ) (1)");
  });
});

describe("billTypeSlug", () => {
  it("separates a room's two bills in the same period", () => {
    expect(billTypeSlug("room")).toBe("Tien-phong");
    expect(billTypeSlug("elec_water")).toBe("Dien-nuoc");
    expect(billTypeSlug("both")).toBe("Phong-va-Dien-nuoc");
    expect(billTypeSlug("unknown-type")).toBe("Hoa-don");
  });
});

describe("buildBatchInvoiceFilename", () => {
  it("names files after room, period and type", () => {
    expect(buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "room")).toBe(
      "hoa-don-Phong-201-Thang-9-2026-Tien-phong.png",
    );
    expect(buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "elec_water")).toBe(
      "hoa-don-Phong-201-Thang-9-2026-Dien-nuoc.png",
    );
  });

  it("never collides for a room with two bills in the same period", () => {
    const rent = buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "room");
    const utilities = buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "elec_water");
    expect(rent).not.toBe(utilities);
  });

  it("copes with the messy real labels", () => {
    const name = buildBatchInvoiceFilename("Phòng 205", "Tháng 7+8+9/ 2026", "both");
    expect(name).toBe("hoa-don-Phong-205-Thang-7-8-9-2026-Phong-va-Dien-nuoc.png");
    expect(name).not.toMatch(/[^\w.-]/);
  });

  it("adds a page suffix only for multi-page invoices", () => {
    expect(buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "both", 0, 1)).not.toContain("-trang-");
    expect(buildBatchInvoiceFilename("Phòng 201", "Tháng 9/2026", "both", 1, 2)).toContain("-trang-2.png");
  });
});

describe("uniqueFileName", () => {
  it("returns the name when it is free", () => {
    expect(uniqueFileName("a.png", new Set())).toBe("a.png");
  });

  it("appends -2, -3… before the extension", () => {
    expect(uniqueFileName("a.png", new Set(["a.png"]))).toBe("a-2.png");
    expect(uniqueFileName("a.png", new Set(["a.png", "a-2.png"]))).toBe("a-3.png");
    expect(uniqueFileName("no-ext", new Set(["no-ext"]))).toBe("no-ext-2");
  });
});

describe("zipFileName", () => {
  const today = new Date(2026, 8, 14);

  it("uses the period when all bills share one", () => {
    expect(zipFileName(["Tháng 9/2026", "Tháng 9/2026"], 13, today)).toBe(
      "hoa-don-Thang-9-2026.zip",
    );
  });

  it("treats whitespace variants as the same period", () => {
    expect(zipFileName(["Tháng 7+8+9/2026", "Tháng 7+8+9/ 2026"], 3, today)).toBe(
      "hoa-don-Thang-7-8-9-2026.zip",
    );
  });

  it("falls back to a dated name for a mixed selection", () => {
    expect(zipFileName(["Tháng 9/2026", "Tháng 8/2026"], 26, today)).toBe(
      "hoa-don-26-anh-2026-09-14.zip",
    );
  });

  it("falls back for empty periods", () => {
    expect(zipFileName([], 0, today)).toBe("hoa-don-0-anh-2026-09-14.zip");
  });
});
