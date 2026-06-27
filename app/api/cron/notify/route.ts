import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendZaloMessage } from "@/lib/zalo";
import { runNotifications } from "@/lib/notify-runner";

export async function GET(req: NextRequest) {
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically;
  // also accept ?secret= / x-cron-secret for manual triggering.
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const secret =
    bearer ??
    req.nextUrl.searchParams.get("secret") ??
    req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 401 });
  }

  const result = await runNotifications({
    db,
    send: (userId, text) => sendZaloMessage(userId, text),
  });
  return NextResponse.json(result);
}
