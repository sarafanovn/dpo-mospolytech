import { Router } from "express";
import { z } from "zod";
import { TEMPLATE_TITLES, type ApplicationForm, type Course, type DocumentTemplate, type TemplateType } from "@meridian/shared";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";
import { DEFAULT_TEMPLATES } from "../documents/defaultTemplates.js";
import { renderTemplatePdf, type PdfStamp } from "../documents/templatePdf.js";
import { buildValues } from "../documents/values.js";

export const templatesRouter = Router();
templatesRouter.use(requireAuth, requireRole("admin"));

const TYPES = Object.keys(TEMPLATE_TITLES) as TemplateType[];

interface TemplateRow {
  type: TemplateType;
  content: string;
  file_name: string | null;
  updated_at: string;
}

function load(type: TemplateType): DocumentTemplate {
  const row = db.prepare("SELECT * FROM templates WHERE type = ?").get(type) as TemplateRow | undefined;
  return row
    ? { type, content: row.content, fileName: row.file_name, updatedAt: row.updated_at, isDefault: false }
    : { type, content: DEFAULT_TEMPLATES[type], fileName: null, updatedAt: null, isDefault: true };
}

templatesRouter.get("/", (_req, res) => {
  res.json(TYPES.map(load));
});

const putSchema = z.object({
  content: z.string().trim().min(10, "Шаблон слишком короткий").max(50_000),
  fileName: z.string().max(200).nullable().optional(),
});

templatesRouter.put("/:type", (req, res) => {
  const type = req.params.type as TemplateType;
  if (!TYPES.includes(type)) {
    res.status(404).json({ error: "Неизвестный шаблон" });
    return;
  }
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Некорректные данные" });
    return;
  }
  db.prepare(
    `INSERT INTO templates (type, content, file_name, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(type) DO UPDATE SET content = excluded.content, file_name = excluded.file_name, updated_at = excluded.updated_at`
  ).run(type, parsed.data.content, parsed.data.fileName ?? null);
  res.json(load(type));
});

// Back to the built-in template.
templatesRouter.delete("/:type", (req, res) => {
  const type = req.params.type as TemplateType;
  if (!TYPES.includes(type)) {
    res.status(404).json({ error: "Неизвестный шаблон" });
    return;
  }
  db.prepare("DELETE FROM templates WHERE type = ?").run(type);
  res.json(load(type));
});

const SAMPLE_FORM: ApplicationForm = {
  fullName: "Иванов Иван Иванович",
  phone: "+7 900 123-45-67",
  email: "ivanov@example.com",
  birthDate: "1990-05-18",
  branch: "Коломенский институт (филиал)",
  passport: "4523 123456",
  passportIssuedBy: "ГУ МВД, 11.11.2012, 555-555",
  addressRegistration: "г. Москва, ул. Прянишникова, д. 2А",
  addressResidence: "г. Москва, ул. Прянишникова, д. 2А",
  education: "МГТУ, 2012, инженер",
  snils: "123-456-789 00",
  inn: "123456789012",
  educationLevel: "Высшее образование",
  workerCategory: "работники предприятий и организаций",
  positionCategory: "специалисты",
  industry: "образование",
  workExperience: "8 лет",
};

const SAMPLE_COURSE: Course = {
  id: 0,
  title: "Современная веб-разработка",
  hours: 72,
  durationFrom: "2026-10-01",
  durationTo: "2026-11-30",
  description: "",
  studyForm: "очно-заочная",
  sdoUrl: "",
  createdAt: "",
};

templatesRouter.get("/:type/preview", async (req, res) => {
  const type = req.params.type as TemplateType;
  if (!TYPES.includes(type)) {
    res.status(404).json({ error: "Неизвестный шаблон" });
    return;
  }
  const now = new Date().toISOString();
  const stamps: PdfStamp[] =
    type === "application"
      ? [{ title: "Обучающийся", name: SAMPLE_FORM.fullName, signedAt: now, side: "left" }]
      : type === "contract"
        ? [
            { title: `Заказчик: ${SAMPLE_FORM.fullName}`, name: SAMPLE_FORM.fullName, signedAt: now, side: "left" },
            { title: "Исполнитель: Московский Политех", name: "Московский Политех", signedAt: now, side: "right" },
          ]
        : [];
  const pdf = await renderTemplatePdf(
    load(type).content,
    buildValues(SAMPLE_FORM, SAMPLE_COURSE, {
      contractNumber: "ДПО-2026-0001",
      documentNumber: type === "certificate" ? "CERT-2026-0001" : "REF-2026-0001",
      signedAt: now,
    }),
    stamps,
    `preview|${type}`
  );
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="preview-${type}.pdf"`);
  res.send(Buffer.from(pdf));
});
