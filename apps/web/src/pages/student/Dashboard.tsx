import { Link } from "react-router-dom";
import { useAuth } from "../../AuthContext";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { Stepper } from "../../components/Stepper";
import { useEnrollments } from "../../hooks/useEnrollments";
import { fmtDate, firstName, plural } from "../../lib/format";
import { getProgress } from "../../lib/progress";
import { STATUS_META } from "../../lib/status";

export function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useEnrollments();
  const enrollments = data ?? [];
  const progress = enrollments.map(getProgress);

  const docsDone = progress.reduce((sum, p) => sum + p.docsDone, 0);
  const docsTotal = progress.reduce((sum, p) => sum + p.docsTotal, 0);
  const certCount = enrollments.reduce((sum, e) => sum + e.certificates.length, 0);
  const overall = progress.length ? Math.round(progress.reduce((sum, p) => sum + p.percent, 0) / progress.length) : 0;

  return (
    <>
      <PageHead
        title={`Добрый день, ${firstName(user?.fullName ?? "")}`}
        text="Здесь собрана актуальная информация по вашему обучению, документам и этапам зачисления."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="metric-grid">
          <Link to="/student/documents" className="card metric red">
            <div className="value">{enrollments.length ? `${docsDone}/${docsTotal}` : "0"}</div>
            <div className="label">оформлено документов</div>
            <div className="hint">заявление, договор, паспорт, ИНН, образование</div>
          </Link>
          <Link to="/student/applications" className="card metric blue">
            {enrollments.length === 1 ? (
              <div className="value is-text">{STATUS_META[enrollments[0].status].label}</div>
            ) : (
              <div className="value is-text">
                {enrollments.length ? `${enrollments.length} ${plural(enrollments.length, "запись", "записи", "записей")}` : "Нет"}
              </div>
            )}
            <div className="label">{enrollments.length > 1 ? "статусы заявок" : "статус заявки"}</div>
          </Link>
          <Link to="/student/certificates" className="card metric violet">
            <div className="value">{certCount}</div>
            <div className="label">справки и сертификаты</div>
            {certCount === 0 && <div className="hint">Здесь появятся документы после выдачи администратором</div>}
          </Link>
        </div>

        <div className="dashboard-grid">
          <div className="stack">
            {enrollments.length === 0 && (
              <section className="card">
                <div className="card-title-row">
                  <h2>Ваше обучение</h2>
                </div>
                <div className="empty">
                  Вы пока не записаны на программу ДПО.
                  <br />
                  <Link className="btn btn-primary" to="/student/courses">
                    Выбрать курс
                  </Link>
                </div>
              </section>
            )}
            {enrollments.map((e, i) => (
              <section className="card program-card" key={e.id}>
                <div className="card-title-row">
                  <h2>Ваше обучение</h2>
                  <StatusBadge status={e.status} />
                </div>
                <div className="kicker">Программа ДПО</div>
                <h3>{e.course.title}</h3>
                <p>{e.course.description}</p>
                <div className="tag-row">
                  <span className="tag">
                    {fmtDate(e.course.durationFrom)} — {fmtDate(e.course.durationTo)}
                  </span>
                  <span className="tag">{e.course.studyForm}</span>
                </div>
                <Stepper progress={progress[i]} />
                <div className="actions">
                  <Link className="btn btn-primary" to={`/student/applications/${e.id}`}>
                    {e.application ? "Открыть заявление" : "Продолжить оформление"}
                  </Link>
                  <Link className="btn btn-light" to="/student/documents">
                    Документы
                  </Link>
                </div>
              </section>
            ))}
          </div>

          <section className="card">
            <div className="ring-progress" style={{ ["--p" as string]: overall }}>
              <div className="inside">
                <strong>{overall}%</strong>
                <small>готово</small>
              </div>
            </div>
            <div className="stack">
              {enrollments.map((e, i) => (
                <div className="progress-line" key={e.id}>
                  <div className="progress-top">
                    <span>{e.course.title}</span>
                    <span>{progress[i].percent}%</span>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${progress[i].percent}%` }} />
                  </div>
                </div>
              ))}
              {enrollments.length === 0 && <div className="muted">Оформление начнётся после записи на программу.</div>}
            </div>
          </section>
        </div>

        <div className="footer-note">
          Электронное подписание в портале — простая электронная подпись (отметка в системе с фиксацией времени); она не
          заменяет квалифицированную электронную подпись.
        </div>
      </Loading>
    </>
  );
}
