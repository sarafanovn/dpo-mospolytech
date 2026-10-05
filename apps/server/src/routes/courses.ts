import { Router } from "express";
import { z } from "zod";
import { STUDY_FORMS } from "@meridian/shared";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { toCourse, type CourseRow } from "../serialize.js";

export const coursesRouter = Router();

coursesRouter.get("/", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM courses ORDER BY created_at DESC, id DESC").all() as CourseRow[];
  res.json(rows.map(toCourse));
});

const courseSchema = z.object({
  title: z.string().min(2),
  hours: z.number().int().positive(),
  durationFrom: z.string().min(4),
  durationTo: z.string().min(4),
  description: z.string().default(""),
  studyForm: z.enum(STUDY_FORMS).default("очно-заочная"),
  sdoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Ссылка должна начинаться с http:// или https://")
    .default(""),
});

coursesRouter.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const { title, hours, durationFrom, durationTo, description, studyForm, sdoUrl } = parsed.data;
  const info = db
    .prepare(
      "INSERT INTO courses (title, hours, duration_from, duration_to, description, study_form, sdo_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(title, hours, durationFrom, durationTo, description, studyForm, sdoUrl);
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(info.lastInsertRowid) as CourseRow;
  res.status(201).json(toCourse(row));
});

coursesRouter.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id) as CourseRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Курс не найден" });
    return;
  }
  const next = {
    title: parsed.data.title ?? existing.title,
    hours: parsed.data.hours ?? existing.hours,
    durationFrom: parsed.data.durationFrom ?? existing.duration_from,
    durationTo: parsed.data.durationTo ?? existing.duration_to,
    description: parsed.data.description ?? existing.description,
    studyForm: parsed.data.studyForm ?? existing.study_form,
    sdoUrl: parsed.data.sdoUrl ?? existing.sdo_url,
  };
  db.prepare(
    "UPDATE courses SET title = ?, hours = ?, duration_from = ?, duration_to = ?, description = ?, study_form = ?, sdo_url = ? WHERE id = ?"
  ).run(next.title, next.hours, next.durationFrom, next.durationTo, next.description, next.studyForm, next.sdoUrl, req.params.id);
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id) as CourseRow;
  res.json(toCourse(row));
});

coursesRouter.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const used = db.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?").get(req.params.id) as { n: number };
  if (used.n > 0) {
    res.status(409).json({ error: `На курс записано обучающихся: ${used.n}. Удаление невозможно.` });
    return;
  }
  db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  res.status(204).end();
});
