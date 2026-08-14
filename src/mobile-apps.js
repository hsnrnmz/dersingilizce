/** @typedef {{ grade: number, title: string, tagline: string, androidId: string, accent: string, iosUrl?: string|null }} MobileApp */

export const PLAY_DEVELOPER_URL = 'https://play.google.com/store/apps/dev?id=Kozmo-Soft&hl=tr';

/** @type {MobileApp[]} */
export const MOBILE_APPS = [
  {
    grade: 2,
    title: '2. Sınıf İngilizce',
    tagline: 'Kelime, dinleme, test ve oyunlar',
    androidId: 'com.kozmosoft.ingilizce2',
    accent: '#10b981',
  },
  {
    grade: 3,
    title: '3. Sınıf İngilizce',
    tagline: 'Test, oyun ve kelime çalışması',
    androidId: 'com.kozmosoft.ingilizce3',
    accent: '#0ea5e9',
  },
  {
    grade: 4,
    title: '4. Sınıf İngilizce',
    tagline: 'Kelime, dinleme ve akıllı tekrar',
    androidId: 'com.kozmosoft.ingilizce4',
    accent: '#6366f1',
  },
  {
    grade: 5,
    title: '5. Sınıf İngilizce',
    tagline: 'Maarif Model · test ve dinleme',
    androidId: 'meb.words',
    accent: '#a78bfa',
  },
  {
    grade: 6,
    title: '6. Sınıf İngilizce',
    tagline: 'Test, oyun ve Wordwall',
    androidId: 'com.meb.english_wordwall6',
    accent: '#f59e0b',
  },
  {
    grade: 7,
    title: '7. Sınıf İngilizce',
    tagline: 'Oyunlu test ve yapay zeka quiz',
    androidId: 'com.kozmosoft.ingilizce7',
    accent: '#f97316',
  },
  {
    grade: 8,
    title: '8. Sınıf İngilizce',
    tagline: 'LGS hazırlık · test ve oyun',
    androidId: 'meb.english_8',
    accent: '#ec4899',
  },
];

export function playStoreUrl(androidId) {
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(androidId)}&hl=tr`;
}

export function getMobileApp(grade) {
  return MOBILE_APPS.find((app) => app.grade === Number(grade)) || null;
}

function storeButtons(app) {
  const play = `<a class="store-btn store-btn-play" href="${playStoreUrl(app.androidId)}" target="_blank" rel="noopener noreferrer">
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.05L13.69 12 3.84 21.95C3.34 21.6 3 21.09 3 20.5zm13.81-5.38L6.05 21.34l8.49-8.49 2.27 2.27zm3.16-3.16-2.27-2.27L17.66 4.5l2.31 7.46zM6.05 2.66l10.76 6.22-2.27 2.27L6.05 2.66z"/></svg>
    Google Play
  </a>`;
  if (app.iosUrl) {
    return `${play}
      <a class="store-btn store-btn-apple" href="${app.iosUrl}" target="_blank" rel="noopener noreferrer">
        App Store
      </a>`;
  }
  return play;
}

/**
 * @param {{ apps?: MobileApp[], showDeveloperLink?: boolean, compact?: boolean }} opts
 */
export function renderMobileAppsHtml({ apps = MOBILE_APPS, showDeveloperLink = true, compact = false } = {}) {
  const cards = apps
    .map(
      (app) => `
    <article class="mobile-app-card ${compact ? 'is-compact' : ''}" style="--accent:${app.accent}">
      <div class="mobile-app-badge">${app.grade}</div>
      <div class="mobile-app-copy">
        <h3>${app.title}</h3>
        <p>${app.tagline}</p>
      </div>
      <div class="mobile-app-stores">${storeButtons(app)}</div>
    </article>`,
    )
    .join('');

  const devLink = showDeveloperLink
    ? `<p class="mobile-apps-dev">
        <a href="${PLAY_DEVELOPER_URL}" target="_blank" rel="noopener noreferrer">Kozmo-Soft · tüm uygulamalar Google Play'de</a>
      </p>`
    : '';

  return `
    <div class="mobile-apps-grid">${cards}</div>
    ${devLink}`;
}

export function renderMobileAppsSection({
  title = 'Mobil uygulamalarımız',
  lead = 'Aynı içerikler telefon ve tablette — evde tekrar ve veli desteği için.',
  apps = MOBILE_APPS,
  showDeveloperLink = true,
  compact = false,
  id = 'mobil-uygulamalar',
} = {}) {
  return `
    <section class="home-mobile-apps" id="${id}" aria-labelledby="${id}-title">
      <div class="home-section-head">
        <h2 id="${id}-title">${title}</h2>
        <p>${lead}</p>
      </div>
      ${renderMobileAppsHtml({ apps, showDeveloperLink, compact })}
    </section>`;
}

export function renderGradeMobileBanner(grade) {
  const app = getMobileApp(grade);
  if (!app) return '';
  return `
    <a class="mobile-app-banner" href="${playStoreUrl(app.androidId)}" target="_blank" rel="noopener noreferrer" style="--accent:${app.accent}">
      <span class="mobile-app-banner-label">Mobil uygulama</span>
      <span class="mobile-app-banner-title">${app.title}</span>
      <span class="mobile-app-banner-cta">Google Play'de indir</span>
    </a>`;
}
