import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { AuthShell } from "../components/AuthShell";
import { PasswordField } from "../components/PasswordField";
import { errorMessage } from "../hooks/useAsync";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/student");
    } catch (err) {
      setError(errorMessage(err, "Не удалось войти"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>Вход</h2>
        <p>Используйте email и пароль. После входа система откроет кабинет в соответствии с ролью пользователя.</p>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@mospolytech.ru" />
        </div>
        <PasswordField label="Пароль" value={password} onChange={setPassword} required />
        {error && <div className="error-banner">{error}</div>}
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Входим…" : "Войти в портал"}
        </button>
        <div className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </div>
      </form>
    </AuthShell>
  );
}
