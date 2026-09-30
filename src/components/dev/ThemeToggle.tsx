"use client";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";

/** Dev-only theme switch. Sets data-theme on <html>; "system" follows prefers-color-scheme. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tippla-theme") as Theme | null;
      if (saved) setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme);
    try { localStorage.setItem("tippla-theme", theme); } catch {}
  }, [theme]);
  return (
    <div role="group" aria-label="Theme" className="inline-flex rounded-pill border border-line bg-surface p-t1">
      {(["system", "light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          aria-pressed={theme === t}
          className={`min-h-tap rounded-pill px-t4 text-small capitalize ${theme === t ? "bg-accent text-on-accent" : "text-text-muted"}`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
