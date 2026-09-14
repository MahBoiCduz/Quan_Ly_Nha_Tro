import { describe, expect, it } from "vitest";
import { billStatusFor } from "./billing";
import { dueStatus } from "./maintenance";
import {
  buildDemoDataset,
  demoBillingProfiles,
  demoDueDate,
  demoRooms,
  type DemoBill,
  type DemoDataset,
} from "./demo-data";

// A fixed "today" keeps the dataset deterministic (Sep 14 2026, noon).
const TODAY = new Date(2026, 8, 14, 12, 0, 0);
const dataset: DemoDataset = buildDemoDataset(TODAY);

function allBills(data: DemoDataset): DemoBill[] {
  return data.leases.flatMap((lease) => lease.bills);
}

function paidTotal(bill: DemoBill): number {
  return bill.payments.reduce((sum, p) => sum + p.amount, 0);
}

describe("demo rooms", () => {
  it("creates 15 rooms on floors 2-4", () => {
    const rooms = demoRooms();
    expect(rooms).toHaveLength(15);
    expect(rooms.map((r) => r.name)[0]).toBe("Phòng 201");
    expect(rooms.every((r) => r.floor >= 2 && r.floor <= 4)).toBe(true);
    expect(new Set(rooms.map((r) => r.name)).size).toBe(15);
  });

  it("leaves exactly 2 rooms vacant, including Phòng 201 (for E2E)", () => {
    const vacant = dataset.rooms.filter((r) => r.status === "vacant").map((r) => r.name);
    expect(vacant).toHaveLength(2);
    expect(vacant).toContain("Phòng 201");
    expect(dataset.leases).toHaveLength(13);
    expect(dataset.leases.every((l) => l.roomName !== "Phòng 201")).toBe(true);
  });
});

describe("demo leases", () => {
  it("gives every lease a tenant, fake contact details and services", () => {
    for (const lease of dataset.leases) {
      expect(lease.tenant.fullName.length).toBeGreaterThan(4);
      expect(lease.tenant.phone).toMatch(/^0\d{9}$/);
      expect(lease.tenant.idCardNumber).toMatch(/^\d{12}$/);
      expect(lease.agreedRent).toBeGreaterThan(0);
      expect(lease.billingCycle).toBe("monthly");
      expect(lease.endDate).toBeNull();
      expect(lease.services.length).toBeGreaterThan(0);
    }
  });

  it("carries over the previous meter readings between bills", () => {
    for (const lease of dataset.leases) {
      const bills = lease.bills;
      expect(bills).toHaveLength(3);
      for (let i = 1; i < bills.length; i++) {
        const prev = bills[i - 1];
        const curr = bills[i];
        if (prev.type === "room" || curr.type === "room") continue;
        if (prev.electricityNew === null || curr.electricityOld === null) {
          throw new Error("metered bills must carry electricity readings");
        }
        if (prev.waterNew === null || curr.waterOld === null) {
          throw new Error("metered bills must carry water readings");
        }
        expect(curr.electricityOld).toBe(prev.electricityNew);
        expect(curr.waterOld).toBe(prev.waterNew);
      }
    }
  });
});

describe("demo bills", () => {
  it("uses a distinct period label per month, in chronological order", () => {
    const labels = dataset.leases[0].bills.map((b) => b.periodLabel);
    expect(new Set(labels).size).toBe(3);
    expect(labels[0]).toContain("/2026");
    const dues = dataset.leases[0].bills.map((b) => b.dueDate.getTime());
    expect(dues[0]).toBeLessThan(dues[1]);
    expect(dues[1]).toBeLessThan(dues[2]);
  });

  it("keeps every amount an integer VND and consistent with the totals", () => {
    for (const bill of allBills(dataset)) {
      const lineSum = bill.lineItems.reduce((sum, item) => sum + item.total, 0);
      expect(Number.isInteger(bill.subtotal)).toBe(true);
      expect(Number.isInteger(bill.grandTotal)).toBe(true);
      expect(bill.subtotal).toBe(lineSum);
      expect(bill.grandTotal).toBe(bill.subtotal + bill.electricityAmount + bill.waterAmount);
      expect(bill.subtotal).toBeGreaterThanOrEqual(0);
      expect(bill.grandTotal).toBeGreaterThan(0);
      for (const item of bill.lineItems) {
        expect(item.total).toBe(item.quantity * item.unitPrice);
        expect(Number.isInteger(item.total)).toBe(true);
      }
      for (const payment of bill.payments) {
        expect(Number.isInteger(payment.amount)).toBe(true);
        expect(payment.amount).toBeGreaterThan(0);
      }
    }
  });

  it("stores null readings and zero utilities for room-only bills", () => {
    const roomBills = allBills(dataset).filter((b) => b.type === "room");
    expect(roomBills.length).toBeGreaterThan(0);
    for (const bill of roomBills) {
      expect(bill.electricityOld).toBeNull();
      expect(bill.waterNew).toBeNull();
      expect(bill.electricityAmount).toBe(0);
      expect(bill.waterAmount).toBe(0);
      expect(bill.lineItems.length).toBeGreaterThan(0);
    }
  });

  it("drops line items and rent for electricity/water-only bills", () => {
    const utilityBills = allBills(dataset).filter((b) => b.type === "elec_water");
    expect(utilityBills).toHaveLength(3); // one room × 3 months
    for (const bill of utilityBills) {
      expect(bill.lineItems).toHaveLength(0);
      expect(bill.subtotal).toBe(0);
      expect(bill.grandTotal).toBe(bill.electricityAmount + bill.waterAmount);
      if (bill.electricityOld === null || bill.electricityNew === null) {
        throw new Error("elec_water bill must carry meter readings");
      }
      expect(bill.electricityNew).toBeGreaterThan(bill.electricityOld);
    }
  });

  it("covers all three bill types", () => {
    const types = new Set(allBills(dataset).map((b) => b.type));
    expect(types).toEqual(new Set(["room", "elec_water", "both"]));
    expect(allBills(dataset).filter((b) => b.type === "both")).toHaveLength(30);
  });

  it("matches the stored status to what the app would derive", () => {
    for (const bill of allBills(dataset)) {
      if (bill.payments.length === 0) {
        expect(bill.status).toBe("unpaid");
        continue;
      }
      const expected = billStatusFor(bill.grandTotal, paidTotal(bill), bill.dueDate, TODAY);
      expect(bill.status).toBe(expected);
      if (paidTotal(bill) >= bill.grandTotal) expect(bill.status).toBe("paid");
    }
  });

  it("produces a showcase mix: paid, partly paid, overdue and not-yet-due", () => {
    const bills = allBills(dataset);
    const paid = bills.filter((b) => b.status === "paid");
    const overdue = bills.filter((b) => b.status === "overdue");
    const unpaidNotDue = bills.filter((b) => b.status === "unpaid");
    const partial = bills.filter((b) => paidTotal(b) > 0 && paidTotal(b) < b.grandTotal);

    expect(paid.length).toBeGreaterThanOrEqual(30);
    expect(overdue.length).toBeGreaterThanOrEqual(1);
    expect(unpaidNotDue.length).toBeGreaterThanOrEqual(1);
    expect(partial.length).toBeGreaterThanOrEqual(1);
    // Everything not fully settled still owes money.
    for (const bill of [...overdue, ...unpaidNotDue]) {
      expect(bill.grandTotal - paidTotal(bill)).toBeGreaterThan(0);
    }
  });

  it("never records a payment in the future", () => {
    const endOfToday = new Date(TODAY);
    endOfToday.setHours(23, 59, 59, 999);
    for (const bill of allBills(dataset)) {
      for (const payment of bill.payments) {
        expect(payment.paidAt.getTime()).toBeLessThanOrEqual(endOfToday.getTime());
      }
    }
  });

  it("stays in the past even when seeded early in the morning", () => {
    const earlyMorning = new Date(2026, 8, 14, 7, 30, 0);
    const early = buildDemoDataset(earlyMorning);
    for (const bill of allBills(early)) {
      for (const payment of bill.payments) {
        expect(payment.paidAt.getTime()).toBeLessThanOrEqual(earlyMorning.getTime());
      }
    }
    for (const expense of early.expenses) {
      expect(expense.date.getTime()).toBeLessThanOrEqual(earlyMorning.getTime());
    }
  });

  it("bills the second payment profile on the assigned rooms only", () => {
    const assigned = new Set(["Phòng 401", "Phòng 402", "Phòng 403"]);
    for (const lease of dataset.leases) {
      for (const bill of lease.bills) {
        if (assigned.has(lease.roomName)) {
          expect(bill.billingProfileId).toBe("demo_profile_co_owner");
        } else {
          expect(bill.billingProfileId).toBeNull();
        }
      }
    }
  });
});

describe("demo billing profiles", () => {
  it("has exactly one default profile and one extra profile", () => {
    const profiles = demoBillingProfiles();
    expect(profiles.filter((p) => p.isDefault)).toHaveLength(1);
    expect(profiles.filter((p) => !p.isDefault)).toHaveLength(1);
    expect(profiles[0].id).toBe("default_profile");
    for (const profile of profiles) {
      expect(profile.bankAccountNo).toMatch(/^\d+$/);
      expect(profile.bankAccountName).toMatch(/^[A-Z ]+$/);
    }
  });
});

describe("demo expenses & maintenance", () => {
  it("spreads expenses over the 3 billed months", () => {
    expect(dataset.expenses.length).toBeGreaterThanOrEqual(9);
    for (const expense of dataset.expenses) {
      expect(Number.isInteger(expense.amount)).toBe(true);
      expect(expense.amount).toBeGreaterThan(0);
      expect(expense.date.getTime()).toBeLessThanOrEqual(TODAY.getTime());
      expect(expense.date.getTime()).toBeGreaterThanOrEqual(demoDueDate(TODAY, 2).getTime() - 5 * 86400000);
    }
  });

  it("ships one overdue, one due-soon and one healthy maintenance schedule", () => {
    const statuses = dataset.maintenance.map((m) => dueStatus(m.nextDueAt, TODAY));
    expect(statuses).toContain("overdue");
    expect(statuses).toContain("due_soon");
    expect(statuses).toContain("ok");
    expect(dataset.maintenance.filter((m) => m.scope === "unit").every((m) => m.roomName !== null)).toBe(true);
  });
});

describe("determinism", () => {
  it("returns the same numbers for the same seed", () => {
    const again = buildDemoDataset(TODAY);
    const first = allBills(dataset).map((b) => b.grandTotal);
    const second = allBills(again).map((b) => b.grandTotal);
    expect(second).toEqual(first);
    expect(again.leases[0].tenant.fullName).toBe(dataset.leases[0].tenant.fullName);
  });

  it("returns different numbers for a different seed", () => {
    const other = buildDemoDataset(TODAY, 1);
    const first = allBills(dataset).map((b) => b.grandTotal);
    const second = allBills(other).map((b) => b.grandTotal);
    expect(second).not.toEqual(first);
  });
});
