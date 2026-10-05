import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Course, EnrollmentDetail } from "@meridian/shared";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../ToastContext";
import { errorMessage, useAsync } from "../../hooks/useAsync";
import { fmtDate } from "../../lib/format";

function CourseMeta({ course }: { course: Course }) {
  return (
    <>
      <div className="kicker">ДПО · {course.hours} часов</div>
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <div className="tag-row">
        <span className="tag">{fmtDate(course.durationFrom)}</span>
        <span className="tag">{course.studyForm}</span>
      </div>
    </>
  );
}

/** Banner of a programme the student is enrolled in: the whole card leads to the course in the SDO. */
function AssignedBanner({ enrollment }: { enrollment: EnrollmentDetail }) {
  const { course } = enrollment;
  const content = (
    <>
      <CourseMeta course={course} />
      <div className="actions">
        <StatusBadge status={enrollment.status} />
        <span className="course-link">{course.sdoUrl ? "Перейти в СДО →" : "Ссылка на СДО пока не указана"}</span>
      </div>
    </>
  );
  return course.sdoUrl ? (
    <a className="card course-card" href={course.sdoUrl} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <div className="card course-card">{content}</div>
  );
}

export function CourseShowcase() {
  const navigate = useNavigate();
  const { toast, toastError } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [courses, enrollments] = await Promise.all([api.courses.list(), api.enrollments.list()]);
    return { courses, enrollments };
  }, []);
  const { data, loading, error, reload } = useAsync(load, "Не удалось загрузить курсы");

  const enrolledIds = new Set(data?.enrollments.map((e) => e.courseId));
  const available = data?.courses.filter((c) => !enrolledIds.has(c.id)) ?? [];

  const enroll = async (courseId: number) => {
    setBusyId(courseId);
    try {
      const enrollment = await api.enrollments.create(courseId);
      toast("Вы записаны на программу. Заполните заявление.");
      navigate(`/student/applications/${enrollment.id}`);
    } catch (err) {
      toastError(errorMessage(err, "Не удалось записаться на программу"));
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHead
        title="Курсы ДПО"
        text="Программы, на которые вы записаны, ведут в СДО. Для каждой программы формируется отдельный комплект документов."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        {data && data.enrollments.length > 0 && (
          <>
            <h2 className="section-title">Мои программы</h2>
            <div className="grid-3">
              {data.enrollments.map((e) => (
                <AssignedBanner key={e.id} enrollment={e} />
              ))}
            </div>
          </>
        )}

        <h2 className="section-title">Доступные программы</h2>
        {available.length === 0 ? (
          <div className="empty">Новых программ для записи пока нет.</div>
        ) : (
          <div className="grid-3">
            {available.map((c) => (
              <article className="card course-card" key={c.id}>
                <CourseMeta course={c} />
                <div className="actions">
                  <button className="btn btn-primary" onClick={() => enroll(c.id)} disabled={busyId !== null}>
                    {busyId === c.id ? "Записываем…" : "Записаться"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Loading>
    </>
  );
}
