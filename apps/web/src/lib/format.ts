import { formatIsoDate } from "@meridian/shared";

export const fmtDate = (iso: string | null | undefined) => (iso ? formatIsoDate(iso.slice(0, 10)) : "—");

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso.replace(" ", "T") + (iso.includes("T") ? "" : "Z")))
    : "—";

export const fmtSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`);

/** "Фамилия Имя Отчество" -> "Имя" (falls back to whatever was entered). */
export const firstName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts[1] ?? parts[0] ?? "";
};

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
