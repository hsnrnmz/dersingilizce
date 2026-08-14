import { initNav } from './nav.js';
import { isGradeReady, loadJson, unitNamesFrom, escapeHtml } from './content.js';
import {
  GECME_BARAJI,
  ADIM_META,
  adimHref,
  adimiGec,
  yolculukVerisiOlustur,
} from './yolculuk-progress.js';

initNav();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || 0);
const uniteParam = Number(params.get('unite') || 0);
const adimParam = params.get('adim') || '';

const statusEl = document.getElementById('status');
const rootEl = document.getElementById('yolculuk-root');
const titleEl = document.getElementById('page-title');
const kickerEl = document.getElementById('page-kicker');
const leadEl = document.getElementById('page-lead');
const backLink = document.getElementById('back-link');

backLink.href = `/sinif.html?g=${grade || 5}`;

/** @type {ReturnType<typeof yolculukVerisiOlustur>|null} */
let veri = null;
let seciliUniteNo = uniteParam || 0;
/** @type {Record<string, string>} */
let calismaMap = {};
/** @type {Record<string, string>} */
let videoMap = {};

function youtubeId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!s.includes('/') && !s.includes('.')) return s;
  try {
    const uri = new URL(s);
    if (uri.hostname.includes('youtu.be')) return uri.pathname.split('/').filter(Boolean)[0] || '';
    if (uri.hostname.includes('youtube.com')) {
      const v = uri.searchParams.get('v');
      if (v) return v;
      const parts = uri.pathname.split('/').filter(Boolean);
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
      const shortsIdx = parts.indexOf('shorts');
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];
    }
  } catch {
    /* ignore */
  }
  return '';
}

function iconSvg(name) {
  const icons = {
    doc: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L19.5 9H15zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V9z"/></svg>`,
    video: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M10 16.5 16 12l-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>`,
    cards: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M4 6h12v14H4V6zm2 2v10h8V8H6zm4-4h10v14h-2V6H10V4z"/></svg>`,
    match: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M7 7h4v2H7V7zm0 4h4v2H7v-2zm0 4h4v2H7v-2zm6-8h4v2h-4V7zm0 4h4v2h-4v-2zm0 4h4v2h-4v-2zM3 5h18v14H3V5z"/></svg>`,
    brain: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M13 3a4 4 0 0 1 3.87 3.02A3.5 3.5 0 0 1 19.5 9.5c0 1.1-.51 2.08-1.3 2.72.8.64 1.3 1.62 1.3 2.78A3.5 3.5 0 0 1 16.87 18 4 4 0 0 1 13 21h-2a4 4 0 0 1-3.87-3.02A3.5 3.5 0 0 1 4.5 15c0-1.16.5-2.14 1.3-2.78A3.5 3.5 0 0 1 4.5 9.5 3.5 3.5 0 0 1 7.13 6 4 4 0 0 1 11 3h2z"/></svg>`,
    balloon: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M12 2c3.3 0 6 2.9 6 6.5 0 2.6-1.4 4.8-3.5 5.8L13 22h-2l-1.5-7.7C7.4 13.3 6 11.1 6 8.5 6 4.9 8.7 2 12 2z"/></svg>`,
    flash: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8H7z"/></svg>`,
    tap: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M9 11.2V5.5a1.5 1.5 0 0 1 3 0V11h1V3.5a1.5 1.5 0 0 1 3 0V11h1V6.5a1.5 1.5 0 0 1 3 0v8.3c0 3.4-2.2 6.2-5.2 6.2H13c-2.8 0-5.2-1.6-6.4-4.1L4 12.5a1.5 1.5 0 0 1 2.6-1.5L9 14.2V11.2z"/></svg>`,
    fall: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M11 4h2v8h3l-4 5-4-5h3V4zm-7 14h16v2H4v-2z"/></svg>`,
    spell: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M4 4h16v2H4V4zm0 4h10v2H4V8zm0 4h16v2H4v-2zm0 4h10v2H4v-2z"/></svg>`,
    quiz: `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm1.1-5.3-.9.9c-.5.5-.8.9-.8 1.9h-2v-.5c0-.8.3-1.5.8-2l1.2-1.2c.3-.3.5-.7.5-1.1 0-.8-.7-1.5-1.5-1.5S9.9 8.7 9.9 9.5H7.9C7.9 7.6 9.5 6 11.4 6s3.5 1.6 3.5 3.5c0 .8-.3 1.5-.8 2.2z"/></svg>`,
  };
  return icons[name] || icons.quiz;
}

function nodeAlignClass(index) {
  if (index === 0) return 'is-start';
  return index % 2 === 1 ? 'is-left' : 'is-right';
}

function resourceFor(testId, uniteNo) {
  const meta = ADIM_META[testId];
  if (meta?.resource === 'calisma') {
    const url = calismaMap[String(uniteNo)] || '';
    return { kind: 'pdf', url, title: meta.title, hint: meta.hint };
  }
  if (meta?.resource === 'video') {
    const url = videoMap[String(uniteNo)] || '';
    return { kind: 'video', url, title: meta.title, hint: meta.hint };
  }
  return null;
}

function mediaPanelHtml(resource, testId) {
  if (!resource) return '';
  if (!resource.url) {
    return `
      <section class="yol-manual-card">
        <h2>${escapeHtml(resource.title)}</h2>
        <p>Bu ünite için link henüz yok. <code>npm run sync:remote</code> ile Remote Config’ten güncelleyebilirsin.</p>
        <button class="ghost-btn" type="button" id="manual-cancel-btn">Kapat</button>
      </section>`;
  }

  if (resource.kind === 'pdf') {
    return `
      <section class="yol-manual-card yol-media-card">
        <div class="yol-media-head">
          <div>
            <h2>${escapeHtml(resource.title)}</h2>
            <p>${escapeHtml(resource.hint || '')}</p>
          </div>
          <a class="ghost-btn" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">Yeni sekmede aç</a>
        </div>
        <div class="yol-pdf-frame">
          <iframe src="${escapeHtml(resource.url)}#toolbar=1" title="Çalışma kağıdı"></iframe>
        </div>
        <div class="yol-media-actions">
          <button class="primary-btn" type="button" id="manual-done-btn">Tamamladım</button>
          <button class="ghost-btn" type="button" id="manual-cancel-btn">Kapat</button>
        </div>
      </section>`;
  }

  const yt = youtubeId(resource.url);
  const embed = yt
    ? `<iframe src="https://www.youtube.com/embed/${escapeHtml(yt)}" title="Ders videosu" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
    : `<p><a class="ghost-btn" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">Videoyu aç</a></p>`;

  return `
    <section class="yol-manual-card yol-media-card">
      <div class="yol-media-head">
        <div>
          <h2>${escapeHtml(resource.title)}</h2>
          <p>${escapeHtml(resource.hint || '')}</p>
        </div>
        <a class="ghost-btn" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">YouTube’da aç</a>
      </div>
      <div class="yol-video-frame">${embed}</div>
      <div class="yol-media-actions">
        <button class="primary-btn" type="button" id="manual-done-btn" data-adim="${escapeHtml(testId)}">Tamamladım</button>
        <button class="ghost-btn" type="button" id="manual-cancel-btn">Kapat</button>
      </div>
    </section>`;
}

function render() {
  if (!veri) return;
  const unite =
    veri.uniteler.find((u) => u.uniteNo === seciliUniteNo) || veri.uniteler[0];
  if (!unite) {
    statusEl.textContent = 'Ünite bulunamadı.';
    return;
  }
  seciliUniteNo = unite.uniteNo;

  const aktif = unite.testler.find((t) => t.durum !== 'tamamlandi');
  const oran = unite.toplam ? unite.tamamlanan / unite.toplam : 0;
  const manualMeta = adimParam ? ADIM_META[adimParam] : null;
  const resource = manualMeta?.kind === 'manual' ? resourceFor(adimParam, unite.uniteNo) : null;

  leadEl.textContent = `Ünite ${unite.uniteNo} · ${unite.uniteAdi}`;
  kickerEl.textContent = `${grade}. Sınıf`;

  rootEl.innerHTML = `
    <section class="yol-progress-card">
      <div class="yol-progress-top">
        <div>
          <p class="yol-progress-label">Bu ünite</p>
          <strong>${unite.tamamlanan} / ${unite.toplam} adım</strong>
        </div>
        <span class="yol-progress-pct">%${Math.round(oran * 100)}</span>
      </div>
      <div class="yol-progress-track" aria-hidden="true">
        <div class="yol-progress-fill" style="width:${Math.round(oran * 100)}%"></div>
      </div>
      <p class="yol-progress-hint">İstediğin adımdan başlayabilirsin. Testlerde en az ${GECME_BARAJI} doğru gerekir. İlerleme bu cihazda saklanır.</p>
    </section>

    <div class="yol-unite-bar">
      <label class="yol-unite-label" for="unite-select">Ünite</label>
      <select class="yol-unite-select" id="unite-select">
        ${veri.uniteler
          .map(
            (u) => `
          <option value="${u.uniteNo}" ${u.uniteNo === unite.uniteNo ? 'selected' : ''}>
            Ünite ${u.uniteNo} — ${escapeHtml(u.uniteAdi)} (${u.tamamlanan}/${u.toplam})
          </option>`,
          )
          .join('')}
      </select>
    </div>

    ${resource ? mediaPanelHtml(resource, adimParam) : ''}

    <ol class="yol-path" aria-label="Öğrenme yolu">
      ${unite.testler
        .map((test, index) => {
          const meta = ADIM_META[test.testId] || { title: test.testId, icon: 'quiz' };
          const tamamlandi = test.durum === 'tamamlandi';
          const basarisiz = test.durum === 'basarisiz';
          const aktifMi = aktif?.testId === test.testId;
          const cls = [
            'yol-node',
            nodeAlignClass(index),
            tamamlandi ? 'is-done' : '',
            basarisiz ? 'is-fail' : '',
            aktifMi ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return `
            <li class="${cls}" data-adim="${escapeHtml(test.testId)}">
              ${index < unite.testler.length - 1 ? '<span class="yol-connector" aria-hidden="true"></span>' : ''}
              <button class="yol-node-btn" type="button">
                <span class="yol-ring" aria-hidden="true"></span>
                <span class="yol-core">
                  ${
                    tamamlandi
                      ? '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true"><path fill="currentColor" d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4-9.4 9.4z"/></svg>'
                      : iconSvg(meta.icon)
                  }
                </span>
              </button>
              <p class="yol-node-title">${escapeHtml(meta.title)}</p>
              ${
                aktifMi
                  ? `<button class="yol-cta" type="button">${basarisiz ? 'Tekrar dene' : 'Başla'}</button>`
                  : ''
              }
            </li>`;
        })
        .join('')}
    </ol>
  `;

  statusEl.hidden = true;
  rootEl.hidden = false;

  document.getElementById('unite-select')?.addEventListener('change', (e) => {
    seciliUniteNo = Number(e.target.value);
    const url = new URL(location.href);
    url.searchParams.set('unite', String(seciliUniteNo));
    url.searchParams.delete('adim');
    history.replaceState(null, '', url);
    render();
  });

  document.getElementById('manual-done-btn')?.addEventListener('click', () => {
    adimiGec(grade, unite.uniteNo, adimParam);
    const url = new URL(location.href);
    url.searchParams.delete('adim');
    history.replaceState(null, '', url);
    refresh();
  });

  document.getElementById('manual-cancel-btn')?.addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('adim');
    history.replaceState(null, '', url);
    render();
  });

  rootEl.querySelectorAll('.yol-node').forEach((node) => {
    const testId = node.dataset.adim;
    const test = unite.testler.find((t) => t.testId === testId);
    if (!test) return;
    const go = () => {
      location.href = adimHref(grade, test.uniteNo, test.testId);
    };
    node.querySelector('.yol-node-btn')?.addEventListener('click', go);
    node.querySelector('.yol-cta')?.addEventListener('click', go);
  });

  if (resource) {
    rootEl.querySelector('.yol-media-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function refresh() {
  const uniteler = veri?._unitNames || [];
  veri = yolculukVerisiOlustur(grade, uniteler);
  veri._unitNames = uniteler;
  render();
}

async function main() {
  if (!isGradeReady(grade)) {
    statusEl.textContent = 'Bu sınıf henüz hazır değil.';
    return;
  }

  document.title = `Öğrenme Yolculuğu — ${grade}. Sınıf`;
  titleEl.textContent = 'Öğrenme Yolculuğu';
  kickerEl.textContent = `${grade}. Sınıf`;

  try {
    const [unitelerJson, calisma, videolar] = await Promise.all([
      loadJson(grade, 'uniteler'),
      loadJson(grade, 'calisma-kagitlari').catch(() => ({})),
      loadJson(grade, 'ders-videolari').catch(() => ({})),
    ]);
    calismaMap = calisma || {};
    videoMap = videolar || {};

    const unitNames = unitNamesFrom(unitelerJson);
    if (!unitNames.length) {
      statusEl.textContent = 'Ünite listesi bulunamadı.';
      return;
    }
    if (!seciliUniteNo) seciliUniteNo = unitNames[0].no;
    veri = yolculukVerisiOlustur(grade, unitNames);
    veri._unitNames = unitNames;
    render();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Yolculuk yüklenirken hata oluştu.';
  }
}

main();
