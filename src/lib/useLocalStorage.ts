import { useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initial;
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) && typeof initial === 'object' ? { ...initial, ...parsed } : parsed;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
