import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} });
const KEY = 'dispatch-theme';

function initial(): Theme {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { window.localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>{children}</ThemeCtx.Provider>;
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeCtx);
  const next = theme === 'dark' ? 'light' : 'dark';
  const toggleFromButton = (button: HTMLButtonElement) => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof document.startViewTransition !== 'function') {
      toggle();
      return;
    }

    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const farthestX = Math.max(x, window.innerWidth - x);
    const farthestY = Math.max(y, window.innerHeight - y);
    const root = document.documentElement;
    root.style.setProperty('--theme-origin-x', `${x}px`);
    root.style.setProperty('--theme-origin-y', `${y}px`);
    root.style.setProperty('--theme-reveal-radius', `${Math.ceil(Math.hypot(farthestX, farthestY))}px`);

    document.startViewTransition(() => flushSync(toggle));
  };
  return (
    <Button type="button" variant="ghost" size="icon" onClick={(event) => toggleFromButton(event.currentTarget)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} data-testid="button-theme-toggle">
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
