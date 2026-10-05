import {
  EMPTY_APPLICATION_FORM,
  type Application,
  type ApplicationForm,
  type Certificate,
  type CertificateType,
  type Course,
  type Enrollment,
  type EnrollmentDetail,
  type EnrollmentDocument,
  type EnrollmentStatus,
  type DocumentKind,
  type StudyForm,
  type User,
} from "@meridian/shared";
import { db } from "./db.js";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  birth_date: string | null;
  branch: string | null;
  role: "student" | "admin";
  created_at: string;
}

export interface CourseRow {
  id: number;
  title: string;
  hours: number;
  duration_from: string;
  duration_to: string;
  description: string;
  study_form: StudyForm;
  sdo_url: string;
  created_at: string;
}

export interface EnrollmentRow {
  id: number;
  user_id: number;
  course_id: number;
  status: EnrollmentStatus;
  contract_number: string | null;
  grade_practice: string | null;
  grade_intermediate: string | null;
  grade_final: string | null;
  created_at: string;
}

export interface ApplicationRow {
  id: number;
  enrollment_id: number;
  form_json: string;
  signed_at: string | null;
  signed_by_executor_at: string | null;
  created_at: string;
}

export interface CertificateRow {
  id: number;
  enrollment_id: number;
  type: CertificateType;
  number: string;
  issued_at: string;
}

interface DocumentRow {
  id: number;
  enrollment_id: number;
  kind: DocumentKind;
  file_name: string;
  mime: string;
  size: number;
  uploaded_at: string;
}

export const EMPTY_FORM = EMPTY_APPLICATION_FORM;

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    birthDate: row.birth_date,
    branch: row.branch,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    hours: row.hours,
    durationFrom: row.duration_from,
    durationTo: row.duration_to,
    description: row.description,
    studyForm: row.study_form,
    sdoUrl: row.sdo_url,
    createdAt: row.created_at,
  };
}

export function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    status: row.status,
    contractNumber: row.contract_number,
    gradePractice: row.grade_practice,
    gradeIntermediate: row.grade_intermediate,
    gradeFinal: row.grade_final,
    createdAt: row.created_at,
  };
}

export function parseForm(json: string): ApplicationForm {
  // Forms saved before new fields were introduced miss some keys.
  return { ...EMPTY_FORM, ...(JSON.parse(json) as Partial<ApplicationForm>) };
}

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    form: parseForm(row.form_json),
    signedAt: row.signed_at,
    signedByExecutorAt: row.signed_by_executor_at,
    createdAt: row.created_at,
  };
}

export function toCertificate(row: CertificateRow): Certificate {
  return { id: row.id, enrollmentId: row.enrollment_id, type: row.type, number: row.number, issuedAt: row.issued_at };
}

function toDocument(row: DocumentRow): EnrollmentDocument {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    kind: row.kind,
    fileName: row.file_name,
    mime: row.mime,
    size: row.size,
    uploadedAt: row.uploaded_at,
  };
}

/** Loads enrollments (optionally for one student / one id) with all related data, newest first. */
export function loadEnrollmentDetails(filter: { userId?: number; id?: number } = {}): EnrollmentDetail[] {
  const where: string[] = [];
  const params: number[] = [];
  if (filter.userId !== undefined) {
    where.push("e.user_id = ?");
    params.push(filter.userId);
  }
  if (filter.id !== undefined) {
    where.push("e.id = ?");
    params.push(filter.id);
  }
  const rows = db
    .prepare(
      `SELECT e.* FROM enrollments e ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY e.created_at DESC, e.id DESC`
    )
    .all(...params) as EnrollmentRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => "?").join(",");
  const courses = new Map(
    (db.prepare("SELECT * FROM courses").all() as CourseRow[]).map((c) => [c.id, toCourse(c)])
  );
  const users = new Map(
    (db.prepare("SELECT * FROM users").all() as UserRow[]).map((u) => [u.id, u])
  );
  const applications = new Map(
    (db.prepare(`SELECT * FROM applications WHERE enrollment_id IN (${marks})`).all(...ids) as ApplicationRow[]).map(
      (a) => [a.enrollment_id, toApplication(a)]
    )
  );
  const documents = new Map<number, EnrollmentDocument[]>();
  for (const d of db
    .prepare(
      `SELECT id, enrollment_id, kind, file_name, mime, size, uploaded_at FROM documents WHERE enrollment_id IN (${marks}) ORDER BY id`
    )
    .all(...ids) as DocumentRow[]) {
    const list = documents.get(d.enrollment_id) ?? [];
    list.push(toDocument(d));
    documents.set(d.enrollment_id, list);
  }
  const certificates = new Map<number, Certificate[]>();
  for (const c of db
    .prepare(`SELECT * FROM certificates WHERE enrollment_id IN (${marks}) ORDER BY id DESC`)
    .all(...ids) as CertificateRow[]) {
    const list = certificates.get(c.enrollment_id) ?? [];
    list.push(toCertificate(c));
    certificates.set(c.enrollment_id, list);
  }

  return rows.flatMap((row) => {
    const course = courses.get(row.course_id);
    const user = users.get(row.user_id);
    if (!course || !user) return [];
    return [
      {
        ...toEnrollment(row),
        course,
        student: { fullName: user.full_name, email: user.email, phone: user.phone, branch: user.branch },
        application: applications.get(row.id) ?? null,
        documents: documents.get(row.id) ?? [],
        certificates: certificates.get(row.id) ?? [],
      },
    ];
  });
}
