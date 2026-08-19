import { initAdsense } from './adsense.js';

const RAIL_LEFT = `
  <aside class="ad-wrap ad-rail ad-rail-left" aria-label="Reklam alanı">
    <div class="ad-slot" data-ad-format="vertical" data-full-width-responsive="false"></div>
  </aside>`;

const RAIL_RIGHT = `
  <aside class="ad-wrap ad-rail ad-rail-right" aria-label="Reklam alanı">
    <div class="ad-slot" data-ad-format="vertical" data-full-width-responsive="false"></div>
  </aside>`;

const MOBILE_MARKUP = `
  <aside class="ad-wrap ad-wrap-rail-mobile" aria-label="Reklam alanı">
    <div class="ad-slot" data-ad-format="horizontal"></div>
  </aside>`;

const BOTTOM_ONLY_PAGES = new Set(['/yarismalar.html', '/yaris.html', '/turnuva.html']);

function pagePath(pathname = location.pathname) {
  const path = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
  if (path === '/') return '/';
  return path.endsWith('.html') ? path : `${path}.html`;
}

function isHomePage() {
  if (document.body.classList.contains('home-body')) return true;
  return pagePath() === '/index.html' || pagePath() === '/';
}

function isBottomOnlyPage() {
  return BOTTOM_ONLY_PAGES.has(pagePath());
}

function findPageShell() {
  return [...document.querySelectorAll('.shell')].find(
    (el) => !el.classList.contains('home-shell') && !el.closest('.page-ad-layout, .grade-ad-layout'),
  );
}

function unwrapPageAdLayout() {
  const layout = document.querySelector('.page-ad-layout, .grade-ad-layout');
  if (!layout) return;

  const main = layout.querySelector('.page-ad-main');
  const parent = layout.parentNode;

  if (main) {
    while (main.firstChild) {
      parent.insertBefore(main.firstChild, layout);
    }
  }

  layout.remove();
}

function ensureBottomAd() {
  unwrapPageAdLayout();
  document.body.classList.add('ad-layout-bottom');
  document.body.dataset.adLayout = 'bottom';

  document.querySelectorAll('.ad-wrap-rail-mobile').forEach((el) => {
    el.classList.remove('ad-wrap-rail-mobile');
    el.classList.add('ad-wrap-bottom');
  });

  if (document.querySelector('.ad-wrap-bottom')) return;

  const shell = findPageShell();
  if (!shell) return;

  shell.insertAdjacentHTML(
    'afterend',
    `<div class="ad-page-foot"><aside class="ad-wrap ad-wrap-bottom" aria-label="Reklam alanı"><div class="ad-slot" data-ad-format="horizontal"></div></aside></div>`,
  );
}

function normalizeExistingLayout() {
  const layout = document.querySelector('.page-ad-layout, .grade-ad-layout');
  if (!layout) return null;

  layout.classList.add('page-ad-layout');
  layout.querySelectorAll('.ad-wrap-grade-mobile').forEach((el) => {
    el.classList.remove('ad-wrap-grade-mobile');
    el.classList.add('ad-wrap-rail-mobile');
  });
  layout.querySelectorAll('.ad-wrap-bottom').forEach((el) => {
    el.classList.remove('ad-wrap-bottom');
    el.classList.add('ad-wrap-rail-mobile');
  });

  let main = layout.querySelector('.page-ad-main');
  const shell = layout.querySelector('.shell');
  if (!main && shell) {
    main = document.createElement('div');
    main.className = 'page-ad-main';
    shell.parentNode.insertBefore(main, shell);
    main.appendChild(shell);
  }

  ensureMobileAd(main || layout);
  return layout;
}

function ensureMobileAd(container) {
  if (!container) return;

  if (container.querySelector(':scope > .ad-wrap-rail-mobile')) return;

  const bottom = container.querySelector('.ad-wrap-bottom');
  if (bottom) {
    bottom.classList.remove('ad-wrap-bottom');
    bottom.classList.add('ad-wrap-rail-mobile');
    container.appendChild(bottom);
    return;
  }

  const footWrap = document.querySelector('.ad-page-foot .ad-wrap-bottom');
  if (footWrap) {
    footWrap.classList.remove('ad-wrap-bottom');
    footWrap.classList.add('ad-wrap-rail-mobile');
    container.appendChild(footWrap);
    document.querySelector('.ad-page-foot')?.remove();
    return;
  }

  container.insertAdjacentHTML('beforeend', MOBILE_MARKUP);
}

/** Ana sayfa hariç: geniş ekranda yan dikey, mobilde altta yatay reklam düzeni. */
export function mountPageAdLayout() {
  if (isHomePage()) return;

  if (isBottomOnlyPage()) {
    ensureBottomAd();
    initAdsense();
    return;
  }

  if (normalizeExistingLayout()) return;

  const shell = findPageShell();
  if (!shell) return;

  const layout = document.createElement('div');
  layout.className = 'page-ad-layout';
  shell.parentNode.insertBefore(layout, shell);

  const main = document.createElement('div');
  main.className = 'page-ad-main';

  layout.insertAdjacentHTML('afterbegin', RAIL_LEFT);
  layout.appendChild(main);
  main.appendChild(shell);
  layout.insertAdjacentHTML('beforeend', RAIL_RIGHT);

  ensureMobileAd(main);
  initAdsense();
}
