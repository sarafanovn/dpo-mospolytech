import type { Progress } from "../lib/progress";

export function Stepper({ progress }: { progress: Progress }) {
  return (
    <div className="steps">
      {progress.steps.map((step, i) => (
        <div key={step.label} className={`step ${step.done ? "done" : i === progress.currentIndex ? "current" : ""}`}>
          <span className="num">{String(i + 1).padStart(2, "0")}</span>
          <b>{step.label}</b>
        </div>
      ))}
    </div>
  );
}
