import { useCallback, useEffect, useRef, useState } from "react";

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Runs `load` on mount and whenever its identity changes. Pass a stable function (module-level or useCallback).
 * `reload` refetches in the background without flashing the loading state. Responses of superseded calls are dropped.
 * Key the consuming component by the inputs of `load` if stale data must not show while a new request is in flight.
 */
export function useAsync<T>(load: () => Promise<T>, fallbackError = "Не удалось загрузить данные") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);

  const reload = useCallback(async () => {
    const run = ++latest.current;
    try {
      const result = await load();
      if (run !== latest.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (run !== latest.current) return;
      setError(errorMessage(err, fallbackError));
    } finally {
      if (run === latest.current) setLoading(false);
    }
  }, [load, fallbackError]);

  useEffect(() => {
    // Fetch-on-mount: the state updates happen after the awaited request, not synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}
