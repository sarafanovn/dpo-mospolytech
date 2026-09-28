import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logoBlack from "../assets/logo-black.svg";
import pattern from "../assets/pattern-1.svg";
import "./Auth.css";

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
      navigate("/student/courses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось зарегистрироваться");
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
          <h1 style={{ color: "#fff", fontSize: 34, marginTop: 12 }}>
            Портал информационной поддержки ДПО
          </h1>
        </div>
      </div>
      <div className="auth-form-wrap">
        <img src={logoBlack} alt="Московский Политех" className="auth-logo" />
        <div className="card auth-card">
          <div className="eyebrow">Регистрация</div>
          <h2 style={{ fontSize: 24, marginTop: 8, marginBottom: 24 }}>Создать аккаунт</h2>
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
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
              {submitting ? "Создаём…" : "Зарегистрироваться"}
            </button>
          </form>
          <div className="auth-switch">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
