import type { EnrollmentStatus } from "@meridian/shared";

const LABELS: Record<EnrollmentStatus, { label: string; className: string }> = {
  draft: { label: "Черновик", className: "badge-neutral" },
  submitted: { label: "Анкета подана", className: "badge-blue" },
  signed: { label: "Подписано студентом", className: "badge-violet" },
  contract_registered: { label: "Договор оформлен", className: "badge-violet" },
  approved: { label: "Зачислен", className: "badge-crimson" },
  completed: { label: "Обучение завершено", className: "badge-crimson" },
};

export function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const meta = LABELS[status];
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
