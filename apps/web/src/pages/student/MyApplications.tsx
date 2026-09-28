import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorState } from "../../components/ErrorState";
import "./student.css";

export function MyApplications() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([api.enrollments.list(), api.courses.list()])
      .then(([e, c]) => {
        setEnrollments(e);
        setCourses(c);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Не удалось загрузить заявки"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="eyebrow">Мои заявки</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Заявки на обучение</h1>
      {enrollments.length === 0 && (
        <p style={{ color: "var(--gray-500)" }}>
          У вас пока нет заявок. <Link to="/student/courses">Выберите курс</Link>, чтобы начать.
        </p>
      )}
      <div className="list-stack">
        {enrollments.map((enrollment) => {
          const course = courses.find((c) => c.id === enrollment.courseId);
          return (
            <Link key={enrollment.id} to={`/student/applications/${enrollment.id}`} className="card list-row">
              <div>
                <div style={{ fontWeight: 700 }}>{course?.title ?? "Курс"}</div>
                <div style={{ fontSize: 13, color: "var(--gray-500)" }}>
                  Подана {new Date(enrollment.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
              <StatusBadge status={enrollment.status} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
