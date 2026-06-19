import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { isAllowedImage, sanitizeFilename, uploadDir } from "@/lib/upload";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu tệp" }, { status: 400 });
  }
  if (!isAllowedImage(file.type)) {
    return NextResponse.json({ error: "Định dạng ảnh không hợp lệ" }, { status: 400 });
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  const stored = `${randomUUID()}_${sanitizeFilename(file.name)}`;
  await writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/api/files/${stored}` });
}
