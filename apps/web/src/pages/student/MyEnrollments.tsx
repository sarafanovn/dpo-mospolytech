import { Link } from "react-router-dom";
import type { EnrollmentDetail } from "@meridian/shared";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { Stepper } from "../../components/Stepper";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { fmtDate } from "../../lib/format";
import { getProgress } from "../../lib/progress";

export function MyEnrollments() {
  const { data, loading, error, reload } = useEnrollments();
  const { toast, toastError } = useToast();

  const withdraw = async (e: EnrollmentDetail) => {
    if (!confirm(`Отказаться от программы «${e.course.title}»? Заявление и загруженные документы будут удалены.`)) return;
    try {
      await api.enrollments.withdraw(e.id);
      toast("Запись отменена");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось отменить запись"));
    }
  };

  return (
    <>
      <PageHead
        title="Мои записи"
        text="Программы ДПО, на которые вы записаны. По каждой программе заполняется заявление и собирается свой комплект документов."
      >
        <Link className="btn btn-primary" to="/student/courses">
          Записаться на программу
        </Link>
      </PageHead>
      <Loading loading={loading} error={error} onRetry={reload}>
        {data?.length === 0 ? (
          <div className="card">
            <div className="empty">
              Вы пока не записаны ни на одну программу.
              <br />
              <Link className="btn btn-primary" to="/student/courses">
                Выбрать курс
              </Link>
            </div>
          </div>
        ) : (
          <div className="stack">
            {data?.map((e) => (
              <section className="card program-card" key={e.id}>
                <div className="card-title-row">
                  <div className="kicker">ДПО · {e.course.hours} часов</div>
                  <StatusBadge status={e.status} />
                </div>
                <h3>{e.course.title}</h3>
                <div className="tag-row">
                  <span className="tag">
                    {fmtDate(e.course.durationFrom)} — {fmtDate(e.course.durationTo)}
                  </span>
                  <span className="tag">{e.course.studyForm}</span>
                  {e.contractNumber && e.application?.signedByExecutorAt && <span className="tag">Договор № {e.contractNumber}</span>}
                </div>
                <Stepper progress={getProgress(e)} />
                <div className="actions">
                  <Link className="btn btn-primary" to={`/student/applications/${e.id}`}>
                    {e.application ? "Открыть заявление" : "Заполнить заявление"}
                  </Link>
                  <Link className="btn btn-light" to="/student/documents">
                    Документы
                  </Link>
                  {!e.application?.signedByExecutorAt && e.status !== "approved" && e.status !== "completed" && (
                    <button className="btn btn-danger" onClick={() => withdraw(e)}>
                      Отказаться
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </Loading>
    </>
  );
}
