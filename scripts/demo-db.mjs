// Creates / refreshes the local *demo* database used for showcasing the app.
//
//   npm run demo:reset   # xoá prisma/demo.db → đẩy schema → ghi dữ liệu giả
//   npm run demo:push    # chỉ đẩy schema vào prisma/demo.db
//   npm run demo:seed    # chỉ ghi dữ liệu giả (file DB phải đã có schema)
//
// The schema is pushed with an ABSOLUTE `file:` URL so the Prisma CLI and the
// running app (lib/db.ts) always point at the same file, no matter how each of
// them resolves a relative path.
//
// This script never touches Turso: DATABASE_URL is forced to the demo file and
// DATABASE_AUTH_TOKEN is cleared. It also never starts a dev server.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoDbPath = path.join(repoRoot, "prisma", "demo.db");
const demoUrl = `file:${demoDbPath.replace(/\\/g, "/")}`;
const envFile = path.join(repoRoot, ".env.local");

const command = (process.argv[2] ?? "reset").toLowerCase();
const valid = ["reset", "push", "seed"];
if (!valid.includes(command)) {
  console.error(`Lệnh không hợp lệ: ${command}. Dùng một trong: ${valid.join(", ")}`);
  process.exit(1);
}

const childEnv = { ...process.env, DATABASE_URL: demoUrl, DATABASE_AUTH_TOKEN: "" };

function run(label, cmd) {
  console.log(`\n→ ${label}\n  ${cmd}\n`);
  const result = spawnSync(cmd, { cwd: repoRoot, env: childEnv, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`\n✖ Thất bại: ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

function removeDemoDb() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = demoDbPath + suffix;
    if (existsSync(file)) {
      rmSync(file);
      console.log(`  đã xoá ${path.relative(repoRoot, file)}`);
    }
  }
}

/** Point the app at the demo DB (append only — never rewrite .env.local). */
function ensureEnvLocal() {
  const line = `DATABASE_URL="${demoUrl}"`;
  const note =
    "# DB demo cho showcase — xoá/comment dòng dưới để quay lại DB thật (Turso hoặc dev.db)";

  if (!existsSync(envFile)) {
    writeFileSync(envFile, `${note}\n${line}\n`, "utf8");
    console.log(`\n✓ Đã tạo .env.local với:\n  ${line}`);
    return;
  }

  const content = readFileSync(envFile, "utf8");
  const matches = content.match(/^\s*DATABASE_URL\s*=\s*(.*)$/m);
  if (!matches) {
    writeFileSync(envFile, `${content.replace(/\s*$/, "")}\n\n${note}\n${line}\n`, "utf8");
    console.log(`\n✓ Đã thêm vào .env.local:\n  ${line}`);
    return;
  }
  if (matches[1].trim().replace(/['"]/g, "") === demoUrl) {
    console.log("\n✓ .env.local đã trỏ vào DB demo.");
    return;
  }
  console.log(
    [
      "\n⚠ .env.local đang có DATABASE_URL khác nên script KHÔNG tự sửa.",
      `  Muốn chạy app với dữ liệu demo, sửa dòng đó thành:`,
      `    ${line}`,
      `  (giá trị hiện tại: ${matches[1].trim()})`,
    ].join("\n"),
  );
}

console.log(`DB demo: ${path.relative(repoRoot, demoDbPath)}`);
console.log(`URL    : ${demoUrl}`);
console.log("Chế độ : chỉ file local — không kết nối Turso.");

if (command === "reset") {
  console.log("\n→ Xoá DB demo cũ");
  removeDemoDb();
  run("Đẩy schema Prisma", "npx prisma db push --accept-data-loss");
  run("Sinh lại Prisma client", "npx prisma generate");
  run("Ghi dữ liệu giả", "npx tsx prisma/seed-demo.ts");
  ensureEnvLocal();
}

if (command === "push") {
  run("Đẩy schema Prisma", "npx prisma db push --accept-data-loss");
  run("Sinh lại Prisma client", "npx prisma generate");
  ensureEnvLocal();
}

if (command === "seed") {
  run("Ghi dữ liệu giả", "npx tsx prisma/seed-demo.ts");
  ensureEnvLocal();
}

console.log(
  [
    "\n✓ Xong.",
    "Bước tiếp theo (bạn tự chạy):",
    "  npm run dev",
    "  mở http://localhost:3000 và đăng nhập bằng tài khoản in ở trên",
    "",
    "Quay lại dữ liệu thật: xoá/comment dòng DATABASE_URL trong .env.local.",
    "",
  ].join("\n"),
);
