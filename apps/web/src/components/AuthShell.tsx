import type { ReactNode } from "react";
import logoWhite from "../assets/logo-white.svg";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-shell">
      <section className="login-visual">
        <img className="login-logo" src={logoWhite} alt="Московский Политех" />
        <div className="hero-copy">
          <div className="eyebrow">ДПО / филиалы</div>
          <h1>
            Обучение.
            <br />
            Документы.
            <br />
            Результат.
          </h1>
          <p>
            Единый портал информационной поддержки обучающихся филиалов при прохождении программ дополнительного
            профессионального образования.
          </p>
        </div>
        <div className="login-caption">Московский Политех · Портал ДПО</div>
      </section>
      <section className="login-panel">{children}</section>
    </div>
  );
}
