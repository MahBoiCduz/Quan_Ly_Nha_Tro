import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { sanitizeFilename, uploadDir } from "@/lib/upload";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const name = sanitizeFilename(params.path.join("/"));
  try {
    const data = await readFile(path.join(uploadDir(), name));
    const ext = path.extname(name).toLowerCase();
    const type = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type } });
  } catch {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
}
