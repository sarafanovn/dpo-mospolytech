import { useEffect, useState } from "react";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import "./admin.css";

export function Contracts() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () =>
    Promise.all([api.enrollments.list(), api.courses.list()]).then(([e, c]) => {
      setEnrollments(e.filter((en) => en.status === "signed" || en.status === "contract_registered" || en.status === "approved" || en.status === "completed"));
      setCourses(c);
    });

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRegister = async (enrollment: Enrollment) => {
    const number = drafts[enrollment.id]?.trim();
    if (!number) return;
    setBusyId(enrollment.id);
    try {
      await api.enrollments.update(enrollment.id, { contractNumber: number });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleCountersign = async (enrollment: Enrollment) => {
    setBusyId(enrollment.id);
    try {
      await api.applications.signExecutor(enrollment.id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Договоры</h1>

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
                      placeholder="Присвоить номер"
                      value={drafts[enrollment.id] ?? ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [enrollment.id]: e.target.value }))}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1.5px solid var(--gray-200)",
                        fontSize: 13,
                      }}
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
