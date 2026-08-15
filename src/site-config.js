/** Canlı site adresi (canonical / sitemap / iletişim). */
export const SITE_ORIGIN = 'https://dersingilizce.com';

/** Search Console HTML etiketi — DNS TXT kullanıyorsanız boş bırakın. */
export const GOOGLE_SITE_VERIFICATION = '';

/** Paylaşım / Open Graph görseli */
export const SITE_OG_IMAGE = '/logo-mark.png';

/** İletişim e-postası */
export const SITE_EMAIL = 'kozmosoft01@gmail.com';

/** Google AdSense yayıncı kimliği — onay sonrası ca-pub-XXXXXXXXXXXXXXXX ile değiştirin. */
export const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

/** Reklam gösterilecek statik sayfalar (etkileşimli ders ekranları hariç). */
const AD_ALLOWED = new Set([
  '/',
  '/index.html',
  '/hakkinda.html',
  '/iletisim.html',
  '/gizlilik.html',
  '/mobil.html',
  '/kaynaklar.html',
  '/rehber.html',
  '/rehber-2.html',
  '/rehber-3.html',
  '/rehber-4.html',
  '/rehber-5.html',
  '/rehber-6.html',
  '/rehber-7.html',
  '/rehber-8.html',
]);

export function isAdsAllowedPage(pathname = location.pathname) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return true;
  return AD_ALLOWED.has(path);
}

export const COOKIE_CONSENT_KEY = 'ingilizce-cookie-consent';
