import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";

describe("db client", () => {
  it("exposes the Unit model", () => {
    expect(db.unit).toBeDefined();
  });

  it("exposes the Bill model", () => {
    expect(db.bill).toBeDefined();
  });
});
