import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { ErrorState } from "../../components/ErrorState";
import "./student.css";

export function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    Promise.all([api.courses.list(), api.enrollments.list()])
      .then(([c, e]) => {
        setCourses(c);
        setEnrollments(e);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Не удалось загрузить курсы"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleEnroll = async (courseId: number) => {
    setEnrollingId(courseId);
    setEnrollError(null);
    try {
      const enrollment = await api.enrollments.create(courseId);
      navigate(`/student/applications/${enrollment.id}`);
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : "Не удалось подать заявку");
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div>
      <div className="eyebrow">Программы ДПО</div>
      <h1 className="page-title">Доступные курсы</h1>
      {enrollError && <div style={{ marginBottom: "1.25rem" }}><ErrorState message={enrollError} /></div>}
      {courses.length === 0 && <p style={{ color: "var(--gray-500)" }}>Курсы пока не добавлены.</p>}
      <div className="course-grid">
        {courses.map((course) => {
          const enrollment = enrollments.find((e) => e.courseId === course.id);
          return (
            <div key={course.id} className="card course-card">
              <div className="badge badge-blue">{course.hours} ак. ч.</div>
              <h3 style={{ fontSize: "1.125rem", margin: "0.75rem 0 0.375rem" }}>{course.title}</h3>
              <p style={{ color: "var(--gray-500)", fontSize: "0.8125rem", margin: "0 0 0.375rem" }}>
                {course.durationFrom} — {course.durationTo}
              </p>
              <p style={{ fontSize: "0.875rem", margin: "0 0 1.25rem", flex: 1 }}>{course.description}</p>
              {enrollment ? (
                <button className="btn btn-secondary" onClick={() => navigate(`/student/applications/${enrollment.id}`)}>
                  Перейти к заявке
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  disabled={enrollingId === course.id}
                  onClick={() => handleEnroll(course.id)}
                >
                  {enrollingId === course.id ? "Подаём заявку…" : "Подать заявку"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
