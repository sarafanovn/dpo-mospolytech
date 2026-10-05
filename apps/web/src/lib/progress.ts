import { REQUIRED_DOCUMENT_KINDS, type EnrollmentDetail } from "@meridian/shared";

export interface Step {
  label: string;
  done: boolean;
}

export interface Progress {
  steps: Step[];
  /** Documents in the set that are ready: signed application, executor-signed contract, 3 uploaded files. */
  docsDone: number;
  docsTotal: number;
  percent: number;
  /** Index of the first unfinished step (steps.length when everything is done). */
  currentIndex: number;
}

export function getProgress(e: EnrollmentDetail): Progress {
  const app = e.application;
  const uploaded = REQUIRED_DOCUMENT_KINDS.filter((r) => e.documents.some((d) => d.kind === r.kind)).length;
  const steps: Step[] = [
    { label: "Заявление", done: !!app },
    { label: "Документы", done: uploaded === REQUIRED_DOCUMENT_KINDS.length },
    { label: "Эл. подпись", done: !!app?.signedAt },
    { label: "Договор", done: !!app?.signedByExecutorAt },
    { label: "Зачисление", done: e.status === "approved" || e.status === "completed" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const firstOpen = steps.findIndex((s) => !s.done);
  return {
    steps,
    docsDone: (app?.signedAt ? 1 : 0) + (app?.signedByExecutorAt ? 1 : 0) + uploaded,
    docsTotal: 2 + REQUIRED_DOCUMENT_KINDS.length,
    percent: Math.round((doneCount / steps.length) * 100),
    currentIndex: firstOpen === -1 ? steps.length : firstOpen,
  };
}

/** Name to show for a student in admin tables: the name from the application, else the account name. */
export const studentName = (e: EnrollmentDetail) => e.application?.form.fullName || e.student.fullName;
