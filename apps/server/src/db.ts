import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "meridian.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// Lightweight migrations for columns added after a database already existed.
// CREATE TABLE IF NOT EXISTS above only helps on a fresh database.
function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing("users", "phone", "TEXT");
addColumnIfMissing("users", "birth_date", "TEXT");
addColumnIfMissing("users", "branch", "TEXT");
addColumnIfMissing("courses", "study_form", "TEXT NOT NULL DEFAULT 'очно-заочная'");
addColumnIfMissing("courses", "sdo_url", "TEXT NOT NULL DEFAULT ''");
addColumnIfMissing("certificates", "number", "TEXT NOT NULL DEFAULT ''");

// The free-text attestation notes became the gradebook (ведомость): practice / intermediate / final grades.
function renameColumnIfPresent(table: string, from: string, to: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (columns.some((c) => c.name === from) && !columns.some((c) => c.name === to)) {
    db.exec(`ALTER TABLE ${table} RENAME COLUMN ${from} TO ${to}`);
  }
}
renameColumnIfPresent("enrollments", "intermediate_attestation", "grade_intermediate");
renameColumnIfPresent("enrollments", "final_attestation", "grade_final");
addColumnIfMissing("enrollments", "grade_practice", "TEXT");

// Certificates issued before numbering existed get a stable number derived from their id.
db.exec(
  "UPDATE certificates SET number = (CASE type WHEN 'certificate' THEN 'CERT-' ELSE 'REF-' END) || strftime('%Y', issued_at) || '-' || printf('%04d', id) WHERE number = ''"
);
