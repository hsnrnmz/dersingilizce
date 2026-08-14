const THEME_KEY = 'ingilizce-theme';

/** @returns {'dark'|'light'} */
export function getTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return 'light';
}

/** @param {'dark'|'light'} theme */
export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

/** @param {'dark'|'light'} [theme] */
export function applyTheme(theme = getTheme()) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function isDarkTheme() {
  return getTheme() === 'dark';
}

export function toggleTheme() {
  setTheme(isDarkTheme() ? 'light' : 'dark');
}
