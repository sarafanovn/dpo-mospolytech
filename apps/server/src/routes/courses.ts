import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import type { Course } from "@meridian/shared";

export const coursesRouter = Router();

interface CourseRow {
  id: number;
  title: string;
  hours: number;
  duration_from: string;
  duration_to: string;
  description: string;
  created_at: string;
}

function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    hours: row.hours,
    durationFrom: row.duration_from,
    durationTo: row.duration_to,
    description: row.description,
    createdAt: row.created_at,
  };
}

coursesRouter.get("/", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM courses ORDER BY created_at DESC").all() as CourseRow[];
  res.json(rows.map(toCourse));
});

const courseSchema = z.object({
  title: z.string().min(2),
  hours: z.number().int().positive(),
  durationFrom: z.string().min(4),
  durationTo: z.string().min(4),
  description: z.string().default(""),
});

coursesRouter.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const { title, hours, durationFrom, durationTo, description } = parsed.data;
  const info = db
    .prepare(
      "INSERT INTO courses (title, hours, duration_from, duration_to, description) VALUES (?, ?, ?, ?, ?)"
    )
    .run(title, hours, durationFrom, durationTo, description);
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(info.lastInsertRowid) as CourseRow;
  res.status(201).json(toCourse(row));
});

coursesRouter.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = courseSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const existing = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id) as
    | CourseRow
    | undefined;
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
  };
  db.prepare(
    "UPDATE courses SET title = ?, hours = ?, duration_from = ?, duration_to = ?, description = ? WHERE id = ?"
  ).run(next.title, next.hours, next.durationFrom, next.durationTo, next.description, req.params.id);
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(req.params.id) as CourseRow;
  res.json(toCourse(row));
});

coursesRouter.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM courses WHERE id = ?").run(req.params.id);
  res.status(204).end();
});
