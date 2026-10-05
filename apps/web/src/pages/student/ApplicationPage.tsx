import { useCallback, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  APPLICATION_FIELD_GROUPS,
  EMPTY_APPLICATION_FORM,
  formatIsoDate,
  type ApplicationForm,
  type EnrollmentDetail,
} from "@meridian/shared";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../ToastContext";
import { errorMessage, useAsync } from "../../hooks/useAsync";
import { fmtDateTime } from "../../lib/format";

export function ApplicationPage() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const id = Number(enrollmentId);

  const load = useCallback(async () => {
    const [enrollment, all] = await Promise.all([api.enrollments.get(id), api.enrollments.list()]);
    return { enrollment, previousForm: all.find((e) => e.id !== id && e.application)?.application?.form ?? null };
  }, [id]);
  const { data, loading, error, reload } = useAsync(load, "Не удалось загрузить заявление");

  return (
    <>
      <PageHead title="Заявление" text="Заполните данные, сохраните их, проверьте сформированный PDF и подпишите электронной подписью.">
        <Link className="btn btn-light" to="/student/applications">
          ← Мои записи
        </Link>
      </PageHead>
      <Loading loading={loading} error={error} onRetry={reload}>
        {data && <ApplicationEditor key={id} enrollment={data.enrollment} previousForm={data.previousForm} onChanged={reload} />}
      </Loading>
    </>
  );
}

function ApplicationEditor({
  enrollment,
  previousForm,
  onChanged,
}: {
  enrollment: EnrollmentDetail;
  previousForm: ApplicationForm | null;
  onChanged: () => Promise<void>;
}) {
  const id = enrollment.id;
  const { user } = useAuth();
  const { toast, toastError } = useToast();
  const app = enrollment.application;

  // Initial values: saved form > data from the student's other enrollment > profile.
  const [form, setForm] = useState<ApplicationForm>(
    () =>
      app?.form ?? {
        ...EMPTY_APPLICATION_FORM,
        ...(previousForm ?? {}),
        fullName: previousForm?.fullName || user?.fullName || "",
        email: previousForm?.email || user?.email || "",
        phone: previousForm?.phone || user?.phone || "",
        birthDate: previousForm?.birthDate || user?.birthDate || "",
        branch: previousForm?.branch || user?.branch || "",
      },
  );
  const [dirty, setDirty] = useState(!app);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [pdfVersion, setPdfVersion] = useState(0);

  const setField = (key: keyof ApplicationForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const locked = !!app?.signedByExecutorAt;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.applications.save(id, form);
      await onChanged();
      setDirty(false);
      setConsent(false);
      setPdfVersion((v) => v + 1);
      toast(app?.signedAt ? "Данные сохранены. Подпись сброшена — подпишите заявление заново." : "Данные сохранены");
    } catch (err) {
      setFormError(errorMessage(err, "Не удалось сохранить заявление"));
    } finally {
      setSaving(false);
    }
  };

  const sign = async () => {
    setSigning(true);
    try {
      await api.applications.sign(id);
      await onChanged();
      setPdfVersion((v) => v + 1);
      toast("Заявление подписано электронной подписью");
    } catch (err) {
      toastError(errorMessage(err, "Не удалось подписать заявление"));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <div className="card-title-row">
          <h2>Данные заявления</h2>
          <StatusBadge status={enrollment.status} />
        </div>
        <ProgramNotice enrollment={enrollment} />
        {locked && (
          <div className="notice warn" style={{ margin: "1rem 0" }}>
            Договор подписан исполнителем — данные заявления изменить нельзя.
          </div>
        )}
        <form onSubmit={save} style={{ marginTop: "1rem" }}>
          {APPLICATION_FIELD_GROUPS.map((group) => (
            <fieldset key={group.title} style={{ border: 0, padding: 0, margin: 0 }} disabled={locked}>
              <h3 className="form-group-title">{group.title}</h3>
              <div className="grid-2">
                {group.fields.map((f) => {
                  const wide = f.type === "textarea" || (f.type === "select" && (f.options?.length ?? 0) > 6);
                  return (
                    <div className="field" key={f.key} style={wide ? { gridColumn: "1 / -1" } : undefined}>
                      <label htmlFor={f.key}>{f.label}</label>
                      {f.type === "textarea" ? (
                        <textarea id={f.key} required value={form[f.key]} onChange={(e) => setField(f.key, e.target.value)} />
                      ) : f.type === "select" ? (
                        <select id={f.key} required value={form[f.key]} onChange={(e) => setField(f.key, e.target.value)}>
                          <option value="" disabled>
                            Выберите…
                          </option>
                          {f.options?.map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={f.key}
                          type={f.type}
                          required
                          value={form[f.key]}
                          placeholder={f.hint}
                          onChange={(e) => setField(f.key, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {formError && <div className="error-banner">{formError}</div>}
          {app?.signedAt && dirty && !locked && (
            <div className="notice warn" style={{ marginBottom: "1rem" }}>
              После сохранения изменений электронная подпись будет сброшена — заявление нужно подписать заново.
            </div>
          )}
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={saving || locked || (!dirty && !!app)}>
              {saving ? "Сохраняем…" : app ? "Сохранить изменения" : "Сохранить и сформировать заявление"}
            </button>
          </div>
        </form>
      </section>

      {app && (
        <section className="card">
          <div className="card-title-row">
            <h2>Сформированное заявление</h2>
            <a className="btn btn-light btn-sm" href={api.applications.documentUrl(id, "application")} target="_blank" rel="noreferrer">
              Открыть PDF
            </a>
          </div>
          <iframe
            key={pdfVersion}
            className="pdf-frame"
            title="Заявление (PDF)"
            src={`${api.applications.documentUrl(id, "application")}#toolbar=0`}
          />
          <div className="divider" />
          {app.signedAt ? (
            <div className="notice success">
              <b>Заявление подписано электронной подписью.</b>
              <br />
              {fmtDateTime(app.signedAt)}. Подпись размещена в заявлении вместо пустой строки.
              <br />
              Следующий шаг — <Link to="/student/documents">загрузить документы</Link> по этой программе.
            </div>
          ) : (
            <>
              <label className="checkbox">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={dirty} />Я проверил данные
                заявления и подтверждаю подписание электронной подписью.
              </label>
              {dirty && <p className="field-hint">Сначала сохраните изменения в форме.</p>}
              <div className="actions" style={{ marginTop: "1rem" }}>
                <button className="btn btn-red" onClick={sign} disabled={!consent || dirty || signing}>
                  {signing ? "Подписываем…" : "Подписать электронной подписью"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ProgramNotice({ enrollment }: { enrollment: EnrollmentDetail }) {
  const c = enrollment.course;
  return (
    <div className="notice info">
      Программа: <b>{c.title}</b>, {c.hours} ак. ч., форма обучения: {c.studyForm}, период обучения {formatIsoDate(c.durationFrom)} —{" "}
      {formatIsoDate(c.durationTo)}.
    </div>
  );
}
