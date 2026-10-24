import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Cat, Moon, Sparkles, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cycleTheme, parseStoredTheme, shouldShowCatDecorations, themeLabel, type Theme } from './themeModel';
import { useCatButtonMotion } from './useCatButtonMotion';
import { CatPopIn } from './CatPopIn';

const ThemeCtx = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  catDecorations: boolean;
  setCatDecorations: (enabled: boolean) => void;
}>({
  theme: 'light',
  setTheme: () => {},
  catDecorations: false,
  setCatDecorations: () => {},
});
const KEY = 'dispatch-theme';
const CAT_KEY = 'dispatch-cat-decorations';

function initial(): Theme {
  try {
    const stored = window.localStorage.getItem(KEY);
    const saved = parseStoredTheme(stored);
    if (saved) return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function initialCatDecorations(): boolean {
  try {
    const stored = window.localStorage.getItem(CAT_KEY);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
    // Preserve the previous Cat theme's decorations when upgrading its saved setting.
    return window.localStorage.getItem(KEY) === 'cat';
  } catch { /* storage unavailable */ }
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const [catDecorations, setCatDecorations] = useState(initialCatDecorations);
  const showCats = shouldShowCatDecorations(theme, catDecorations);
  useCatButtonMotion(showCats);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark' || theme === 'cyberpunk');
    root.dataset.theme = theme;
    root.dataset.catDecorations = String(showCats);
    try { window.localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme, showCats]);
  useLayoutEffect(() => {
    try { window.localStorage.setItem(CAT_KEY, String(catDecorations)); } catch { /* ignore */ }
  }, [catDecorations]);
  return (
    <ThemeCtx.Provider value={{ theme, setTheme, catDecorations, setCatDecorations }}>
      {children}
      {showCats && <CatPopIn />}
    </ThemeCtx.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, catDecorations, setCatDecorations } = useContext(ThemeCtx);
  const transitionInProgress = useRef(false);
  const requestedTheme = useRef(theme);
  const next = cycleTheme(theme);
  const nextLabel = themeLabel(next);
  const currentLabel = themeLabel(theme);

  const icon = next === 'dark'
    ? <Moon size={16} />
    : next === 'cyberpunk'
      ? <Sparkles size={16} />
      : next === 'cat'
        ? <Cat size={16} />
        : <Sun size={16} />;
  const showCats = shouldShowCatDecorations(theme, catDecorations);

  const toggleFromButton = (button: HTMLButtonElement) => {
    requestedTheme.current = cycleTheme(requestedTheme.current);
    const applyLatestTheme = () => setTheme(requestedTheme.current);
    if (transitionInProgress.current) {
      flushSync(applyLatestTheme);
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof document.startViewTransition !== 'function') {
      applyLatestTheme();
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

    try {
      transitionInProgress.current = true;
      const transition = document.startViewTransition(() => flushSync(applyLatestTheme));
      void transition.finished
        .catch(() => undefined)
        .finally(() => { transitionInProgress.current = false; });
    } catch {
      transitionInProgress.current = false;
      applyLatestTheme();
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="theme-toggle-wrap">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => toggleFromButton(event.currentTarget)}
          aria-label={`Current theme: ${currentLabel}. Switch to ${nextLabel} theme`}
          title={`Current theme: ${currentLabel} · Switch to ${nextLabel}`}
          data-testid="button-theme-toggle"
        >
          {icon}
        </Button>
      </span>
      <span className="cat-toggle-wrap">
        {showCats && (
          <svg className="theme-cat-sticker" viewBox="0 0 40 34" aria-hidden="true">
            <path d="M7 12 5 2l10 5a17 17 0 0 1 10 0l10-5-2 10a13 13 0 1 1-26 0Z" />
            <path d="M14 15h.1M26 15h.1M16 21q4 4 8 0M18 18l2 2 2-2" />
            <path d="M11 19 4 17m7 7-7 1m25-6 7-2m-7 7 7 1" />
          </svg>
        )}
        <Button
          type="button"
          variant={catDecorations ? 'secondary' : 'ghost'}
          size="icon"
          aria-pressed={catDecorations}
          aria-label={`Cat decorations ${catDecorations ? 'on' : 'off'}. ${catDecorations ? 'Turn off' : 'Turn on'} playful cats`}
          title={`Playful cats: ${catDecorations ? 'on' : 'off'}`}
          data-testid="button-cat-decorations-toggle"
          onClick={() => setCatDecorations(!catDecorations)}
        >
          <Cat size={16} />
        </Button>
      </span>
    </div>
  );
}
