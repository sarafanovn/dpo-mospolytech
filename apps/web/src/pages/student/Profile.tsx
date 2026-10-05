import { useState, type FormEvent } from "react";
import { BRANCHES } from "@meridian/shared";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";
import { PageHead } from "../../components/PageHead";
import { useToast } from "../../ToastContext";
import { useEnrollments } from "../../hooks/useEnrollments";
import { errorMessage } from "../../hooks/useAsync";
import { fmtDateTime } from "../../lib/format";

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { data: enrollments } = useEnrollments();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [birthDate, setBirthDate] = useState(user?.birthDate ?? "");
  const [branch, setBranch] = useState(user?.branch ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signedContracts = enrollments?.filter((e) => e.application?.signedByExecutorAt) ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ fullName, phone, birthDate, branch });
      toast("Профиль обновлён");
    } catch (err) {
      setError(errorMessage(err, "Не удалось сохранить профиль"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Профиль" text="Основные данные обучающегося. Они подставляются в заявление при записи на новую программу." />
      <div className="stack">
        <section className="card">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="fullName">Ф. И. О.</label>
                <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="field">
                <label htmlFor="phone">Телефон</label>
                <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (___) ___-__-__" />
              </div>
              <div className="field">
                <label htmlFor="birthDate">Дата рождения</label>
                <input id="birthDate" type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="branch">Филиал</label>
                <select id="branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="">Не выбран</option>
                  {BRANCHES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Сохраняем…" : "Сохранить профиль"}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-title-row">
            <h2>Подписанные договоры</h2>
          </div>
          {signedContracts.length === 0 ? (
            <div className="empty">Договоры появятся здесь после подписания исполнителем.</div>
          ) : (
            <div className="doc-list">
              {signedContracts.map((e) => (
                <div className="doc-row" key={e.id}>
                  <div className="doc-main">
                    <div className="doc-icon is-done">✓</div>
                    <div>
                      <b>Договор № {e.contractNumber}</b>
                      <small>
                        {e.course.title} · подписан {fmtDateTime(e.application?.signedByExecutorAt)}
                      </small>
                    </div>
                  </div>
                  <a className="btn btn-light btn-sm" href={api.applications.documentUrl(e.id, "contract")} target="_blank" rel="noreferrer">
                    Открыть PDF
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
