export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-ghost" onClick={onRetry} style={{ flexShrink: 0 }}>
          Повторить
        </button>
      )}
    </div>
  );
}
