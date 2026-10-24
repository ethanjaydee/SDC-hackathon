export const THEMES = ['light', 'dark', 'cyberpunk', 'cat'] as const;

export type Theme = (typeof THEMES)[number];

export function cycleTheme(theme: Theme): Theme {
  const currentIndex = THEMES.indexOf(theme);
  return THEMES[(currentIndex + 1) % THEMES.length];
}

export function parseStoredTheme(value: string | null): Theme | null {
  return THEMES.includes(value as Theme) ? (value as Theme) : null;
}

export function themeLabel(theme: Theme): string {
  switch (theme) {
    case 'light':
      return 'light';
    case 'dark':
      return 'night';
    case 'cyberpunk':
      return 'cyberpunk';
    case 'cat':
      return 'cat';
  }
}
