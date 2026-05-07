"use client";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ps-dark";

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function useDarkMode() {
  const [dark, setDarkState] = useState(false);

  // Read on mount (client-only)
  useEffect(() => {
    const isDark = readStored();
    setDarkState(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const setDark = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setDarkState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
        document.documentElement.classList.toggle("dark", next);
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggle = useCallback(() => setDark((v) => !v), [setDark]);

  return { dark, setDark, toggle };
}
