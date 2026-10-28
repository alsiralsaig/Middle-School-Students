export type ShellTheme = 'light' | 'medium' | 'dark';

export const THEME_KEY = 'sudanese_platform_theme_v2';

export const THEME_LABEL: Record<ShellTheme, string> = {
  light: 'فاتح',
  medium: 'متوسط',
  dark: 'داكن',
};

export function readSavedTheme(): ShellTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'medium' || saved === 'dark') return saved;
    /* النسخ القديمة كانت true/dark فقط */
    if (saved === 'true' || saved === 'dark') return 'dark';
    if (saved === 'false' || saved === 'light') return 'light';
  } catch {
    /* تجاهل */
  }
  return 'light';
}

export function applyTheme(theme: ShellTheme): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* تجاهل */
  }
}
