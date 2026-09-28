import { useEffect, useState } from "react";
import type { Application, Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import "./admin.css";

export function PersonalFiles() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.enrollments.list(), api.courses.list()])
      .then(([e, c]) => {
        setEnrollments(e.filter((en) => en.status !== "draft"));
        setCourses(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Загрузка…</div>;

  const selected = enrollments.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Личные дела</h1>

      <div className="detail-panel">
        <div className="list-stack">
          {enrollments.map((enrollment) => {
            const course = courses.find((c) => c.id === enrollment.courseId);
            return (
              <button
                key={enrollment.id}
                className="card list-row"
                style={{ border: "none", cursor: "pointer", textAlign: "left" }}
                onClick={() => setSelectedId(enrollment.id)}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>Заявка №{enrollment.id}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{course?.title}</div>
                </div>
                <StatusBadge status={enrollment.status} />
              </button>
            );
          })}
          {enrollments.length === 0 && <p style={{ color: "var(--gray-500)" }}>Пока нет поданных анкет.</p>}
        </div>

        {selected && <FileDetail enrollment={selected} course={courses.find((c) => c.id === selected.courseId) ?? null} />}
      </div>
    </div>
  );
}

function FileDetail({ enrollment, course }: { enrollment: Enrollment; course: Course | null }) {
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    setApplication(null);
    api.applications.get(enrollment.id).then(setApplication).catch(() => setApplication(null));
  }, [enrollment.id]);

  if (!application) return <div className="card">Анкета не найдена.</div>;

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>{course?.title}</h2>
      <p style={{ color: "var(--gray-500)", fontSize: 13, marginBottom: 20 }}>
        Заявка №{enrollment.id} · <StatusBadge status={enrollment.status} />
      </p>
      <div className="review-grid" style={{ marginBottom: 24 }}>
        {Object.entries(application.form).map(([key, value]) => (
          <div key={key} className="review-item">
            <div className="review-label">{key}</div>
            <div className="review-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="inline-actions">
        <a
          className="btn btn-secondary"
          href={api.applications.documentUrl(enrollment.id, "application")}
          target="_blank"
          rel="noreferrer"
        >
          Заявление (PDF)
        </a>
        <a
          className="btn btn-secondary"
          href={api.applications.documentUrl(enrollment.id, "contract")}
          target="_blank"
          rel="noreferrer"
        >
          Договор (PDF)
        </a>
        <a
          className="btn btn-secondary"
          href={api.applications.documentUrl(enrollment.id, "personal-data")}
          target="_blank"
          rel="noreferrer"
        >
          Персональные данные (XLSX)
        </a>
      </div>
    </div>
  );
}
