/** Checkbox state helper for tables with row selection and a "select all" header checkbox. */
import { useState } from "react";

export function useSelection(allIds: number[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Ignore ids that disappeared from the list (e.g. after a filter change or reload).
  const valid = new Set([...selected].filter((id) => allIds.includes(id)));

  return {
    selected: valid,
    allSelected: allIds.length > 0 && valid.size === allIds.length,
    toggle: (id: number) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () => setSelected(valid.size === allIds.length ? new Set() : new Set(allIds)),
    set: (ids: number[]) => setSelected(new Set(ids)),
    clear: () => setSelected(new Set()),
  };
}
