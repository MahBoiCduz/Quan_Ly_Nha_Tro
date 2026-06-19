import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendZaloMessage } from "@/lib/zalo";
import { runNotifications } from "@/lib/notify-runner";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const result = await runNotifications({ db, send: (u, t) => sendZaloMessage(u, t) });
  return NextResponse.json(result);
}
