import { useState } from "react";
import type { EnrollmentDetail } from "@meridian/shared";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { studentName } from "../../lib/progress";

interface Grades {
  practice: string;
  intermediate: string;
  final: string;
}

const original = (e: EnrollmentDetail): Grades => ({
  practice: e.gradePractice ?? "",
  intermediate: e.gradeIntermediate ?? "",
  final: e.gradeFinal ?? "",
});

const COLUMNS: { key: keyof Grades; label: string }[] = [
  { key: "practice", label: "Практика" },
  { key: "intermediate", label: "Промежуточная аттестация" },
  { key: "final", label: "Итоговая аттестация" },
];

export function Attestation() {
  const { data, loading, error, reload } = useEnrollments();
  const { toast, toastError } = useToast();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, Grades>>({});
  const [saving, setSaving] = useState(false);

  const enrolled = (data ?? []).filter((e) => e.status === "approved" || e.status === "completed");
  const programs = [...new Map(enrolled.map((e) => [e.courseId, e.course])).values()];
  const activeCourseId = courseId ?? programs[0]?.id ?? null;
  const rows = enrolled.filter((e) => e.courseId === activeCourseId);

  const valueOf = (e: EnrollmentDetail): Grades => edits[e.id] ?? original(e);
  const dirtyRows = rows.filter((e) => {
    const edit = edits[e.id];
    const base = original(e);
    return edit && COLUMNS.some((c) => edit[c.key].trim() !== base[c.key]);
  });

  const setGrade = (e: EnrollmentDetail, key: keyof Grades, value: string) =>
    setEdits((prev) => ({ ...prev, [e.id]: { ...valueOf(e), [key]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await api.enrollments.saveGrades(
        dirtyRows.map((e) => {
          const g = edits[e.id];
          return { id: e.id, gradePractice: g.practice, gradeIntermediate: g.intermediate, gradeFinal: g.final };
        })
      );
      setEdits((prev) => {
        const next = { ...prev };
        for (const e of dirtyRows) delete next[e.id];
        return next;
      });
      toast("Ведомость сохранена");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось сохранить ведомость"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        title="Аттестация"
        text="Ведомость успеваемости: оценки за практику, промежуточную и итоговую аттестацию. Обучающиеся видят свои оценки в разделе «Успеваемость». Расписание аттестаций ведётся в СДО."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        {programs.length === 0 ? (
          <div className="card">
            <div className="empty">В ведомость попадают зачисленные обучающиеся. Зачислите кого-нибудь в разделе «Заявки».</div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="field">
                <select aria-label="Программа" value={activeCourseId ?? ""} onChange={(e) => setCourseId(Number(e.target.value))}>
                  {programs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <span className="toolbar-spacer" />
              <button className="btn btn-red" onClick={save} disabled={saving || dirtyRows.length === 0}>
                {saving ? "Сохраняем…" : dirtyRows.length ? `Сохранить ведомость (${dirtyRows.length})` : "Сохранить ведомость"}
              </button>
            </div>
            <section className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Обучающийся</th>
                      <th>Статус</th>
                      {COLUMNS.map((c) => (
                        <th key={c.key}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <datalist id="grade-options">
                      {["5", "4", "3", "2", "зачтено", "не зачтено"].map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                    {rows.map((e) => (
                      <tr key={e.id}>
                        <td className="cell-title">{studentName(e)}</td>
                        <td>
                          <StatusBadge status={e.status} />
                        </td>
                        {COLUMNS.map((c) => (
                          <td key={c.key}>
                            <input
                              className="grade-input"
                              list="grade-options"
                              aria-label={`${c.label}: ${studentName(e)}`}
                              maxLength={40}
                              value={valueOf(e)[c.key]}
                              onChange={(ev) => setGrade(e, c.key, ev.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Loading>
    </>
  );
}
