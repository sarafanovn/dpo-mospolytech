import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import "./student.css";

export function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.courses.list(), api.enrollments.list()])
      .then(([c, e]) => {
        setCourses(c);
        setEnrollments(e);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async (courseId: number) => {
    setEnrollingId(courseId);
    try {
      const enrollment = await api.enrollments.create(courseId);
      navigate(`/student/applications/${enrollment.id}`);
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  return (
    <div>
      <div className="eyebrow">Программы ДПО</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Доступные курсы</h1>
      {courses.length === 0 && <p style={{ color: "var(--gray-500)" }}>Курсы пока не добавлены.</p>}
      <div className="course-grid">
        {courses.map((course) => {
          const enrollment = enrollments.find((e) => e.courseId === course.id);
          return (
            <div key={course.id} className="card course-card">
              <div className="badge badge-blue">{course.hours} ак. ч.</div>
              <h3 style={{ fontSize: 18, margin: "12px 0 6px" }}>{course.title}</h3>
              <p style={{ color: "var(--gray-500)", fontSize: 13, margin: "0 0 6px" }}>
                {course.durationFrom} — {course.durationTo}
              </p>
              <p style={{ fontSize: 14, margin: "0 0 20px", flex: 1 }}>{course.description}</p>
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
