import { useCallback, useEffect, useState } from "react";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorState } from "../../components/ErrorState";
import "./admin.css";

export function Contracts() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    return Promise.all([api.enrollments.list(), api.courses.list()])
      .then(([e, c]) => {
        setEnrollments(e.filter((en) => en.status === "signed" || en.status === "contract_registered" || en.status === "approved" || en.status === "completed"));
        setCourses(c);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Не удалось загрузить договоры"));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRegister = async (enrollment: Enrollment) => {
    const number = drafts[enrollment.id]?.trim();
    if (!number) return;
    setBusyId(enrollment.id);
    setActionError(null);
    try {
      await api.enrollments.update(enrollment.id, { contractNumber: number });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Не удалось присвоить номер договора");
    } finally {
      setBusyId(null);
    }
  };

  const handleCountersign = async (enrollment: Enrollment) => {
    setBusyId(enrollment.id);
    setActionError(null);
    try {
      await api.applications.signExecutor(enrollment.id);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Не удалось подписать договор");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 className="page-title">Договоры</h1>

      {actionError && <div style={{ marginBottom: "1.25rem" }}><ErrorState message={actionError} /></div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Заявка</th>
            <th>Курс</th>
            <th>Номер договора</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map((enrollment) => {
            const course = courses.find((c) => c.id === enrollment.courseId);
            const canCountersign = enrollment.status === "signed" && !!enrollment.contractNumber;
            return (
              <tr key={enrollment.id}>
                <td>№{enrollment.id}</td>
                <td>{course?.title}</td>
                <td>
                  {enrollment.contractNumber ?? (
                    <input
                      className="table-input"
                      placeholder="Присвоить номер"
                      value={drafts[enrollment.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [enrollment.id]: e.target.value }))}
                    />
                  )}
                </td>
                <td>
                  <StatusBadge status={enrollment.status} />
                </td>
                <td>
                  <div className="inline-actions">
                    {!enrollment.contractNumber && (
                      <button className="btn btn-ghost" disabled={busyId === enrollment.id} onClick={() => handleRegister(enrollment)}>
                        Присвоить номер
                      </button>
                    )}
                    {canCountersign && (
                      <button className="btn btn-primary" disabled={busyId === enrollment.id} onClick={() => handleCountersign(enrollment)}>
                        Подписать со стороны исполнителя
                      </button>
                    )}
                    <a
                      className="btn btn-ghost"
                      href={api.applications.documentUrl(enrollment.id, "contract")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть договор
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
          {enrollments.length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "var(--gray-500)" }}>
                Нет заявок, готовых к оформлению договора.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
