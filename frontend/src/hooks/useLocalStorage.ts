"use client";

import { useEffect, useState } from "react";
import type { z } from "zod";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  schema: z.ZodType<T>,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          setValue(parsed.data);
        }
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    setHydrated(true);
  }, [key, schema]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
