import { useState } from "react";
import { Link } from "react-router-dom";
import { EnrollmentFileModal } from "../../components/EnrollmentFileModal";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useEnrollments } from "../../hooks/useEnrollments";
import { studentName } from "../../lib/progress";

export function Overview() {
  const { data, loading, error, reload } = useEnrollments();
  const [openId, setOpenId] = useState<number | null>(null);
  const list = data ?? [];

  const awaitingContract = list.filter((e) => e.application?.signedAt && !e.application.signedByExecutorAt).length;
  const enrolled = list.filter((e) => e.status === "approved" || e.status === "completed").length;
  const certificates = list.reduce((sum, e) => sum + e.certificates.length, 0);
  const opened = list.find((e) => e.id === openId) ?? null;

  return (
    <>
      <PageHead title="Панель управления" text="Сводная информация по программам ДПО, заявкам обучающихся и документам." />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="metric-grid">
          <Link to="/admin/applications" className="card metric red">
            <div className="value">{list.length}</div>
            <div className="label">всего заявок</div>
          </Link>
          <Link to="/admin/files" className="card metric blue">
            <div className="value">{awaitingContract}</div>
            <div className="label">договоров ждут подписи</div>
          </Link>
          <Link to="/admin/attestation" className="card metric green">
            <div className="value">{enrolled}</div>
            <div className="label">зачислено обучающихся</div>
          </Link>
          <Link to="/admin/certificates" className="card metric violet">
            <div className="value">{certificates}</div>
            <div className="label">выдано справок и сертификатов</div>
          </Link>
        </div>

        <section className="card" style={{ marginTop: "1.125rem" }}>
          <div className="card-title-row">
            <h2>Последние заявки</h2>
            <Link className="btn btn-light btn-sm" to="/admin/applications">
              Все заявки
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Обучающийся</th>
                  <th>Программа</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 5).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="cell-title">{studentName(e)}</span>
                      <small>{e.student.email}</small>
                    </td>
                    <td>{e.course.title}</td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td>
                      <button className="btn btn-light btn-sm" onClick={() => setOpenId(e.id)}>
                        Открыть
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Заявок пока нет.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Loading>
      {opened && <EnrollmentFileModal enrollment={opened} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  );
}
