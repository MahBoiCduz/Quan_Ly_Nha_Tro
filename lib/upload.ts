import path from "path";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedImage(mime: string): boolean {
  return ALLOWED.has(mime);
}

export function sanitizeFilename(name: string): string {
  // Replace path separators (/ and \) with _ so traversal segments become part of name
  // Then collapse all non-alphanumeric-non-dot chars to _
  // Then trim edge underscores and collapse _ before extension dot
  return name
    .replace(/[\\/]+/g, "_")            // path separators → _
    .replace(/[^a-zA-Z0-9._-]+/g, "_")  // unsafe chars → _ (hyphen preserved for UUIDs)
    .replace(/^[_.]+|[_.]+$/g, "")      // trim leading/trailing _ and .
    .replace(/_+(\.)/g, "$1");          // collapse _ before extension dot
}

export function uploadDir(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}
