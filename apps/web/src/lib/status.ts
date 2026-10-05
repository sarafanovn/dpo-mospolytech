import type { EnrollmentStatus } from "@meridian/shared";

export type Tone = "gray" | "amber" | "violet" | "blue" | "green" | "red" | "dark";

export const STATUS_META: Record<EnrollmentStatus, { label: string; tone: Tone }> = {
  draft: { label: "Черновик", tone: "gray" },
  submitted: { label: "Заявление заполнено", tone: "amber" },
  signed: { label: "Подписано обучающимся", tone: "violet" },
  contract_registered: { label: "Подписан исполнителем", tone: "blue" },
  approved: { label: "Зачислен", tone: "green" },
  completed: { label: "Обучение завершено", tone: "dark" },
};
