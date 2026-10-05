import type { BatchResult } from "@meridian/shared";

/** Summarises a batch result as a toast message. */
export function batchMessage(done: string, result: BatchResult): string {
  const parts = [`${done}: ${result.updated.length}`];
  if (result.skipped.length > 0) {
    const reasons = [...new Set(result.skipped.map((s) => s.reason))].join("; ");
    parts.push(`пропущено ${result.skipped.length} (${reasons})`);
  }
  return parts.join(". ");
}
