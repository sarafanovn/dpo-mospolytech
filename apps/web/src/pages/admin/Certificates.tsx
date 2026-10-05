import { useState } from "react";
import { Link } from "react-router-dom";
import type { CertificateType } from "@meridian/shared";
import { api } from "../../api";
import { batchMessage } from "../../lib/batch";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useSelection } from "../../components/SelectableTable";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { studentName } from "../../lib/progress";

const TYPE_LABEL: Record<CertificateType, string> = { certificate: "Сертификат", reference: "Справка" };

export function AdminCertificates() {
  const { data, loading, error, reload } = useEnrollments();
  const { toast, toastError } = useToast();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const withApplication = (data ?? []).filter((e) => e.application);
  const programs = [...new Map(withApplication.map((e) => [e.courseId, e.course])).values()];
  const activeCourseId = courseId ?? programs[0]?.id ?? null;
  const rows = withApplication.filter((e) => e.courseId === activeCourseId);

  const selection = useSelection(rows.map((e) => e.id));
  const chosenIds = rows.filter((e) => selection.selected.has(e.id)).map((e) => e.id);

  const issue = async (type: CertificateType) => {
    setBusy(true);
    try {
      const result = await api.certificates.issue(chosenIds, type);
      toast(batchMessage(type === "certificate" ? "Сформировано сертификатов" : "Сформировано справок", result));
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось сформировать документы"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: number, number: string) => {
    if (!confirm(`Удалить документ № ${number}? Он исчезнет у обучающегося.`)) return;
    try {
      await api.certificates.remove(id);
      toast("Документ удалён");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось удалить документ"));
    }
  };

  return (
    <>
      <PageHead
        title="Справки и сертификаты"
        text="Выберите программу и обучающихся — документы будут сформированы автоматически по загруженному шаблону и появятся у обучающихся."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        {programs.length === 0 ? (
          <div className="card">
            <div className="empty">Пока нет обучающихся с заполненным заявлением.</div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <div className="field">
                <select
                  aria-label="Программа"
                  value={activeCourseId ?? ""}
                  onChange={(e) => {
                    setCourseId(Number(e.target.value));
                    selection.clear();
                  }}
                >
                  {programs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-light" onClick={() => selection.set(rows.map((e) => e.id))}>
                Выбрать всю программу
              </button>
              <span className="toolbar-spacer" />
              <span className="muted">
                Шаблоны можно изменить в разделе <Link to="/admin/templates">«Шаблоны документов»</Link>
              </span>
            </div>

            {chosenIds.length > 0 && (
              <div className="selection-bar">
                <b>Выбрано: {chosenIds.length}</b>
                <button className="btn btn-red btn-sm" disabled={busy} onClick={() => issue("certificate")}>
                  Сформировать сертификаты
                </button>
                <button className="btn btn-light btn-sm" disabled={busy} onClick={() => issue("reference")}>
                  Сформировать справки
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
                      <th>Статус</th>
                      <th>Выданные документы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((e) => (
                      <tr key={e.id}>
                        <td className="col-check">
                          <input type="checkbox" aria-label={`Выбрать ${studentName(e)}`} checked={selection.selected.has(e.id)} onChange={() => selection.toggle(e.id)} />
                        </td>
                        <td className="cell-title">{studentName(e)}</td>
                        <td>
                          <StatusBadge status={e.status} />
                        </td>
                        <td>
                          {e.certificates.length === 0 && <span className="muted">—</span>}
                          <div className="actions">
                            {e.certificates.map((c) => (
                              <span key={c.id} className="tag">
                                <a href={api.certificates.url(c.id)} target="_blank" rel="noreferrer">
                                  {TYPE_LABEL[c.type]} № {c.number}
                                </a>
                                <button
                                  type="button"
                                  className="icon-btn"
                                  style={{ width: "1.25rem", height: "1.25rem", border: 0, background: "transparent" }}
                                  onClick={() => revoke(c.id, c.number)}
                                  aria-label={`Удалить документ ${c.number}`}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </Loading>
    </>
  );
}
