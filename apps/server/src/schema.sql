CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date TEXT,
  branch TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  hours INTEGER NOT NULL,
  duration_from TEXT NOT NULL,
  duration_to TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  study_form TEXT NOT NULL DEFAULT 'очно-заочная',
  sdo_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'signed', 'contract_registered', 'approved', 'completed')),
  contract_number TEXT,
  contract_registered_at TEXT,
  grade_practice TEXT,
  grade_intermediate TEXT,
  grade_final TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(id),
  form_json TEXT NOT NULL,
  signed_at TEXT,
  signed_by_executor_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id),
  type TEXT NOT NULL CHECK (type IN ('reference', 'certificate')),
  number TEXT NOT NULL DEFAULT '',
  issued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('passport', 'inn', 'education', 'other')),
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS templates (
  type TEXT PRIMARY KEY CHECK (type IN ('application', 'contract', 'certificate', 'reference')),
  content TEXT NOT NULL,
  file_name TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
