import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatCourseDate, type Course } from "@meridian/shared";
import { api } from "../../api";
import { ErrorState } from "../../components/ErrorState";
import "./admin.css";

const EMPTY = { title: "", hours: 72, durationFrom: "", durationTo: "", description: "" };

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    return api.courses.list().then(setCourses).catch((err) => {
      setLoadError(err instanceof Error ? err.message : "Не удалось загрузить курсы");
    });
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title,
      hours: course.hours,
      durationFrom: course.durationFrom,
      durationTo: course.durationTo,
      description: course.description,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await api.courses.update(editing.id, form);
      } else {
        await api.courses.create(form);
      }
      await load();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Не удалось сохранить курс");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить курс?")) return;
    setDeleteError(null);
    try {
      await api.courses.remove(id);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Не удалось удалить курс");
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  if (loadError) return <ErrorState message={loadError} onRetry={load} />;

  return (
    <div>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Администрирование</div>
          <h1 style={{ fontSize: "1.75rem", marginTop: "0.5rem" }}>Курсы ДПО</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Добавить курс
        </button>
      </div>

      {deleteError && <div style={{ marginBottom: "1.25rem" }}><ErrorState message={deleteError} /></div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Название</th>
            <th>Часы</th>
            <th>Срок обучения</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id}>
              <td style={{ fontWeight: 600 }}>{c.title}</td>
              <td>{c.hours}</td>
              <td>
                {formatCourseDate(c.durationFrom)} — {formatCourseDate(c.durationTo)}
              </td>
              <td>
                <div className="inline-actions">
                  <button className="btn btn-ghost" onClick={() => openEdit(c)}>
                    Изменить
                  </button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(c.id)}>
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {courses.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--gray-500)" }}>
                Курсы пока не добавлены.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1.25rem" }}>{editing ? "Изменить курс" : "Новый курс"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Название программы</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Объём, ак. ч.</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))}
                />
              </div>
              <div className="field">
                <label>Срок обучения (с)</label>
                <input
                  required
                  type="date"
                  value={form.durationFrom}
                  onChange={(e) => setForm((f) => ({ ...f, durationFrom: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Срок обучения (по)</label>
                <input
                  required
                  type="date"
                  value={form.durationTo}
                  onChange={(e) => setForm((f) => ({ ...f, durationTo: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {formError && <div className="error-banner">{formError}</div>}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Сохраняем…" : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
