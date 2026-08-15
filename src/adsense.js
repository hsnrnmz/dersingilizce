import { ADSENSE_CLIENT, isAdsAllowedPage } from './site-config.js';
import { hasAdConsent } from './cookie-consent.js';

let scriptInjected = false;

function isConfigured() {
  return ADSENSE_CLIENT && !ADSENSE_CLIENT.includes('XXXX');
}

function injectScript() {
  if (scriptInjected || !isConfigured()) return;
  if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
    scriptInjected = true;
    return;
  }
  scriptInjected = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

function fillSlot(el) {
  if (!isConfigured() || !hasAdConsent()) return;
  if (el.dataset.adFilled === '1') return;
  el.dataset.adFilled = '1';
  el.innerHTML = '';
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = ADSENSE_CLIENT;
  ins.dataset.adSlot = el.dataset.adSlot || '';
  ins.dataset.adFormat = el.dataset.adFormat || 'auto';
  ins.dataset.fullWidthResponsive = el.dataset.fullWidthResponsive ?? 'true';
  if (el.dataset.adLayout) ins.dataset.adLayout = el.dataset.adLayout;
  el.appendChild(ins);
  injectScript();
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {
    /* AdSense henüz yüklenmemiş olabilir */
  }
}

export function initAdsense() {
  if (!isAdsAllowedPage()) return;

  const slots = document.querySelectorAll('.ad-slot');
  if (!slots.length) return;

  const tryFill = () => {
    if (!hasAdConsent()) return;
    slots.forEach(fillSlot);
  };

  tryFill();
  window.addEventListener('cookie-consent', tryFill);
}

/** Statik sayfalara reklam alanı ekler (henüz yoksa). */
export function mountAdSlot(container, { slot = '', format = 'auto' } = {}) {
  if (!container || !isAdsAllowedPage()) return;
  const wrap = document.createElement('aside');
  wrap.className = 'ad-wrap';
  wrap.setAttribute('aria-label', 'Reklam alanı');
  wrap.innerHTML = `<div class="ad-slot" data-ad-slot="${slot}" data-ad-format="${format}"></div>`;
  container.appendChild(wrap);
  initAdsense();
}
