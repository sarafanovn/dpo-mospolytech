import { ErrorState } from "./ErrorState";

/** Renders children once data is available; handles the loading and error states for a page. */
export function Loading({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading) return <div className="page-loading">Загрузка…</div>;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}
