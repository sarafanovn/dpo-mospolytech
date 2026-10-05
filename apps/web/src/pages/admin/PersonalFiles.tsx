import { useState } from "react";
import { api } from "../../api";
import { EnrollmentFileModal } from "../../components/EnrollmentFileModal";
import { batchMessage } from "../../lib/batch";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { useSelection } from "../../components/SelectableTable";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { fmtDate } from "../../lib/format";
import { getProgress, studentName } from "../../lib/progress";

export function PersonalFiles() {
  const { data, loading, error, reload } = useEnrollments();
  const { toast, toastError } = useToast();
  const [courseId, setCourseId] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const all = data ?? [];
  const programs = [...new Map(all.map((e) => [e.courseId, e.course])).values()];
  // Drafts have no signed application, so there is nothing to put into a personal file yet.
  const rows = all.filter((e) => e.application && (!courseId || e.courseId === Number(courseId)));
  const selection = useSelection(rows.map((e) => e.id));
  const chosen = rows.filter((e) => selection.selected.has(e.id));

  const toRegister = chosen.filter((e) => e.application?.signedAt && !e.contractNumber);
  const toSign = chosen.filter((e) => e.application?.signedAt && !e.application.signedByExecutorAt);
  const toUnsign = chosen.filter((e) => e.application?.signedByExecutorAt);
  const opened = all.find((e) => e.id === openId) ?? null;

  const batch = async (action: (ids: number[]) => ReturnType<typeof api.enrollments.signContracts>, items: typeof rows, done: string) => {
    setBusy(true);
    try {
      const result = await action(items.map((e) => e.id));
      toast(batchMessage(done, result));
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось выполнить действие"));
    } finally {
      setBusy(false);
    }
  };

  const contractCell = (e: (typeof rows)[number]) => {
    if (e.application?.signedByExecutorAt) return <span className="status status-green">Подписан · № {e.contractNumber}</span>;
    if (e.contractNumber) return <span className="status status-amber">№ {e.contractNumber} · ждёт подписи</span>;
    return <span className="status status-gray">Не зарегистрирован</span>;
  };

  return (
    <>
      <PageHead
        title="Личные дела"
        text="Электронные личные дела обучающихся. Выберите программу, отметьте обучающихся и зарегистрируйте или подпишите договоры сразу для всех."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="toolbar">
          <div className="field">
            <select aria-label="Программа" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Все программы</option>
              {programs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn-light" onClick={() => selection.set(rows.filter((e) => e.application?.signedAt).map((e) => e.id))} disabled={rows.length === 0}>
            Выбрать всех подписавших заявление
          </button>
        </div>

        {chosen.length > 0 && (
          <div className="selection-bar">
            <b>Выбрано: {chosen.length}</b>
            <button className="btn btn-light btn-sm" disabled={busy || toRegister.length === 0} onClick={() => batch(api.enrollments.registerContracts, toRegister, "Зарегистрировано договоров")}>
              Зарегистрировать договоры ({toRegister.length})
            </button>
            <button className="btn btn-red btn-sm" disabled={busy || toSign.length === 0} onClick={() => batch(api.enrollments.signContracts, toSign, "Подписано договоров")}>
              Подписать ({toSign.length})
            </button>
            <button
              className="btn btn-light btn-sm"
              disabled={busy || toUnsign.length === 0}
              onClick={() =>
                confirm(`Отменить подписание договоров (${toUnsign.length})? У обучающихся исчезнут PDF договоров.`) &&
                batch(api.enrollments.unsignContracts, toUnsign, "Подписание отменено")
              }
            >
              Отменить подписание ({toUnsign.length})
            </button>
          </div>
        )}

        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-check">
                    <input type="checkbox" aria-label="Выбрать всех" checked={selection.allSelected} onChange={selection.toggleAll} />
                  </th>
                  <th>Обучающийся</th>
                  <th>Программа</th>
                  <th>Заявление</th>
                  <th>Документы</th>
                  <th>Договор</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const p = getProgress(e);
                  return (
                    <tr key={e.id}>
                      <td className="col-check">
                        <input type="checkbox" aria-label={`Выбрать ${studentName(e)}`} checked={selection.selected.has(e.id)} onChange={() => selection.toggle(e.id)} />
                      </td>
                      <td>
                        <span className="cell-title">{studentName(e)}</span>
                        <small>{e.student.email}</small>
                      </td>
                      <td>{e.course.title}</td>
                      <td>
                        {e.application?.signedAt ? (
                          <span className="status status-green">Подписано {fmtDate(e.application.signedAt)}</span>
                        ) : (
                          <span className="status status-amber">Не подписано</span>
                        )}
                      </td>
                      <td>{e.documents.length > 0 ? `${p.steps[1].done ? "3/3" : `${e.documents.filter((d) => d.kind !== "other").length}/3`} + ${e.documents.filter((d) => d.kind === "other").length}` : "0/3"}</td>
                      <td>{contractCell(e)}</td>
                      <td>
                        <button className="btn btn-light btn-sm" onClick={() => setOpenId(e.id)}>
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Личных дел пока нет — они появляются, когда обучающийся заполнит заявление.
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
