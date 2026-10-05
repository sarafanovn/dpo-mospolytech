import { useState } from "react";
import { EnrollmentFileModal } from "../../components/EnrollmentFileModal";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useEnrollments } from "../../hooks/useEnrollments";
import { getProgress, studentName } from "../../lib/progress";
import { STATUS_META } from "../../lib/status";

export function AdminApplications() {
  const { data, loading, error, reload } = useEnrollments();
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const list = (data ?? []).filter((e) => !status || e.status === status);
  const opened = data?.find((e) => e.id === openId) ?? null;

  return (
    <>
      <PageHead title="Заявки" text="Заявления обучающихся на программы ДПО: просмотр, контроль комплекта документов и изменение статуса зачисления." />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="toolbar">
          <div className="field">
            <select aria-label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Все статусы</option>
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Обучающийся</th>
                  <th>Филиал</th>
                  <th>Программа</th>
                  <th>Статус</th>
                  <th>Документы</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const p = getProgress(e);
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className="cell-title">{studentName(e)}</span>
                        <small>{e.student.email}</small>
                      </td>
                      <td>{e.application?.form.branch || e.student.branch || "—"}</td>
                      <td>{e.course.title}</td>
                      <td>
                        <StatusBadge status={e.status} />
                      </td>
                      <td>
                        {p.docsDone}/{p.docsTotal}
                      </td>
                      <td>
                        <button className="btn btn-light btn-sm" onClick={() => setOpenId(e.id)}>
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Заявок нет.
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
