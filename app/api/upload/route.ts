import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
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

  const stored = `${randomUUID()}_${sanitizeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // On Vercel the filesystem is read-only/ephemeral, so store uploads in Vercel
  // Blob when its token is present. Locally, fall back to the uploads/ dir.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${stored}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, stored), buffer);
  return NextResponse.json({ url: `/api/files/${stored}` });
}
