// Sets (resets) an admin user's password directly in the libSQL/Turso database.
// Useful when you've forgotten the admin password or want to rotate it without
// re-running the full seed. Reads DATABASE_URL + DATABASE_AUTH_TOKEN from the
// env (same vars as the rest of the app); local file DB works too.
//
// Email and password can be passed as args or env vars. Defaults: the seeded
// admin email, and the password is required (no default).
//
//   # Local file DB:
//   node scripts/set-admin-password.mjs admin@nhatro.local 'Locvung@666'
//
//   # Turso (remote):
//   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... \
//     node scripts/set-admin-password.mjs admin@nhatro.local 'Locvung@666'
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const email = process.argv[2] ?? process.env.ADMIN_EMAIL ?? "admin@nhatro.local";
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
if (!password) {
  throw new Error(
    "Password is required: node scripts/set-admin-password.mjs <email> <password>",
  );
}

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

const passwordHash = await bcrypt.hash(password, 10);
const client = createClient({ url, authToken });

const res = await client.execute({
  sql: "UPDATE User SET passwordHash = ? WHERE email = ?",
  args: [passwordHash, email],
});

if (res.rowsAffected === 0) {
  console.error(`No admin user found with email "${email}". Nothing changed.`);
  process.exit(1);
}

console.log(`Password updated for admin "${email}".`);
