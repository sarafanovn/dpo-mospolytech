import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { generatePersonalDataXlsx } from "../documents/personalDataXlsx.js";
import { renderApplication, renderContract } from "../documents/render.js";
import { loadEnrollmentDetails, toApplication, type ApplicationRow } from "../serialize.js";

export const applicationsRouter = Router();

function loadForAccess(enrollmentId: string, userId: number, role: string) {
  const [detail] = loadEnrollmentDetails({ id: Number(enrollmentId) });
  if (!detail) return null;
  if (role !== "admin" && detail.userId !== userId) return null;
  return detail;
}

const formSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  birthDate: z.string().min(1),
  branch: z.string().min(1),
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
  workExperience: z.string().min(1),
});

applicationsRouter.get("/:enrollmentId", requireAuth, (req, res) => {
  const detail = loadForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!detail) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  if (!detail.application) {
    res.status(404).json({ error: "Заявление ещё не заполнено" });
    return;
  }
  res.json(detail.application);
});

// Save the application form. Editing a signed application revokes the student's signature,
// because the signature covered the previous content.
applicationsRouter.put("/:enrollmentId", requireAuth, requireRole("student"), (req, res) => {
  const detail = loadForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!detail) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  const parsed = formSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Заполните все поля заявления", details: parsed.error.flatten() });
    return;
  }
  if (detail.application?.signedByExecutorAt) {
    res.status(409).json({ error: "Договор уже подписан исполнителем — данные изменить нельзя" });
    return;
  }

  const json = JSON.stringify(parsed.data);
  if (detail.application) {
    const changed = JSON.stringify(detail.application.form) !== json;
    if (changed) {
      db.prepare("UPDATE applications SET form_json = ?, signed_at = NULL WHERE id = ?").run(json, detail.application.id);
      db.prepare("UPDATE enrollments SET status = 'submitted' WHERE id = ? AND status IN ('signed', 'draft')").run(detail.id);
    }
  } else {
    db.prepare("INSERT INTO applications (enrollment_id, form_json) VALUES (?, ?)").run(detail.id, json);
  }
  db.prepare("UPDATE enrollments SET status = 'submitted' WHERE id = ? AND status = 'draft'").run(detail.id);

  const row = db.prepare("SELECT * FROM applications WHERE enrollment_id = ?").get(detail.id) as ApplicationRow;
  res.json(toApplication(row));
});

// Student signs the application with the electronic signature (timestamp + stamp on the generated PDF).
applicationsRouter.post("/:enrollmentId/sign", requireAuth, requireRole("student"), (req, res) => {
  const detail = loadForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!detail) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  if (!detail.application) {
    res.status(400).json({ error: "Сначала заполните заявление" });
    return;
  }
  if (!detail.application.signedAt) {
    db.prepare("UPDATE applications SET signed_at = ? WHERE id = ?").run(new Date().toISOString(), detail.application.id);
    db.prepare("UPDATE enrollments SET status = 'signed' WHERE id = ? AND status IN ('draft', 'submitted')").run(detail.id);
  }
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(detail.application.id) as ApplicationRow;
  res.json(toApplication(row));
});

type DocType = "application" | "contract" | "personal-data";

applicationsRouter.get("/:enrollmentId/documents/:type", requireAuth, async (req, res) => {
  const detail = loadForAccess(req.params.enrollmentId, req.session!.userId, req.session!.role);
  if (!detail) {
    res.status(404).json({ error: "Запись не найдена" });
    return;
  }
  if (!detail.application) {
    res.status(404).json({ error: "Заявление ещё не заполнено" });
    return;
  }
  const type = req.params.type as DocType;
  const isAdmin = req.session!.role === "admin";

  if (type === "application") {
    const pdf = await renderApplication(detail);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="zayavlenie.pdf"');
    res.send(Buffer.from(pdf));
    return;
  }
  if (type === "contract") {
    // The student only gets the contract once the executor has signed it; unsigning withdraws it again.
    if (!isAdmin && !detail.application.signedByExecutorAt) {
      res.status(404).json({ error: "Договор ещё не подписан исполнителем" });
      return;
    }
    const pdf = await renderContract(detail);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="dogovor.pdf"');
    res.send(Buffer.from(pdf));
    return;
  }
  if (type === "personal-data") {
    if (!isAdmin) {
      res.status(403).json({ error: "Недостаточно прав" });
      return;
    }
    const xlsx = await generatePersonalDataXlsx(detail.application.form);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="personalnye-dannye.xlsx"');
    res.send(xlsx);
    return;
  }
  res.status(400).json({ error: "Неизвестный тип документа" });
});
