import { isSoundEnabled, setSoundEnabled } from './settings.js';
import { initCookieConsent } from './cookie-consent.js';
import { applySeo } from './seo.js';
import { applyTheme, isDarkTheme, toggleTheme } from './theme.js';

function themeIconMoon() {
  return `<svg class="theme-toggle-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function themeIconSun() {
  return `<svg class="theme-toggle-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
}

function themeButtonMarkup() {
  const dark = isDarkTheme();
  return `
    <button
      type="button"
      class="nav-tool-btn nav-theme-btn"
      id="theme-toggle"
      aria-pressed="${dark}"
      aria-label="${dark ? 'Açık temaya geç' : 'Koyu temaya geç'}"
      title="${dark ? 'Açık tema' : 'Koyu tema'}"
    >
      ${dark ? themeIconSun() : themeIconMoon()}
    </button>`;
}

function refreshNavTools() {
  const tools = document.querySelector('.nav-tools');
  if (!tools) return;
  tools.innerHTML = themeButtonMarkup() + soundButtonMarkup();
  bindThemeToggle();
  bindSoundToggle();
}

function bindThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    toggleTheme();
    refreshNavTools();
  });
}

function soundButtonMarkup() {
  const on = isSoundEnabled();
  return `
    <button
      type="button"
      class="nav-tool-btn"
      id="sound-toggle"
      aria-pressed="${on}"
      aria-label="${on ? 'Sesleri kapat' : 'Sesleri aç'}"
      title="${on ? 'Sesleri kapat' : 'Sesleri aç'}"
    >
      ${
        on
          ? '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05a4.5 4.5 0 0 0 2.5-4.02zM14 3.23v2.06a7 7 0 0 1 0 13.74v2.07a9 9 0 0 0 0-17.84z"/></svg>'
          : '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.5 12a4.5 4.5 0 0 0-2.5-4.03v2.14l2.45 2.45c.03-.2.05-.41.05-.56zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>'
      }
    </button>`;
}

function bindSoundToggle() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    refreshNavTools();
  });
}

function injectNavTools() {
  const navInner = document.querySelector('.nav-inner');
  if (!navInner || navInner.querySelector('.nav-tools')) return;

  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  tools.innerHTML = themeButtonMarkup() + soundButtonMarkup();
  navInner.appendChild(tools);
  bindThemeToggle();
  bindSoundToggle();
}

export function initNav() {
  applyTheme();
  applySeo();
  initCookieConsent();
  injectNavTools();

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if (!navToggle || !siteNav) return;

  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Menüyü aç');
    });
  });
}
