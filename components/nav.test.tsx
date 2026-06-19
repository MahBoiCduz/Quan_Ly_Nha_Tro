import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav, NAV_ITEMS } from "@/components/nav";

// Nav uses usePathname() for active-route highlighting; stub it for the jsdom test.
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("Nav", () => {
  it("includes the dashboard and rooms links", () => {
    expect(NAV_ITEMS.some((i) => i.href === "/")).toBe(true);
    expect(NAV_ITEMS.some((i) => i.href === "/phong")).toBe(true);
  });

  it("renders Vietnamese labels", () => {
    render(<Nav />);
    expect(screen.getByText("Tổng quan")).toBeDefined();
    expect(screen.getByText("Phòng")).toBeDefined();
  });
});
