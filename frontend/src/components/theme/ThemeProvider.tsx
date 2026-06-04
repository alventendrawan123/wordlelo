"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { z } from "zod";
import { SETTINGS_STORAGE_KEY } from "@/lib/game/day";

const themeSettingsSchema = z.object({
  dark: z.boolean(),
  colorblind: z.boolean(),
});

interface ThemeContextValue {
  dark: boolean;
  colorblind: boolean;
  toggleDark: () => void;
  toggleColorblind: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [colorblind, setColorblind] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let nextDark = prefersDark();
    let nextColorblind = false;
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = themeSettingsSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          nextDark = parsed.data.dark;
          nextColorblind = parsed.data.colorblind;
        }
      } catch {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
    }
    setDark(nextDark);
    setColorblind(nextColorblind);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    if (colorblind) {
      root.dataset.colorblind = "true";
    } else {
      root.removeAttribute("data-colorblind");
    }
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ dark, colorblind }),
    );
  }, [dark, colorblind, hydrated]);

  const toggleDark = useCallback(() => setDark((value) => !value), []);
  const toggleColorblind = useCallback(
    () => setColorblind((value) => !value),
    [],
  );

  const value = useMemo(
    () => ({ dark, colorblind, toggleDark, toggleColorblind }),
    [dark, colorblind, toggleDark, toggleColorblind],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
