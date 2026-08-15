import { GOOGLE_SITE_VERIFICATION, SITE_OG_IMAGE, SITE_ORIGIN } from './site-config.js';

const CANONICAL_KEYS = ['g', 'mode', 'unite', 'type'];

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function canonicalPathFromLocation(url = location) {
  const params = new URLSearchParams();
  for (const key of CANONICAL_KEYS) {
    const value = url.searchParams.get(key);
    if (value) params.set(key, value);
  }
  const path = url.pathname === '/index.html' ? '/' : url.pathname;
  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}`;
}

/**
 * Canonical, Open Graph ve Search Console doğrulama etiketlerini yazar.
 * @param {{ title?: string, description?: string, path?: string }} [opts]
 */
export function applySeo(opts = {}) {
  const path = opts.path || canonicalPathFromLocation();
  const url = `${SITE_ORIGIN}${path === '/' ? '' : path}`;
  const title = opts.title || document.title;
  const description =
    opts.description ||
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    '';
  const image = `${SITE_ORIGIN}${SITE_OG_IMAGE}`;

  if (opts.title) document.title = opts.title;
  upsertLink('canonical', url);
  upsertMeta('name', 'description', description);
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:locale', 'tr_TR');
  upsertMeta('property', 'og:site_name', 'Ders İngilizce');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);

  if (GOOGLE_SITE_VERIFICATION) {
    upsertMeta('name', 'google-site-verification', GOOGLE_SITE_VERIFICATION);
  }
}
