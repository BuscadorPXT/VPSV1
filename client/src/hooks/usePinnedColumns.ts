import { useState } from 'react';

export function usePinnedColumns(initialColumns: string[] = []) {
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set(initialColumns));

  const isPinned = (column: string) => pinnedColumns.has(column);

  const togglePin = (column: string) => {
    setPinnedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(column)) {
        newSet.delete(column);
      } else {
        newSet.add(column);
      }
      return newSet;
    });
  };

  return {
    pinnedColumns: Array.from(pinnedColumns),
    isPinned,
    togglePin
  };
}