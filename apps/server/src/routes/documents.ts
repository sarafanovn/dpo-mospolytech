import express, { Router } from "express";
import { MAX_DOCUMENT_BYTES, type DocumentKind, type EnrollmentDocument } from "@meridian/shared";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const documentsRouter = Router();

const KINDS: DocumentKind[] = ["passport", "inn", "education", "other"];
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];

interface DocumentFullRow {
  id: number;
  enrollment_id: number;
  kind: DocumentKind;
  file_name: string;
  mime: string;
  size: number;
  data: Buffer;
  uploaded_at: string;
  user_id: number;
}

function canAccess(enrollmentId: number | string, req: express.Request): boolean {
  const row = db.prepare("SELECT user_id FROM enrollments WHERE id = ?").get(enrollmentId) as { user_id: number } | undefined;
  if (!row) return false;
  return req.session!.role === "admin" || row.user_id === req.session!.userId;
}

// Body is the raw file; metadata travels in the query string and Content-Type header.
documentsRouter.post(
  "/enrollment/:enrollmentId",
  requireAuth,
  requireRole("student"),
  express.raw({ type: () => true, limit: MAX_DOCUMENT_BYTES + 1024 }),
  (req, res) => {
    if (!canAccess(req.params.enrollmentId, req)) {
      res.status(404).json({ error: "Запись не найдена" });
      return;
    }
    const kind = String(req.query.kind ?? "") as DocumentKind;
    if (!KINDS.includes(kind)) {
      res.status(400).json({ error: "Неизвестный тип документа" });
      return;
    }
    const fileName = String(req.query.fileName ?? "").trim().slice(0, 200);
    const mime = String(req.headers["content-type"] ?? "").split(";")[0].trim();
    const body = req.body as Buffer;
    if (!fileName || !Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Файл не получен" });
      return;
    }
    if (!ALLOWED_MIME.includes(mime)) {
      res.status(415).json({ error: "Допустимы файлы PDF, JPG и PNG" });
      return;
    }
    if (body.length > MAX_DOCUMENT_BYTES) {
      res.status(413).json({ error: "Файл больше 10 МБ" });
      return;
    }

    const insert = db.transaction(() => {
      // Passport / INN / education are single slots: a new upload replaces the old file.
      if (kind !== "other") {
        db.prepare("DELETE FROM documents WHERE enrollment_id = ? AND kind = ?").run(req.params.enrollmentId, kind);
      }
      return db
        .prepare("INSERT INTO documents (enrollment_id, kind, file_name, mime, size, data) VALUES (?, ?, ?, ?, ?, ?)")
        .run(req.params.enrollmentId, kind, fileName, mime, body.length, body);
    });
    const info = insert();
    const row = db
      .prepare("SELECT id, enrollment_id, kind, file_name, mime, size, uploaded_at FROM documents WHERE id = ?")
      .get(info.lastInsertRowid) as {
      id: number;
      enrollment_id: number;
      kind: DocumentKind;
      file_name: string;
      mime: string;
      size: number;
      uploaded_at: string;
    };
    const doc: EnrollmentDocument = {
      id: row.id,
      enrollmentId: row.enrollment_id,
      kind: row.kind,
      fileName: row.file_name,
      mime: row.mime,
      size: row.size,
      uploadedAt: row.uploaded_at,
    };
    res.status(201).json(doc);
  }
);

documentsRouter.get("/:id/download", requireAuth, (req, res) => {
  const row = db
    .prepare(
      "SELECT d.*, e.user_id FROM documents d JOIN enrollments e ON e.id = d.enrollment_id WHERE d.id = ?"
    )
    .get(req.params.id) as DocumentFullRow | undefined;
  if (!row || (req.session!.role !== "admin" && row.user_id !== req.session!.userId)) {
    res.status(404).json({ error: "Файл не найден" });
    return;
  }
  res.setHeader("Content-Type", row.mime);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`);
  res.send(row.data);
});

documentsRouter.delete("/:id", requireAuth, requireRole("student"), (req, res) => {
  const row = db
    .prepare("SELECT d.id, e.user_id FROM documents d JOIN enrollments e ON e.id = d.enrollment_id WHERE d.id = ?")
    .get(req.params.id) as { id: number; user_id: number } | undefined;
  if (!row || row.user_id !== req.session!.userId) {
    res.status(404).json({ error: "Файл не найден" });
    return;
  }
  db.prepare("DELETE FROM documents WHERE id = ?").run(row.id);
  res.status(204).end();
});
