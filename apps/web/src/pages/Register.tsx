import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { errorMessage } from "../hooks/useAsync";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate("/student");
    } catch (err) {
      setError(errorMessage(err, "Не удалось зарегистрироваться"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Регистрация</h2>
        <p>Создайте аккаунт обучающегося, чтобы записаться на программу ДПО и оформить документы.</p>
        <div className="field">
          <label htmlFor="fullName">Ф. И. О.</label>
          <input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Иванов Иван Иванович" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mospolytech.ru" />
        </div>
        <PasswordField label="Пароль" value={password} onChange={setPassword} required minLength={6} />
        {error && <div className="error-banner">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Создаём…" : "Зарегистрироваться"}
        </button>
        <div className="auth-switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </div>
      </form>
    </AuthShell>
  );
}
