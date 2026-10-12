import { formatIsoDate, type ApplicationForm, type Course } from "@meridian/shared";
import { db } from "../db.js";
import { DEFAULT_TEMPLATES } from "./defaultTemplates.js";
import type { TemplateType } from "@meridian/shared";

function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Moscow" });
}

const MONTHS_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «12» октября 2026 г. — the way a contract date is written; a blank to fill in by hand when unknown. */
function formatContractDate(iso: string | null | undefined): string {
  if (!iso) return "«___» ____________ 20__ г.";
  const parts = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "numeric", year: "numeric", timeZone: "Europe/Moscow" }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `«${get("day")}» ${MONTHS_GENITIVE[Number(get("month")) - 1]} ${get("year")} г.`;
}

/** "очно-заочная" -> "очно-заочной": the word after "по … форме обучения". */
const studyFormGenitive = (form: string) => form.replace(/ая$/, "ой");

/** Supplementary programmes: 16+ hours is professional development, 250+ hours is retraining (Приказ Минобрнауки № 499). */
const programKind = (hours: number) => (hours >= 250 ? "профессиональной переподготовки" : "повышения квалификации");

// Values end up inside a layout template: a stray line break or markup token must not change its structure.
const plain = (value: string) => value.replace(/\s+/g, " ").replace(/\*\*/g, "").trim();

export function buildValues(
  form: ApplicationForm,
  course: Course,
  extra: {
    contractNumber?: string | null;
    contractDate?: string | null;
    documentNumber?: string;
    signedAt?: string | null;
    issuedAt?: string;
  } = {}
): Record<string, string> {
  const values: Record<string, string> = {
    ...form,
    birthDate: form.birthDate ? formatIsoDate(form.birthDate) : "",
    courseTitle: course.title,
    courseHours: String(course.hours),
    studyForm: course.studyForm,
    studyFormGen: studyFormGenitive(course.studyForm),
    programKind: programKind(course.hours),
    dateFrom: formatIsoDate(course.durationFrom),
    dateTo: formatIsoDate(course.durationTo),
    contractNumber: extra.contractNumber ?? "не присвоен",
    contractDate: formatContractDate(extra.contractDate),
    documentNumber: extra.documentNumber ?? "",
    signDate: extra.signedAt ? formatDay(extra.signedAt) : "не подписано",
    today: formatDay(extra.issuedAt ?? new Date().toISOString()),
  };
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, plain(value)]));
}

export function getTemplateContent(type: TemplateType): string {
  const row = db.prepare("SELECT content FROM templates WHERE type = ?").get(type) as { content: string } | undefined;
  return row?.content ?? DEFAULT_TEMPLATES[type];
}
