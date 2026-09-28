import { useEffect, useState, type FormEvent } from "react";
import type { Course } from "@meridian/shared";
import { api } from "../../api";
import "./admin.css";

const EMPTY = { title: "", hours: 72, durationFrom: "", durationTo: "", description: "" };

export function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.courses.list().then(setCourses);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
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
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.courses.update(editing.id, form);
      } else {
        await api.courses.create(form);
      }
      await load();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить курс?")) return;
    await api.courses.remove(id);
    await load();
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  return (
    <div>
      <div className="admin-header">
        <div>
          <div className="eyebrow">Администрирование</div>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Курсы ДПО</h1>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          Добавить курс
        </button>
      </div>

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
                {c.durationFrom} — {c.durationTo}
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
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>{editing ? "Изменить курс" : "Новый курс"}</h2>
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
                  placeholder="дд.мм.гггг"
                  value={form.durationFrom}
                  onChange={(e) => setForm((f) => ({ ...f, durationFrom: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Срок обучения (по)</label>
                <input
                  required
                  placeholder="дд.мм.гггг"
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
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
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
