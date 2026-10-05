import { useState } from "react";
import type { BatchResult, EnrollmentDetail, EnrollmentStatus } from "@meridian/shared";
import { api } from "../api";
import { useToast } from "../ToastContext";
import { errorMessage } from "../hooks/useAsync";
import { batchMessage } from "../lib/batch";
import { fmtDate, fmtDateTime, fmtSize } from "../lib/format";
import { studentName } from "../lib/progress";
import { Modal } from "./Modal";
import { StatusBadge } from "./StatusBadge";

const STATUS_ACTIONS: { status: EnrollmentStatus; label: string }[] = [
  { status: "approved", label: "Зачислить" },
  { status: "completed", label: "Обучение завершено" },
];

/** Electronic personal file of one enrollment: documents, contract and status controls. */
export function EnrollmentFileModal({
  enrollment,
  onClose,
  onChanged,
}: {
  enrollment: EnrollmentDetail;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { toast, toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const app = enrollment.application;
  const form = app?.form;

  const run = async (action: () => Promise<unknown>, success: string | ((r: never) => string)) => {
    setBusy(true);
    try {
      const result = await action();
      toast(typeof success === "function" ? success(result as never) : success);
      await onChanged();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось выполнить действие"));
    } finally {
      setBusy(false);
    }
  };

  const ids = [enrollment.id];
  const pdf = (type: "application" | "contract") => (
    <a className="btn btn-light btn-sm" href={api.applications.documentUrl(enrollment.id, type)} target="_blank" rel="noreferrer">
      Открыть PDF
    </a>
  );

  return (
    <Modal title="Электронное личное дело" onClose={onClose} wide>
      <p style={{ marginTop: 0 }}>
        <b>{studentName(enrollment)}</b>
        <br />
        <span className="muted">
          {enrollment.student.email}
          {form?.branch ? ` · ${form.branch}` : ""}
          {form?.phone ? ` · ${form.phone}` : ""}
        </span>
      </p>
      <div className="notice info">
        <b>{enrollment.course.title}</b>
        <br />
        {enrollment.course.hours} ак. ч. · {enrollment.course.studyForm} · {fmtDate(enrollment.course.durationFrom)} —{" "}
        {fmtDate(enrollment.course.durationTo)}
      </div>

      <h3 style={{ margin: "1.375rem 0 0.75rem" }}>Документы</h3>
      <div className="doc-list">
        <div className="doc-row">
          <div className="doc-main">
            <div className={`doc-icon${app?.signedAt ? " is-done" : ""}`}>{app?.signedAt ? "✓" : "PDF"}</div>
            <div>
              <b>Заявление</b>
              <small>{app ? (app.signedAt ? `Подписано ${fmtDateTime(app.signedAt)}` : "Заполнено, не подписано") : "Не заполнено"}</small>
            </div>
          </div>
          <div className="actions">
            {app && pdf("application")}
            {app && (
              <a className="btn btn-light btn-sm" href={api.applications.documentUrl(enrollment.id, "personal-data")}>
                Данные (XLSX)
              </a>
            )}
          </div>
        </div>
        {enrollment.documents.map((d) => (
          <div className="doc-row" key={d.id}>
            <div className="doc-main">
              <div className="doc-icon is-done">✓</div>
              <div>
                <b>
                  {{ passport: "Паспорт", inn: "ИНН", education: "Документ об образовании", other: "Дополнительный документ" }[d.kind]}
                </b>
                <small>
                  {d.fileName} · {fmtSize(d.size)}
                </small>
              </div>
            </div>
            <a className="btn btn-light btn-sm" href={api.documents.url(d.id)} target="_blank" rel="noreferrer">
              Открыть
            </a>
          </div>
        ))}
        {enrollment.documents.length === 0 && <div className="empty">Файлы обучающийся пока не загрузил.</div>}
      </div>

      <h3 style={{ margin: "1.375rem 0 0.75rem" }}>Договор</h3>
      <div className="contract-box">
        <div>
          {enrollment.contractNumber ? (
            <>
              <b>№ {enrollment.contractNumber}</b>
              <br />
              <span className="muted">
                {app?.signedByExecutorAt ? `Подписан исполнителем ${fmtDateTime(app.signedByExecutorAt)}` : "Зарегистрирован, ожидает подписи исполнителя"}
              </span>
            </>
          ) : (
            <span className="muted">Договор не зарегистрирован.</span>
          )}
        </div>
        <div className="actions">
          {!app?.signedAt ? (
            <span className="field-hint">Договор можно зарегистрировать после подписания заявления обучающимся.</span>
          ) : (
            <>
              {!enrollment.contractNumber && (
                <button className="btn btn-light btn-sm" disabled={busy} onClick={() => run(() => api.enrollments.registerContracts(ids), (r: BatchResult) => batchMessage("Зарегистрировано договоров", r))}>
                  Зарегистрировать договор
                </button>
              )}
              {!app.signedByExecutorAt && (
                <button className="btn btn-red btn-sm" disabled={busy} onClick={() => run(() => api.enrollments.signContracts(ids), (r: BatchResult) => batchMessage("Подписано договоров", r))}>
                  Подписать договор
                </button>
              )}
              {app.signedByExecutorAt && (
                <>
                  {pdf("contract")}
                  <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => confirm("Отменить подписание? У обучающегося исчезнет PDF договора.") && run(() => api.enrollments.unsignContracts(ids), (r: BatchResult) => batchMessage("Подписание отменено", r))}>
                    Отменить подписание
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <h3 style={{ margin: "1.375rem 0 0.75rem" }}>Статус</h3>
      <div className="actions">
        <StatusBadge status={enrollment.status} />
        {STATUS_ACTIONS.map((a) => (
          <button
            key={a.status}
            className={`btn btn-sm ${enrollment.status === a.status ? "btn-primary" : "btn-light"}`}
            disabled={busy || enrollment.status === a.status}
            onClick={() => run(() => api.enrollments.setStatus(enrollment.id, a.status), "Статус обновлён")}
          >
            {a.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
