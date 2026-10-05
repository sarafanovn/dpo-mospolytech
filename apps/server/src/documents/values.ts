import { formatIsoDate, type ApplicationForm, type Course } from "@meridian/shared";
import { db } from "../db.js";
import { DEFAULT_TEMPLATES } from "./defaultTemplates.js";
import type { TemplateType } from "@meridian/shared";

function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Moscow" });
}

export function buildValues(
  form: ApplicationForm,
  course: Course,
  extra: { contractNumber?: string | null; documentNumber?: string; signedAt?: string | null; issuedAt?: string } = {}
): Record<string, string> {
  return {
    ...form,
    birthDate: form.birthDate ? formatIsoDate(form.birthDate) : "",
    courseTitle: course.title,
    courseHours: String(course.hours),
    studyForm: course.studyForm,
    dateFrom: formatIsoDate(course.durationFrom),
    dateTo: formatIsoDate(course.durationTo),
    contractNumber: extra.contractNumber ?? "не присвоен",
    documentNumber: extra.documentNumber ?? "",
    signDate: extra.signedAt ? formatDay(extra.signedAt) : "не подписано",
    today: formatDay(extra.issuedAt ?? new Date().toISOString()),
  };
}

export function getTemplateContent(type: TemplateType): string {
  const row = db.prepare("SELECT content FROM templates WHERE type = ?").get(type) as { content: string } | undefined;
  return row?.content ?? DEFAULT_TEMPLATES[type];
}
