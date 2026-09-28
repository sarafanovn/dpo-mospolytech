import bcrypt from "bcryptjs";
import { db } from "./db.js";

// One-time bootstrap for the first admin account: `node dist/seedAdmin.js <email> <password> <fullName>`
const [, , email, password, ...nameParts] = process.argv;
const fullName = nameParts.join(" ");

if (!email || !password || !fullName) {
  console.error("Usage: seedAdmin <email> <password> <full name>");
  process.exit(1);
}

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  console.error(`User ${email} already exists.`);
  process.exit(1);
}

const passwordHash = bcrypt.hashSync(password, 10);
db.prepare("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')").run(
  email,
  passwordHash,
  fullName
);

console.log(`Admin account created: ${email}`);
