import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { APPLICATION_FIELD_GROUPS, type ApplicationForm, type Course, type Enrollment } from "@meridian/shared";
import { api, ApiError } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import { ErrorState } from "../../components/ErrorState";
import "./student.css";

const EMPTY_FORM: ApplicationForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  passport: "",
  passportIssuedBy: "",
  addressRegistration: "",
  addressResidence: "",
  education: "",
  snils: "",
  inn: "",
  educationLevel: "",
  workerCategory: "",
  positionCategory: "",
  industry: "",
};

type Stage = "form" | "sign" | "documents";

export function ApplicationWizard() {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();
  const id = Number(enrollmentId);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<ApplicationForm>(EMPTY_FORM);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [enr, courses] = await Promise.all([api.enrollments.get(id), api.courses.list()]);
        if (cancelled) return;
        setEnrollment(enr);
        setCourse(courses.find((c) => c.id === enr.courseId) ?? null);
        try {
          const application = await api.applications.get(id);
          if (cancelled) return;
          setForm(application.form);
          setSignedAt(application.signedAt);
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 404)) throw err;
          // no application yet — start from the blank form
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Не удалось загрузить заявку");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const stage: Stage = signedAt ? "documents" : step === APPLICATION_FIELD_GROUPS.length ? "sign" : "form";

  const handleFieldChange = (key: keyof ApplicationForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const currentGroup = APPLICATION_FIELD_GROUPS[step];

  const groupIsComplete = useMemo(() => {
    if (!currentGroup) return true;
    return currentGroup.fields.every((f) => form[f.key].trim().length > 0);
  }, [currentGroup, form]);

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.applications.save(id, form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить анкету");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSaveDraft();
    setStep((s) => s + 1);
  };

  const handleSign = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.applications.save(id, form);
      const application = await api.applications.sign(id);
      setSignedAt(application.signedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось подписать документы");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (loadError || !enrollment || !course) {
    return (
      <ErrorState message={loadError ?? "Заявка не найдена"} onRetry={() => setReloadKey((k) => k + 1)} />
    );
  }

  return (
    <div>
      <div className="eyebrow">Заявка на обучение</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem", marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.75rem" }}>{course.title}</h1>
        <StatusBadge status={enrollment.status} />
      </div>

      {stage === "form" && (
        <div className="card" style={{ maxWidth: "42.5rem" }}>
          <div className="wizard-steps">
            {APPLICATION_FIELD_GROUPS.map((group, i) => (
              <div key={group.title} className={`wizard-step${i === step ? " active" : ""}${i < step ? " done" : ""}`}>
                {i + 1}
              </div>
            ))}
          </div>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "1.25rem" }}>{currentGroup.title}</h2>
          {currentGroup.fields.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              {f.hint && <div className="hint">{f.hint}</div>}
              {f.type === "textarea" ? (
                <textarea id={f.key} value={form[f.key]} onChange={(e) => handleFieldChange(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <select id={f.key} value={form[f.key]} onChange={(e) => handleFieldChange(f.key, e.target.value)}>
                  <option value="" disabled>
                    — выберите —
                  </option>
                  {f.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.key}
                  type={f.type}
                  value={form[f.key]}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          {error && <div className="error-banner">{error}</div>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            {step > 0 && (
              <button className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>
                Назад
              </button>
            )}
            <button className="btn btn-primary" disabled={!groupIsComplete || saving} onClick={handleNext}>
              {saving ? "Сохраняем…" : step === APPLICATION_FIELD_GROUPS.length - 1 ? "К подписанию" : "Далее"}
            </button>
          </div>
        </div>
      )}

      {stage === "sign" && (
        <div className="card" style={{ maxWidth: "35rem" }}>
          <h2 style={{ fontSize: "1.125rem", marginBottom: "0.75rem" }}>Подписание документов</h2>
          <p style={{ color: "var(--gray-700)", marginBottom: "1.25rem" }}>
            Проверьте данные анкеты. После подписания будут сформированы заявление, договор и файл с
            персональными данными.
          </p>
          <div className="review-grid">
            {APPLICATION_FIELD_GROUPS.flatMap((g) => g.fields).map((f) => (
              <div key={f.key} className="review-item">
                <div className="review-label">{f.label}</div>
                <div className="review-value">{form[f.key]}</div>
              </div>
            ))}
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button className="btn btn-secondary" onClick={() => setStep(APPLICATION_FIELD_GROUPS.length - 1)}>
              Редактировать анкету
            </button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSign}>
              {saving ? "Подписываем…" : "Создать и подписать"}
            </button>
          </div>
        </div>
      )}

      {stage === "documents" && (
        <DocumentsView enrollmentId={id} />
      )}
    </div>
  );
}

function DocumentsView({ enrollmentId }: { enrollmentId: number }) {
  const docs: { type: "application" | "contract" | "personal-data"; label: string; downloadLabel: string }[] = [
    { type: "application", label: "Заявление", downloadLabel: "Скачать «Заявление» (PDF)" },
    { type: "contract", label: "Договор", downloadLabel: "Скачать «Договор» (PDF)" },
    { type: "personal-data", label: "Персональные данные", downloadLabel: "Скачать «Персональные данные» (XLSX)" },
  ];

  return (
    <div className="card" style={{ maxWidth: "47.5rem" }}>
      <h2 style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>Документы готовы</h2>
      <p style={{ color: "var(--gray-700)", marginBottom: "1.25rem" }}>
        Заявление и договор подписаны электронной подписью. Ознакомьтесь с документами ниже.
      </p>
      <div className="doc-downloads">
        {docs.map((d) => (
          <a
            key={d.type}
            className="btn btn-secondary"
            href={api.applications.documentUrl(enrollmentId, d.type)}
            target="_blank"
            rel="noreferrer"
          >
            {d.downloadLabel}
          </a>
        ))}
      </div>
      {docs
        .filter((d) => d.type !== "personal-data")
        .map((d) => (
          <div key={d.type}>
            <div className="doc-label">{d.label}:</div>
            <iframe
              className="doc-preview"
              title={d.label}
              src={api.applications.documentUrl(enrollmentId, d.type)}
            />
          </div>
        ))}
    </div>
  );
}
