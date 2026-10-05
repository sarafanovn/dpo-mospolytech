import { Router } from "express";
import { z } from "zod";
import type { BatchResult } from "@meridian/shared";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { renderCertificate } from "../documents/render.js";
import { loadEnrollmentDetails, toCertificate, type CertificateRow } from "../serialize.js";

export const certificatesRouter = Router();

const batchSchema = z.object({
  enrollmentIds: z.array(z.number().int().positive()).min(1),
  type: z.enum(["reference", "certificate"]),
});

function nextNumber(type: "reference" | "certificate"): string {
  const year = new Date().getFullYear();
  const prefix = `${type === "certificate" ? "CERT" : "REF"}-${year}-`;
  const last = db
    .prepare("SELECT number FROM certificates WHERE number LIKE ? ORDER BY number DESC LIMIT 1")
    .get(`${prefix}%`) as { number: string } | undefined;
  const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// Issue the document for every selected student of a programme in one go, using the uploaded template.
certificatesRouter.post("/batch", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Не выбрано ни одного обучающегося" });
    return;
  }
  const { enrollmentIds, type } = parsed.data;
  const result: BatchResult = { updated: [], skipped: [] };
  db.transaction(() => {
    for (const id of enrollmentIds) {
      const [detail] = loadEnrollmentDetails({ id });
      if (!detail) {
        result.skipped.push({ id, reason: "Запись не найдена" });
      } else if (!detail.application) {
        result.skipped.push({ id, reason: "Нет заполненного заявления" });
      } else if (detail.certificates.some((c) => c.type === type)) {
        result.skipped.push({ id, reason: "Документ уже выдан" });
      } else {
        db.prepare("INSERT INTO certificates (enrollment_id, type, number) VALUES (?, ?, ?)").run(id, type, nextNumber(type));
        result.updated.push(id);
      }
    }
  })();
  res.status(201).json(result);
});

certificatesRouter.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM certificates WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

certificatesRouter.get("/:id/download", requireAuth, async (req, res) => {
  const row = db.prepare("SELECT * FROM certificates WHERE id = ?").get(req.params.id) as CertificateRow | undefined;
  if (!row) {
    res.status(404).json({ error: "Документ не найден" });
    return;
  }
  const [detail] = loadEnrollmentDetails({ id: row.enrollment_id });
  if (!detail || (req.session!.role !== "admin" && detail.userId !== req.session!.userId)) {
    res.status(404).json({ error: "Документ не найден" });
    return;
  }
  const pdf = await renderCertificate(detail, toCertificate(row));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${row.type === "certificate" ? "sertifikat" : "spravka"}.pdf"`);
  res.send(Buffer.from(pdf));
});
