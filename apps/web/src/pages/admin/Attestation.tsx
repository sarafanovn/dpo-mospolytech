import { useEffect, useState } from "react";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import "./admin.css";

export function Attestation() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<number, { intermediate: string; final: string }>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () =>
    Promise.all([api.enrollments.list(), api.courses.list()]).then(([e, c]) => {
      setEnrollments(
        e.filter((en) => en.status === "contract_registered" || en.status === "approved" || en.status === "completed")
      );
      setCourses(c);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const en of e) {
          if (!next[en.id]) {
            next[en.id] = {
              intermediate: en.intermediateAttestation ?? "",
              final: en.finalAttestation ?? "",
            };
          }
        }
        return next;
      });
    });

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleSave = async (enrollment: Enrollment) => {
    const draft = drafts[enrollment.id];
    setBusyId(enrollment.id);
    try {
      await api.enrollments.update(enrollment.id, {
        intermediateAttestation: draft.intermediate,
        finalAttestation: draft.final,
        status: draft.final ? "completed" : enrollment.status === "contract_registered" ? "approved" : enrollment.status,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Аттестация</h1>

      <div className="list-stack">
        {enrollments.map((enrollment) => {
          const course = courses.find((c) => c.id === enrollment.courseId);
          const draft = drafts[enrollment.id] ?? { intermediate: "", final: "" };
          return (
            <div key={enrollment.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{course?.title}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Заявка №{enrollment.id}</div>
                </div>
                <StatusBadge status={enrollment.status} />
              </div>
              <div className="field">
                <label>Промежуточная аттестация</label>
                <input
                  value={draft.intermediate}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [enrollment.id]: { ...draft, intermediate: e.target.value } }))
                  }
                  placeholder="например, зачёт от 15.11.2026"
                />
              </div>
              <div className="field">
                <label>Итоговая аттестация</label>
                <input
                  value={draft.final}
                  onChange={(e) => setDrafts((d) => ({ ...d, [enrollment.id]: { ...draft, final: e.target.value } }))}
                  placeholder="например, экзамен сдан, оценка «отлично»"
                />
              </div>
              <button className="btn btn-primary" disabled={busyId === enrollment.id} onClick={() => handleSave(enrollment)}>
                Сохранить
              </button>
            </div>
          );
        })}
        {enrollments.length === 0 && <p style={{ color: "var(--gray-500)" }}>Нет заявок с оформленным договором.</p>}
      </div>
    </div>
  );
}
