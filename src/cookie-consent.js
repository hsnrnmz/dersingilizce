import { COOKIE_CONSENT_KEY } from './site-config.js';

/** @typedef {'pending'|'essential'|'all'|'ack'} ConsentLevel */

/** @returns {ConsentLevel|null} */
export function getConsent() {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (raw === 'essential' || raw === 'all' || raw === 'ack') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {ConsentLevel} level */
export function setConsent(level) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, level);
  } catch {
    /* ignore */
  }
  document.getElementById('cookie-consent')?.remove();
  window.dispatchEvent(new CustomEvent('cookie-consent', { detail: { level } }));
}

function bannerMarkup() {
  return `
    <div class="cookie-consent" id="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title" aria-live="polite">
      <div class="cookie-consent-inner">
        <p class="cookie-consent-title" id="cookie-consent-title">Çerez bildirimi</p>
        <p class="cookie-consent-text">
          Ana sayfa ve diğer sayfalarda reklam gösterilebilir. Google, reklam sıklığı
          ve ölçüm için çerez kullanabilir. Ayrıntılar
          <a href="/gizlilik.html">Gizlilik Politikası</a> sayfasındadır.
        </p>
        <div class="cookie-consent-actions">
          <button type="button" class="cookie-btn cookie-btn-primary" data-consent="ack">
            Tamam
          </button>
        </div>
      </div>
    </div>`;
}

export function initCookieConsent() {
  if (getConsent()) return;

  document.body.insertAdjacentHTML('beforeend', bannerMarkup());
  const root = document.getElementById('cookie-consent');
  root?.querySelectorAll('[data-consent]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const level = btn.getAttribute('data-consent');
      if (level === 'ack' || level === 'essential' || level === 'all') setConsent(level);
    });
  });
}
