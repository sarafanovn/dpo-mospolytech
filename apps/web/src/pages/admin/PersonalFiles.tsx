import { useCallback, useEffect, useState } from "react";
import { APPLICATION_FIELD_GROUPS, formatIsoDate, type Application, type Course, type Enrollment } from "@meridian/shared";
import { api, ApiError } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorState } from "../../components/ErrorState";
import "./admin.css";

export function PersonalFiles() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.enrollments.list(), api.courses.list()])
      .then(([e, c]) => {
        setEnrollments(e.filter((en) => en.status !== "draft"));
        setCourses(c);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить личные дела"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (error) return <ErrorState message={error} onRetry={load} />;

  const selected = enrollments.find((e) => e.id === selectedId) ?? null;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 className="page-title">Личные дела</h1>

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
                  <div style={{ fontSize: "0.8125rem", color: "var(--gray-500)" }}>{course?.title}</div>
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
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setApplication(null);
    setNotFound(false);
    setLoadError(null);
    api
      .applications.get(enrollment.id)
      .then(setApplication)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(err instanceof Error ? err.message : "Не удалось загрузить анкету");
        }
      });
  }, [enrollment.id]);

  if (loadError) return <div className="card">{loadError}</div>;
  if (notFound || !application) return <div className="card">Анкета ещё не заполнена.</div>;

  return (
    <div className="card">
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.25rem" }}>{course?.title}</h2>
      <p style={{ color: "var(--gray-500)", fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
        Заявка №{enrollment.id} · <StatusBadge status={enrollment.status} />
      </p>
      <div className="review-grid" style={{ marginBottom: "1.5rem" }}>
        {APPLICATION_FIELD_GROUPS.flatMap((g) => g.fields).map((f) => (
          <div key={f.key} className="review-item">
            <div className="review-label">{f.label}</div>
            <div className="review-value">
              {f.type === "date" && application.form[f.key] ? formatIsoDate(application.form[f.key]) : application.form[f.key]}
            </div>
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
