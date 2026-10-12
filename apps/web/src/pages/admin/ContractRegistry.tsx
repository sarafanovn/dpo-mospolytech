import { useState } from "react";
import { api } from "../../api";
import { EnrollmentFileModal } from "../../components/EnrollmentFileModal";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { useEnrollments } from "../../hooks/useEnrollments";
import { fmtDate } from "../../lib/format";
import { studentName } from "../../lib/progress";

type ContractState = "unsigned" | "signed";

/** Registry (база договоров) of every contract that already has a number. */
export function ContractRegistry() {
  const { data, loading, error, reload } = useEnrollments();
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("");
  const [state, setState] = useState<"" | ContractState>("");
  const [openId, setOpenId] = useState<number | null>(null);

  const registered = (data ?? []).filter((e) => e.contractNumber);
  const programs = [...new Map(registered.map((e) => [e.courseId, e.course])).values()];
  const q = query.trim().toLowerCase();

  const rows = registered
    .filter((e) => !courseId || e.courseId === Number(courseId))
    .filter((e) => !state || (state === "signed") === Boolean(e.application?.signedByExecutorAt))
    .filter((e) => !q || [e.contractNumber, studentName(e), e.student.email].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => (b.contractNumber ?? "").localeCompare(a.contractNumber ?? ""));
  const opened = data?.find((e) => e.id === openId) ?? null;

  const exportCsv = () => {
    // Names and emails are user-entered: a leading = + - @ would be run as a formula by Excel.
    const cell = (v: string) => {
      const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const lines = [
      ["Номер договора", "Дата регистрации", "Обучающийся", "Email", "Программа", "Статус договора", "Дата подписания"],
      ...rows.map((e) => [
        e.contractNumber ?? "",
        fmtDate(e.contractRegisteredAt),
        studentName(e),
        e.student.email,
        e.course.title,
        e.application?.signedByExecutorAt ? "Подписан" : "Ждёт подписи",
        fmtDate(e.application?.signedByExecutorAt),
      ]),
    ].map((r) => r.map(cell).join(";"));
    // BOM so that Excel opens the UTF-8 file with correct Cyrillic.
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reestr-dogovorov.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHead
        title="Реестр договоров"
        text="База договоров на обучение: номер формируется автоматически по шаблону ДПО-ГГГГ-NNNN при регистрации и попадает в текст договора."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="toolbar">
          <div className="field">
            <input type="search" aria-label="Поиск" placeholder="Номер, ФИО или email" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
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
          <div className="field">
            <select aria-label="Статус договора" value={state} onChange={(e) => setState(e.target.value as "" | ContractState)}>
              <option value="">Любой статус</option>
              <option value="unsigned">Ждёт подписи</option>
              <option value="signed">Подписан</option>
            </select>
          </div>
          <span className="toolbar-spacer" />
          <button className="btn btn-light" onClick={exportCsv} disabled={rows.length === 0}>
            Выгрузить в CSV ({rows.length})
          </button>
        </div>

        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>№ договора</th>
                  <th>Дата регистрации</th>
                  <th>Обучающийся</th>
                  <th>Программа</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="cell-title">{e.contractNumber}</span>
                    </td>
                    <td>{fmtDate(e.contractRegisteredAt)}</td>
                    <td>
                      <span className="cell-title">{studentName(e)}</span>
                      <small>{e.student.email}</small>
                    </td>
                    <td>{e.course.title}</td>
                    <td>
                      {e.application?.signedByExecutorAt ? (
                        <span className="status status-green">Подписан {fmtDate(e.application.signedByExecutorAt)}</span>
                      ) : (
                        <span className="status status-amber">Ждёт подписи</span>
                      )}
                    </td>
                    <td>
                      <a className="btn btn-light btn-sm" href={api.applications.documentUrl(e.id, "contract")} target="_blank" rel="noreferrer">
                        PDF
                      </a>{" "}
                      <button className="btn btn-light btn-sm" onClick={() => setOpenId(e.id)}>
                        Дело
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      {registered.length === 0
                        ? "Договоров пока нет — зарегистрируйте их в разделе «Личные дела»."
                        : "По заданным условиям договоров не найдено."}
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
