import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import type { Enrollment, EnrollmentStatus } from "@meridian/shared";

export const enrollmentsRouter = Router();

interface EnrollmentRow {
  id: number;
  user_id: number;
  course_id: number;
  status: EnrollmentStatus;
  contract_number: string | null;
  intermediate_attestation: string | null;
  final_attestation: string | null;
  created_at: string;
}

function toEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    status: row.status,
    contractNumber: row.contract_number,
    intermediateAttestation: row.intermediate_attestation,
    finalAttestation: row.final_attestation,
    createdAt: row.created_at,
  };
}

// Students see their own enrollments; admins see all.
enrollmentsRouter.get("/", requireAuth, (req, res) => {
  const rows =
    req.session!.role === "admin"
      ? (db.prepare("SELECT * FROM enrollments ORDER BY created_at DESC").all() as EnrollmentRow[])
      : (db
          .prepare("SELECT * FROM enrollments WHERE user_id = ? ORDER BY created_at DESC")
          .all(req.session!.userId) as EnrollmentRow[]);
  res.json(rows.map(toEnrollment));
});

enrollmentsRouter.get("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.id) as
    | EnrollmentRow
    | undefined;
  if (!row) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  if (req.session!.role !== "admin" && row.user_id !== req.session!.userId) {
    res.status(403).json({ error: "Недостаточно прав" });
    return;
  }
  res.json(toEnrollment(row));
});

const createSchema = z.object({ courseId: z.number().int().positive() });

enrollmentsRouter.post("/", requireAuth, requireRole("student"), (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const course = db.prepare("SELECT id FROM courses WHERE id = ?").get(parsed.data.courseId);
  if (!course) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  const info = db
    .prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'draft')")
    .run(req.session!.userId, parsed.data.courseId);
  const row = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(info.lastInsertRowid) as EnrollmentRow;
  res.status(201).json(toEnrollment(row));
});

const patchSchema = z.object({
  status: z
    .enum(["draft", "submitted", "signed", "contract_registered", "approved", "completed"])
    .optional(),
  contractNumber: z.string().optional(),
  intermediateAttestation: z.string().optional(),
  finalAttestation: z.string().optional(),
});

enrollmentsRouter.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const existing = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.id) as
    | EnrollmentRow
    | undefined;
  if (!existing) {
    res.status(404).json({ error: "Заявка не найдена" });
    return;
  }
  const next = {
    status: parsed.data.status ?? existing.status,
    contractNumber: parsed.data.contractNumber ?? existing.contract_number,
    intermediateAttestation: parsed.data.intermediateAttestation ?? existing.intermediate_attestation,
    finalAttestation: parsed.data.finalAttestation ?? existing.final_attestation,
  };
  db.prepare(
    "UPDATE enrollments SET status = ?, contract_number = ?, intermediate_attestation = ?, final_attestation = ? WHERE id = ?"
  ).run(next.status, next.contractNumber, next.intermediateAttestation, next.finalAttestation, req.params.id);
  const row = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.id) as EnrollmentRow;
  res.json(toEnrollment(row));
});
