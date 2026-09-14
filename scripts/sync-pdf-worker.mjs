// Copies the pdf.js worker into public/ so the browser can load it as a plain
// static ES module.
//
// Why: the worker is a ~1 MB minified .mjs file. Referencing it from the bundle
// (`new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`) makes
// webpack try to parse it and `next build` fails with a syntax error. Serving it
// from /public keeps the bundler out of the way entirely.
//
// Runs automatically before `npm run dev` and `npm run build` (predev/prebuild).

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repoRoot, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const publicDir = path.join(repoRoot, "public");
const target = path.join(publicDir, "pdf.worker.min.mjs");

if (!existsSync(source)) {
  console.error("✖ Không tìm thấy pdfjs worker trong node_modules — chạy `npm install` trước.");
  process.exit(1);
}

mkdirSync(publicDir, { recursive: true });

const upToDate = existsSync(target) && readFileSync(source).equals(readFileSync(target));
if (upToDate) {
  console.log("✓ pdf.worker.min.mjs đã đồng bộ với pdfjs-dist.");
  process.exit(0);
}

copyFileSync(source, target);
console.log(`✓ Đã copy pdfjs worker → ${path.relative(repoRoot, target)}`);
