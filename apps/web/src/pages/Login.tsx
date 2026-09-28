import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { PasswordField } from "../components/PasswordField";
import logoBlack from "../assets/logo-black.svg";
import pattern from "../assets/pattern-1.svg";
import "./Auth.css";

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
      navigate(user.role === "admin" ? "/admin/courses" : "/student/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img src={pattern} alt="" className="auth-pattern" />
        <div className="auth-visual-text">
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
            Московский Политех
          </div>
          <h1 style={{ color: "#fff", fontSize: "2.125rem", marginTop: "0.75rem" }}>
            Портал информационной поддержки ДПО
          </h1>
        </div>
      </div>
      <div className="auth-form-wrap">
        <img src={logoBlack} alt="Московский Политех" className="auth-logo" />
        <div className="card auth-card">
          <div className="eyebrow">Вход</div>
          <h2 style={{ fontSize: "1.5rem", marginTop: "0.5rem", marginBottom: "1.5rem" }}>С возвращением</h2>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="iv@an.ru"
              />
            </div>
            <PasswordField label="Пароль" value={password} onChange={setPassword} required />
            {error && <div className="error-banner">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Входим…" : "Войти"}
            </button>
          </form>
          <div className="auth-switch">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
