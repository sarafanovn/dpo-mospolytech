import { useState, type FormEvent } from "react";
import { STUDY_FORMS, type Course } from "@meridian/shared";
import { api, type CourseInput } from "../../api";
import { Loading } from "../../components/Loading";
import { Modal } from "../../components/Modal";
import { PageHead } from "../../components/PageHead";
import { useToast } from "../../ToastContext";
import { errorMessage, useAsync } from "../../hooks/useAsync";
import { fmtDate } from "../../lib/format";

const EMPTY: CourseInput = {
  title: "",
  hours: 72,
  durationFrom: "",
  durationTo: "",
  description: "",
  studyForm: "очно-заочная",
  sdoUrl: "",
};

const loadCourses = () => api.courses.list();

export function AdminCourses() {
  const { data, loading, error, reload } = useAsync(loadCourses, "Не удалось загрузить курсы");
  const { toast, toastError } = useToast();
  const [modal, setModal] = useState<{ editing: Course | null } | null>(null);
  const [form, setForm] = useState<CourseInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = (course: Course | null) => {
    setForm(course ? { ...course } : EMPTY);
    setFormError(null);
    setModal({ editing: course });
  };

  const set = <K extends keyof CourseInput>(key: K, value: CourseInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload: CourseInput = {
        title: form.title,
        hours: form.hours,
        durationFrom: form.durationFrom,
        durationTo: form.durationTo,
        description: form.description,
        studyForm: form.studyForm,
        sdoUrl: form.sdoUrl,
      };
      if (modal?.editing) await api.courses.update(modal.editing.id, payload);
      else await api.courses.create(payload);
      toast("Курс сохранён");
      setModal(null);
      await reload();
    } catch (err) {
      setFormError(errorMessage(err, "Не удалось сохранить курс"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Удалить курс «${course.title}»?`)) return;
    try {
      await api.courses.remove(course.id);
      toast("Курс удалён");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось удалить курс"));
    }
  };

  return (
    <>
      <PageHead title="Курсы ДПО" text="Формирование перечня курсов с указанием наименования, сроков обучения, формы обучения и количества часов.">
        <button className="btn btn-red" onClick={() => openModal(null)}>
          + Добавить курс
        </button>
      </PageHead>
      <Loading loading={loading} error={error} onRetry={reload}>
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Сроки</th>
                  <th>Часы</th>
                  <th>Форма</th>
                  <th>СДО</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data?.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-title">{c.title}</td>
                    <td>
                      {fmtDate(c.durationFrom)}
                      <br />
                      {fmtDate(c.durationTo)}
                    </td>
                    <td>{c.hours}</td>
                    <td>{c.studyForm}</td>
                    <td>
                      {c.sdoUrl ? (
                        <a href={c.sdoUrl} target="_blank" rel="noreferrer">
                          Ссылка
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-light btn-sm" onClick={() => openModal(c)}>
                          Изменить
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {data?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Курсы пока не добавлены.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </Loading>

      {modal && (
        <Modal title={modal.editing ? "Редактировать курс" : "Новый курс ДПО"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="title">Наименование</label>
              <input id="title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="from">Дата начала</label>
                <input id="from" type="date" required value={form.durationFrom} onChange={(e) => set("durationFrom", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="to">Дата окончания</label>
                <input id="to" type="date" required value={form.durationTo} onChange={(e) => set("durationTo", e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="hours">Количество часов</label>
                <input id="hours" type="number" min={1} required value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} />
              </div>
              <div className="field">
                <label htmlFor="form">Форма обучения</label>
                <select id="form" value={form.studyForm} onChange={(e) => set("studyForm", e.target.value as Course["studyForm"])}>
                  {STUDY_FORMS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="sdo">Ссылка на курс в СДО</label>
              <input id="sdo" type="url" placeholder="https://sdo.mospolytech.ru/course/…" value={form.sdoUrl} onChange={(e) => set("sdoUrl", e.target.value)} />
              <span className="field-hint">Обучающиеся перейдут по ней с баннера программы.</span>
            </div>
            <div className="field">
              <label htmlFor="description">Описание</label>
              <textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            {formError && <div className="error-banner">{formError}</div>}
            <button className="btn btn-red" disabled={saving}>
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
