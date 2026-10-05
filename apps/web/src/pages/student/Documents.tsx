import { useState } from "react";
import { Link } from "react-router-dom";
import { REQUIRED_DOCUMENT_KINDS, type DocumentKind, type EnrollmentDetail, type EnrollmentDocument } from "@meridian/shared";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { fmtDateTime, fmtSize } from "../../lib/format";
import { getProgress } from "../../lib/progress";

const ACCEPT = ".pdf,.jpg,.jpeg,.png";

function UploadButton({
  label,
  disabled,
  light = true,
  onFile,
}: {
  label: string;
  disabled: boolean;
  light?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className={`btn btn-sm ${light ? "btn-light" : "btn-primary"} upload-inline${disabled ? " is-disabled" : ""}`}>
      {label}
      <input
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function DocRow({ icon, done, title, note, children }: { icon: string; done: boolean; title: string; note: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="doc-row">
      <div className="doc-main">
        <div className={`doc-icon${done ? " is-done" : ""}`}>{done ? "✓" : icon}</div>
        <div>
          <b>{title}</b>
          <small>{note}</small>
        </div>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

function DocumentSet({ enrollment, onChanged }: { enrollment: EnrollmentDetail; onChanged: () => Promise<void> }) {
  const { toast, toastError } = useToast();
  const [busy, setBusy] = useState(false);
  const app = enrollment.application;
  const progress = getProgress(enrollment);

  const upload = async (kind: DocumentKind, file: File) => {
    setBusy(true);
    try {
      await api.documents.upload(enrollment.id, kind, file);
      toast("Документ загружен");
      await onChanged();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось загрузить файл"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc: EnrollmentDocument) => {
    if (!confirm(`Удалить файл «${doc.fileName}»?`)) return;
    try {
      await api.documents.remove(doc.id);
      toast("Файл удалён");
      await onChanged();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось удалить файл"));
    }
  };

  const fileActions = (doc: EnrollmentDocument) => (
    <>
      <a className="btn btn-light btn-sm" href={api.documents.url(doc.id)} target="_blank" rel="noreferrer">
        Открыть
      </a>
      <button className="btn btn-danger btn-sm" onClick={() => remove(doc)}>
        Удалить
      </button>
    </>
  );

  const fileNote = (doc: EnrollmentDocument) => `${doc.fileName} · ${fmtSize(doc.size)} · ${fmtDateTime(doc.uploadedAt)}`;
  const others = enrollment.documents.filter((d) => d.kind === "other");
  const pdfLink = (type: "application" | "contract", label = "Открыть PDF") => (
    <a className="btn btn-light btn-sm" href={api.applications.documentUrl(enrollment.id, type)} target="_blank" rel="noreferrer">
      {label}
    </a>
  );

  return (
    <section className="card">
      <div className="set-head">
        <div>
          <div className="kicker">Комплект документов · {progress.docsDone} из {progress.docsTotal}</div>
          <h2>{enrollment.course.title}</h2>
        </div>
        <StatusBadge status={enrollment.status} />
      </div>

      <div className="doc-list">
        <DocRow
          icon="PDF"
          done={!!app?.signedAt}
          title="Заявление"
          note={app ? (app.signedAt ? `Подписано электронной подписью ${fmtDateTime(app.signedAt)}` : "Сформировано, ожидает вашей подписи") : "Ещё не заполнено"}
        >
          {app && pdfLink("application")}
          {(!app || !app.signedAt) && (
            <Link className="btn btn-red btn-sm" to={`/student/applications/${enrollment.id}`}>
              {app ? "Подписать" : "Заполнить"}
            </Link>
          )}
        </DocRow>

        <DocRow
          icon="PDF"
          done={!!app?.signedByExecutorAt}
          title={enrollment.contractNumber && app?.signedByExecutorAt ? `Договор № ${enrollment.contractNumber}` : "Договор"}
          note={
            app?.signedByExecutorAt
              ? `Подписан исполнителем ${fmtDateTime(app.signedByExecutorAt)}`
              : app?.signedAt
                ? "Ожидает регистрации и подписи исполнителя — появится здесь автоматически"
                : "Появится после подписания заявления и регистрации договора администратором"
          }
        >
          {app?.signedByExecutorAt && pdfLink("contract")}
        </DocRow>

        {REQUIRED_DOCUMENT_KINDS.map(({ kind, label }) => {
          const doc = enrollment.documents.find((d) => d.kind === kind);
          return (
            <DocRow key={kind} icon={kind === "passport" ? "ID" : "PDF"} done={!!doc} title={label} note={doc ? fileNote(doc) : "Файл не загружен"}>
              {doc && fileActions(doc)}
              <UploadButton label={doc ? "Заменить" : "Загрузить"} disabled={busy} onFile={(f) => upload(kind, f)} />
            </DocRow>
          );
        })}

        {others.map((doc) => (
          <DocRow key={doc.id} icon="PDF" done title="Дополнительный документ" note={fileNote(doc)}>
            {fileActions(doc)}
          </DocRow>
        ))}
      </div>

      <div className="divider" />
      <div className="actions">
        <UploadButton label="+ Добавить другой документ" disabled={busy} onFile={(f) => upload("other", f)} />
        <span className="field-hint">Дополнительные документы загружаются в комплект этой программы.</span>
      </div>
    </section>
  );
}

export function Documents() {
  const { data, loading, error, reload } = useEnrollments();

  return (
    <>
      <PageHead
        title="Документы"
        text="Комплект документов формируется отдельно для каждой программы. Загрузите файлы PDF, JPG или PNG размером до 10 МБ — они попадут в электронное личное дело."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        {data?.length === 0 ? (
          <div className="card">
            <div className="empty">
              Документы появятся после записи на программу.
              <br />
              <Link className="btn btn-primary" to="/student/courses">
                Выбрать курс
              </Link>
            </div>
          </div>
        ) : (
          <div className="stack">
            {data?.map((e) => (
              <DocumentSet key={e.id} enrollment={e} onChanged={reload} />
            ))}
          </div>
        )}
      </Loading>
    </>
  );
}
