import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await db.bill.count();
    const latest = await db.bill.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        lease: { include: { unit: true, tenant: true } },
        payments: { select: { amount: true } },
      },
    });
    const rows = latest.map((b) => ({
      id: b.id.slice(0, 10),
      unitName: b.lease?.unit?.name ?? "NULL",
      periodLabel: b.periodLabel,
      tenantName: b.lease?.tenant?.fullName ?? "NULL",
      grandTotal: b.grandTotal,
      status: b.status,
      paymentsCount: b.payments?.length ?? 0,
    }));

    return NextResponse.json({
      dbUrl: process.env.DATABASE_URL?.slice(0, 50) + "...",
      hasAuthToken: !!process.env.DATABASE_AUTH_TOKEN,
      totalBills: count,
      latest: rows,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      error: msg,
      dbUrl: process.env.DATABASE_URL?.slice(0, 50) + "...",
    }, { status: 500 });
  }
}