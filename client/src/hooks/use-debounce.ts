import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  // Always initialize with the current value to prevent initial undefined
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debouncedValue immediately if value is different
    if (debouncedValue !== value) {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay, debouncedValue]);

  return debouncedValue;
}