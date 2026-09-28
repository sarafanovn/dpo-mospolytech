import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import type { ApplicationForm, Certificate, CertificateType, Course } from "@meridian/shared";
import { generateCertificatePdf } from "../documents/certificatePdf.js";

export const certificatesRouter = Router();

interface CertificateRow {
  id: number;
  enrollment_id: number;
  type: CertificateType;
  issued_at: string;
}

function toCertificate(row: CertificateRow): Certificate {
  return { id: row.id, enrollmentId: row.enrollment_id, type: row.type, issuedAt: row.issued_at };
}

certificatesRouter.get("/enrollment/:enrollmentId", requireAuth, (req, res) => {
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.enrollmentId) as
    | { id: number; user_id: number }
    | undefined;
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  if (req.session!.role !== "admin" && enrollment.user_id !== req.session!.userId) {
    res.status(403).json({ error: "Недостаточно прав" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM certificates WHERE enrollment_id = ? ORDER BY issued_at DESC")
    .all(enrollment.id) as CertificateRow[];
  res.json(rows.map(toCertificate));
});

const createSchema = z.object({
  enrollmentId: z.number().int().positive(),
  type: z.enum(["reference", "certificate"]),
});

certificatesRouter.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(parsed.data.enrollmentId);
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const info = db
    .prepare("INSERT INTO certificates (enrollment_id, type) VALUES (?, ?)")
    .run(parsed.data.enrollmentId, parsed.data.type);
  const row = db.prepare("SELECT * FROM certificates WHERE id = ?").get(info.lastInsertRowid) as CertificateRow;
  res.status(201).json(toCertificate(row));
});

certificatesRouter.get("/:id/download", requireAuth, async (req, res) => {
  const row = db.prepare("SELECT * FROM certificates WHERE id = ?").get(req.params.id) as
    | CertificateRow
    | undefined;
  if (!row) {
    res.status(404).json({ error: "Документ не найден" });
    return;
  }
  const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(row.enrollment_id) as
    | { id: number; user_id: number; course_id: number }
    | undefined;
  if (!enrollment) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  if (req.session!.role !== "admin" && enrollment.user_id !== req.session!.userId) {
    res.status(403).json({ error: "Недостаточно прав" });
    return;
  }
  const appRow = db
    .prepare("SELECT form_json FROM applications WHERE enrollment_id = ?")
    .get(enrollment.id) as { form_json: string } | undefined;
  const courseRow = db.prepare("SELECT * FROM courses WHERE id = ?").get(enrollment.course_id) as
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
  if (!appRow || !courseRow) {
    res.status(404).json({ error: "Недостаточно данных для формирования документа" });
    return;
  }
  const form = JSON.parse(appRow.form_json) as ApplicationForm;
  const course: Course = {
    id: courseRow.id,
    title: courseRow.title,
    hours: courseRow.hours,
    durationFrom: courseRow.duration_from,
    durationTo: courseRow.duration_to,
    description: courseRow.description,
    createdAt: courseRow.created_at,
  };
  const pdf = await generateCertificatePdf(row.type, form, course, row.issued_at);
  res.setHeader("Content-Type", "application/pdf");
  const filename = row.type === "certificate" ? "sertifikat.pdf" : "spravka.pdf";
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
  res.send(Buffer.from(pdf));
});
