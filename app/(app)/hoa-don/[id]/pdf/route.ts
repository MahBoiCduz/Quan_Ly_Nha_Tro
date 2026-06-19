import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { db } from "@/lib/db";
import { buildInvoiceModel, InvoiceDocument } from "@/lib/invoice-pdf";
import { qrDataUrl } from "@/app/(app)/cai-dat/setting-actions";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const bill = await db.bill.findUnique({
    where: { id: params.id },
    include: { lease: { include: { unit: true, tenant: true } } },
  });
  if (!bill) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const setting = await db.setting.findUnique({ where: { id: "singleton" } });
  const model = buildInvoiceModel(bill, bill.lease, bill.lease.unit, bill.lease.tenant, setting);

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
