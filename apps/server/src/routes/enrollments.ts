import { Router } from "express";
import { z } from "zod";
import type { BatchResult } from "@meridian/shared";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { loadEnrollmentDetails, toEnrollment, type ApplicationRow, type EnrollmentRow } from "../serialize.js";

export const enrollmentsRouter = Router();

// Students see their own enrollments; admins see all.
enrollmentsRouter.get("/", requireAuth, (req, res) => {
  const filter = req.session!.role === "admin" ? {} : { userId: req.session!.userId };
  res.json(loadEnrollmentDetails(filter));
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
  const duplicate = db
    .prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?")
    .get(req.session!.userId, parsed.data.courseId);
  if (duplicate) {
    res.status(409).json({ error: "Вы уже записаны на эту программу" });
    return;
  }
  const info = db
    .prepare("INSERT INTO enrollments (user_id, course_id, status) VALUES (?, ?, 'draft')")
    .run(req.session!.userId, parsed.data.courseId);
  res.status(201).json(loadEnrollmentDetails({ id: Number(info.lastInsertRowid) })[0]);
});

// ---- Batch operations on contracts (declared before "/:id" routes) ----

const idsSchema = z.object({ enrollmentIds: z.array(z.number().int().positive()).min(1) });

function nextContractNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `ДПО-${year}-`;
  const last = db
    .prepare("SELECT contract_number FROM enrollments WHERE contract_number LIKE ? ORDER BY contract_number DESC LIMIT 1")
    .get(`${prefix}%`) as { contract_number: string } | undefined;
  const seq = last ? Number(last.contract_number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

function assignContractNumber(enrollmentId: number) {
  db.prepare("UPDATE enrollments SET contract_number = ?, contract_registered_at = ? WHERE id = ?").run(
    nextContractNumber(),
    new Date().toISOString(),
    enrollmentId
  );
}

function runBatch(
  ids: number[],
  action: (enrollment: EnrollmentRow, application: ApplicationRow | undefined) => string | null
): BatchResult {
  const result: BatchResult = { updated: [], skipped: [] };
  db.transaction(() => {
    for (const id of ids) {
      const enrollment = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(id) as EnrollmentRow | undefined;
      if (!enrollment) {
        result.skipped.push({ id, reason: "Запись не найдена" });
        continue;
      }
      const application = db.prepare("SELECT * FROM applications WHERE enrollment_id = ?").get(id) as
        | ApplicationRow
        | undefined;
      const reason = action(enrollment, application);
      if (reason) result.skipped.push({ id, reason });
      else result.updated.push(id);
    }
  })();
  return result;
}

// Register contract numbers for several students at once (same programme).
enrollmentsRouter.post("/contracts/register", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Не выбрано ни одной записи" });
    return;
  }
  res.json(
    runBatch(parsed.data.enrollmentIds, (enrollment, application) => {
      if (!application?.signed_at) return "Обучающийся ещё не подписал заявление";
      if (enrollment.contract_number) return "Договор уже зарегистрирован";
      assignContractNumber(enrollment.id);
      return null;
    })
  );
});

// Sign contracts as the executor. Missing contract numbers are assigned automatically.
enrollmentsRouter.post("/contracts/sign", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Не выбрано ни одной записи" });
    return;
  }
  const signedAt = new Date().toISOString();
  res.json(
    runBatch(parsed.data.enrollmentIds, (enrollment, application) => {
      if (!application?.signed_at) return "Обучающийся ещё не подписал заявление";
      if (application.signed_by_executor_at) return "Договор уже подписан";
      if (!enrollment.contract_number) {
        assignContractNumber(enrollment.id);
      }
      db.prepare("UPDATE applications SET signed_by_executor_at = ? WHERE id = ?").run(signedAt, application.id);
      if (enrollment.status === "signed") {
        db.prepare("UPDATE enrollments SET status = 'contract_registered' WHERE id = ?").run(enrollment.id);
      }
      return null;
    })
  );
});

// Revoke the executor's signature: the student's copy of the contract disappears until it is signed again.
enrollmentsRouter.post("/contracts/unsign", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = idsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Не выбрано ни одной записи" });
    return;
  }
  res.json(
    runBatch(parsed.data.enrollmentIds, (enrollment, application) => {
      if (!application?.signed_by_executor_at) return "Договор не был подписан";
      db.prepare("UPDATE applications SET signed_by_executor_at = NULL WHERE id = ?").run(application.id);
      if (enrollment.status === "contract_registered") {
        db.prepare("UPDATE enrollments SET status = 'signed' WHERE id = ?").run(enrollment.id);
      }
      return null;
    })
  );
});

// Gradebook (ведомость): practice / intermediate / final grades for many students at once.
const gradesSchema = z.object({
  grades: z
    .array(
      z.object({
        id: z.number().int().positive(),
        gradePractice: z.string().max(40),
        gradeIntermediate: z.string().max(40),
        gradeFinal: z.string().max(40),
      })
    )
    .min(1),
});

enrollmentsRouter.put("/grades", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = gradesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const update = db.prepare(
    "UPDATE enrollments SET grade_practice = ?, grade_intermediate = ?, grade_final = ? WHERE id = ?"
  );
  db.transaction(() => {
    for (const g of parsed.data.grades) {
      update.run(g.gradePractice.trim() || null, g.gradeIntermediate.trim() || null, g.gradeFinal.trim() || null, g.id);
    }
  })();
  res.status(204).end();
});

// ---- Single enrollment ----

enrollmentsRouter.get("/:id", requireAuth, (req, res) => {
  const [detail] = loadEnrollmentDetails({ id: Number(req.params.id) });
  if (!detail || (req.session!.role !== "admin" && detail.userId !== req.session!.userId)) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  res.json(detail);
});

const patchSchema = z.object({
  status: z.enum(["draft", "submitted", "signed", "contract_registered", "approved", "completed"]).optional(),
  contractNumber: z.string().optional(),
});

enrollmentsRouter.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const existing = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.id) as EnrollmentRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  const contractNumber = parsed.data.contractNumber ?? existing.contract_number;
  db.prepare("UPDATE enrollments SET status = ?, contract_number = ?, contract_registered_at = ? WHERE id = ?").run(
    parsed.data.status ?? existing.status,
    contractNumber,
    contractNumber ? (existing.contract_registered_at ?? new Date().toISOString()) : null,
    req.params.id
  );
  const row = db.prepare("SELECT * FROM enrollments WHERE id = ?").get(req.params.id) as EnrollmentRow;
  res.json(toEnrollment(row));
});

// A student can withdraw from a programme until the executor has signed the contract.
enrollmentsRouter.delete("/:id", requireAuth, requireRole("student"), (req, res) => {
  const existing = db
    .prepare("SELECT * FROM enrollments WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session!.userId) as EnrollmentRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  const application = db.prepare("SELECT * FROM applications WHERE enrollment_id = ?").get(existing.id) as
    | ApplicationRow
    | undefined;
  if (application?.signed_by_executor_at || existing.status === "approved" || existing.status === "completed") {
    res.status(409).json({ error: "Договор уже подписан исполнителем — отказаться от программы можно только через администратора" });
    return;
  }
  db.transaction(() => {
    db.prepare("DELETE FROM documents WHERE enrollment_id = ?").run(existing.id);
    db.prepare("DELETE FROM certificates WHERE enrollment_id = ?").run(existing.id);
    db.prepare("DELETE FROM applications WHERE enrollment_id = ?").run(existing.id);
    db.prepare("DELETE FROM enrollments WHERE id = ?").run(existing.id);
  })();
  res.status(204).end();
});
