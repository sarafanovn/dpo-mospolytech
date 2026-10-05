import type { EnrollmentStatus } from "@meridian/shared";
import { STATUS_META } from "../lib/status";

export function StatusBadge({ status }: { status: EnrollmentStatus }) {
  const meta = STATUS_META[status];
  return <span className={`status status-${meta.tone}`}>{meta.label}</span>;
}
