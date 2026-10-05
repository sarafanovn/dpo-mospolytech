import bcrypt from "bcryptjs";
import { db } from "./db.js";

// Bootstrap for admin accounts.
//   seedAdmin                              -> default dev admin (used by `npm run setup`), skipped if it already exists
//   seedAdmin <email> <password> <name...> -> custom admin, fails if the email is taken
const DEFAULT_ADMIN = { email: "admin@mail.com", password: "admin123", fullName: "Администратор" };

const [, , argEmail, argPassword, ...nameParts] = process.argv;
const isDefault = !argEmail;

if (isDefault && process.env.NODE_ENV === "production") {
  console.error("Default admin is dev-only. Pass explicit credentials in production.");
  process.exit(1);
}

if (!isDefault && (!argPassword || nameParts.length === 0)) {
  console.error('Usage: npm run seed:admin -- <email> <password> "<full name>"');
  process.exit(1);
}

const { email, password, fullName } = isDefault
  ? DEFAULT_ADMIN
  : { email: argEmail, password: argPassword, fullName: nameParts.join(" ") };

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
if (existing) {
  if (isDefault) {
    console.log(`Администратор по умолчанию уже существует: ${email}`);
    process.exit(0);
  }
  console.error(`User ${email} already exists.`);
  process.exit(1);
}

db.prepare("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')").run(
  email,
  bcrypt.hashSync(password, 10),
  fullName
);

console.log(`\nАдминистратор создан. Данные для входа:\n  email:  ${email}\n  пароль: ${password}\n`);
