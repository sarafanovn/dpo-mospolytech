import { useState, type FormEvent } from "react";
import { useAuth } from "../../AuthContext";
import "./student.css";

export function Profile() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile({ fullName, phone, birthDate });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="eyebrow">Личный кабинет</div>
      <h1 className="page-title">Профиль</h1>
      <div className="card" style={{ maxWidth: "35rem" }}>
        <p style={{ color: "var(--gray-700)", marginBottom: "1.25rem" }}>
          Эти данные будут автоматически подставлены при заполнении анкеты на курс.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Ф. И. О.</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div className="field">
            <label>E-mail</label>
            <div className="hint">Используется как логин, изменить нельзя</div>
            <input type="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="field">
            <label htmlFor="phone">Телефон</label>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
            />
          </div>
          <div className="field">
            <label htmlFor="birthDate">Дата рождения</label>
            <input
              id="birthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          {error && <div className="error-banner">{error}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Сохраняем…" : "Сохранить"}
            </button>
            {saved && <span className="meta-text">Сохранено</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
