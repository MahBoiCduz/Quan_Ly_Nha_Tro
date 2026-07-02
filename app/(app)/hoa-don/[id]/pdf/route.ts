import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { buildInvoiceModel, InvoiceDocument } from "@/lib/invoice-pdf";
import { qrDataUrl } from "@/app/(app)/cai-dat/setting-actions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: {
      lease: { include: { unit: { include: { billingProfile: true } }, tenant: true } },
      billingProfile: true,
    },
  });
  if (!bill) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const defaultProfile = await db.billingProfile.findFirst({ where: { isDefault: true } });
  // The bill's own profile wins, then the room's, then the default profile.
  const profile = bill.billingProfile ?? bill.lease.unit.billingProfile ?? defaultProfile;
  const model = buildInvoiceModel(bill, bill.lease, bill.lease.unit, bill.lease.tenant, profile);

  model.qrImageUrl = await qrDataUrl(model.qrImageUrl);

  // Cast: InvoiceDocument wraps <Document>, but its props type ({ model }) isn't
  // structurally DocumentProps, which renderToBuffer's signature expects.
  const element = React.createElement(InvoiceDocument, { model }) as React.ReactElement;
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="hoa-don-${bill.id}.pdf"`,
    },
  });
}
