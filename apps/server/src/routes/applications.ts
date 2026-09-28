import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import type { Application, ApplicationForm, Course } from "@meridian/shared";
import { generateApplicationPdf } from "../documents/applicationPdf.js";
import { generateContractPdf } from "../documents/contractPdf.js";
import { generatePersonalDataXlsx } from "../documents/personalDataXlsx.js";

export const applicationsRouter = Router();

interface ApplicationRow {
  id: number;
  enrollment_id: number;
  form_json: string;
  signed_at: string | null;
  signed_by_executor_at: string | null;
  created_at: string;
}

interface EnrollmentRow {
  id: number;
  user_id: number;
  course_id: number;
  status: string;
  contract_number: string | null;
}

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    form: JSON.parse(row.form_json) as ApplicationForm,
    signedAt: row.signed_at,
    signedByExecutorAt: row.signed_by_executor_at,
    createdAt: row.created_at,
  };
}

function loadEnrollmentForAccess(enrollmentId: string | number, userId: number, role: string): EnrollmentRow | null {
  const row = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(enrollmentId) as EnrollmentRow | undefined;
  if (!row) return null;
  if (role !== "admin" && row.user_id !== userId) return null;
  return row;
}

const formSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1),
  passport: z.string().min(1),
  passportIssuedBy: z.string().min(1),
  addressRegistration: z.string().min(1),
  addressResidence: z.string().min(1),
  education: z.string().min(1),
  snils: z.string().min(1),
  inn: z.string().min(1),
  educationLevel: z.string().min(1),
  workerCategory: z.string().min(1),
  positionCategory: z.string().min(1),
  industry: z.string().min(1),
});

applicationsRouter.get("/:enrollmentId", requireAuth, (req, res) => {
  const enrollment = loadEnrollmentForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const row = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Анкета ещё не заполнена" });
    return;
  }
  res.json(toApplication(row));
});

// Save/update the application form (draft, before signing).
applicationsRouter.put("/:enrollmentId", requireAuth, requireRole("student"), (req, res) => {
  const enrollment = loadEnrollmentForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const parsed = formSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }

  const existing = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow | undefined;

  if (existing) {
    db.prepare("UPDATE applications SET form_json = ? WHERE id = ?").run(
      JSON.stringify(parsed.data),
      existing.id
    );
  } else {
    db.prepare("INSERT INTO applications (enrollment_id, form_json) VALUES (?, ?)").run(
      enrollment.id,
      JSON.stringify(parsed.data)
    );
  }
  db.prepare("UPDATE enrollments SET status = 'submitted' WHERE id = ? AND status = 'draft'").run(enrollment.id);

  const row = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow;
  res.json(toApplication(row));
});

// Student signs the application (imitation: timestamps + visual stamp on generated PDFs).
applicationsRouter.post("/:enrollmentId/sign", requireAuth, requireRole("student"), (req, res) => {
  const enrollment = loadEnrollmentForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const row = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow | undefined;
  if (!row) {
    res.status(400).json({ error: "Сначала заполните анкету" });
    return;
  }
  const signedAt = new Date().toISOString();
  db.prepare("UPDATE applications SET signed_at = ? WHERE id = ?").run(signedAt, row.id);
  db.prepare("UPDATE enrollments SET status = 'signed' WHERE id = ?").run(enrollment.id);
  const updated = db.prepare("SELECT * FROM applications WHERE id = ?").get(row.id) as ApplicationRow;
  res.json(toApplication(updated));
});

// Admin countersigns the contract as the executor (imitation).
applicationsRouter.post("/:enrollmentId/sign-executor", requireAuth, requireRole("admin"), (req, res) => {
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.enrollmentId) as
    | EnrollmentRow
    | undefined;
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const row = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow | undefined;
  if (!row || !row.signed_at) {
    res.status(400).json({ error: "Студент ещё не подписал документы" });
    return;
  }
  const signedAt = new Date().toISOString();
  db.prepare("UPDATE applications SET signed_by_executor_at = ? WHERE id = ?").run(signedAt, row.id);
  db.prepare("UPDATE enrollments SET status = 'contract_registered' WHERE id = ?").run(enrollment.id);
  const updated = db.prepare("SELECT * FROM applications WHERE id = ?").get(row.id) as ApplicationRow;
  res.json(toApplication(updated));
});

type DocType = "application" | "contract" | "personal-data";

applicationsRouter.get("/:enrollmentId/documents/:type", requireAuth, async (req, res) => {
  const enrollment = loadEnrollmentForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const appRow = db
    .prepare("SELECT * FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as ApplicationRow | undefined;
  if (!appRow) {
    res.status(404).json({ error: "Анкета ещё не заполнена" });
    return;
  }
  const course = db.prepare("SELECT * FROM courses WHERE id = ?").get(enrollment.course_id) as
    | {
        id: number;
        title: string;
        hours: number;
        duration_from: string;
        duration_to: string;
        description: string;
        created_at: string;
      }
    | undefined;
  if (!course) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  const courseDto: Course = {
    id: course.id,
    title: course.title,
    hours: course.hours,
    durationFrom: course.duration_from,
    durationTo: course.duration_to,
    description: course.description,
    createdAt: course.created_at,
  };
  const form = JSON.parse(appRow.form_json) as ApplicationForm;
  const type = req.params.type as DocType;

  if (type === "application") {
    const pdf = await generateApplicationPdf(form, courseDto, appRow.signed_at);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="zayavlenie.pdf"');
    res.send(Buffer.from(pdf));
    return;
  }
  if (type === "contract") {
    const pdf = await generateContractPdf(
      form,
      courseDto,
      enrollment.contract_number,
      appRow.signed_at,
      appRow.signed_by_executor_at
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dogovor.pdf"');
    res.send(Buffer.from(pdf));
    return;
  }
  if (type === "personal-data") {
    const xlsx = await generatePersonalDataXlsx(form);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="personalnye-dannye.xlsx"');
    res.send(xlsx);
    return;
  }
  res.status(400).json({ error: "Неизвестный тип документа" });
});
