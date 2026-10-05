import { Link } from "react-router-dom";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useEnrollments } from "../../hooks/useEnrollments";

function GradeRow({ title, hint, grade }: { title: string; hint: string; grade: string | null }) {
  const isText = !!grade && !/^\d$/.test(grade);
  return (
    <div className="grade-row">
      <div>
        <b>{title}</b>
        <small>{grade ? hint : "Оценка пока не выставлена"}</small>
      </div>
      <div className={`grade-value${grade ? " is-set" : ""}${isText ? " is-text" : ""}`}>{grade ?? "—"}</div>
    </div>
  );
}

export function Grades() {
  const { data, loading, error, reload } = useEnrollments();
  const enrolled = data?.filter((e) => e.status === "approved" || e.status === "completed") ?? [];

  return (
    <>
      <PageHead
        title="Успеваемость"
        text="Оценки, которые выставил администратор в ведомости: практика, промежуточная и итоговая аттестация. Расписание аттестаций смотрите в СДО."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        {enrolled.length === 0 ? (
          <div className="card">
            <div className="empty">
              Оценки появятся после зачисления на программу.
              <br />
              <Link className="btn btn-light" to="/student/applications">
                Мои записи
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid-2">
            {enrolled.map((e) => (
              <section className="card" key={e.id}>
                <div className="card-title-row">
                  <h2>{e.course.title}</h2>
                  <StatusBadge status={e.status} />
                </div>
                <GradeRow title="Практика" hint="Оценка за практическую часть" grade={e.gradePractice} />
                <GradeRow title="Промежуточная аттестация" hint="Оценка за промежуточную аттестацию" grade={e.gradeIntermediate} />
                <GradeRow title="Итоговая аттестация" hint="Оценка за итоговую аттестацию" grade={e.gradeFinal} />
              </section>
            ))}
          </div>
        )}
      </Loading>
    </>
  );
}
