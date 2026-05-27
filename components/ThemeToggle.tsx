"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ className, hidden }: { className?: string; hidden?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") === "dark";
    setIsDark(storedTheme);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    localStorage.setItem("theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark, mounted]);

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

  if (!mounted || hidden) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={className ?? "fixed right-4 top-4 z-50 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
//test commit 