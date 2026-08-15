import { bootSite } from './site-boot.js';
import { applySeo } from './seo.js';
import {
  isGradeReady,
  MODULES,
  GAMES,
  loadJson,
  unitNamesFrom,
  listTestIds,
  getRawQuestions,
  escapeHtml,
} from './content.js';
import { isTestSolved, countSolvedInUnit } from './test-progress.js';
import { hizliTestButtonHtml, bindHizliTestButton } from './hizli-test.js';

bootSite();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || 0);
const mode = params.get('mode') || 'kartlar';
const statusEl = document.getElementById('status');
const listEl = document.getElementById('unit-list');
const titleEl = document.getElementById('page-title');
const kickerEl = document.getElementById('page-kicker');
const leadEl = document.getElementById('page-lead');
const backLink = document.getElementById('back-link');

const isGame = GAMES.some((g) => g.id === mode);
backLink.href = isGame
  ? `/unite.html?g=${grade}&mode=oyunlar`
  : `/sinif.html?g=${grade}`;

async function main() {
  if (!isGradeReady(grade)) {
    statusEl.textContent = 'Bu sınıf henüz hazır değil.';
    return;
  }

  const mod =
    MODULES.find((m) => m.id === mode) ||
    GAMES.find((g) => g.id === mode) ||
    MODULES[0];
  applySeo({
    title: `${grade}. Sınıf ${mod.title} | Ders İngilizce`,
    description: `${grade}. sınıf İngilizce ${mod.title.toLowerCase()} — ünite seçin, çalışın ve tekrar edin.`,
  });
  kickerEl.textContent = `${grade}. Sınıf`;
  titleEl.textContent = mod.title;
  leadEl.textContent =
    mode === 'oyunlar'
      ? 'Önce oyunu seç, sonra üniteyi seç.'
      : mode === 'kelime'
        ? 'Üniteyi seç, testi başlat, kelimeleri pekiştir.'
        : mode === 'quiz'
          ? 'Görselli sorularla üniteyi hızlıca tekrar et.'
          : 'Ünite seçerek başla.';

  try {
    if (mode === 'oyunlar') {
      statusEl.hidden = true;
      listEl.hidden = false;
      listEl.innerHTML = `
        <div class="module-grid">
          ${GAMES.map(
            (g) => `
            <a class="module-card" href="/unite.html?g=${grade}&mode=${g.id}" style="--accent:#ec4899">
              <span class="module-title">${escapeHtml(g.title)}</span>
              <span class="module-sub">${escapeHtml(g.subtitle)}</span>
            </a>`,
          ).join('')}
        </div>
      `;
      return;
    }

    const uniteler = await loadJson(grade, 'uniteler');
    const units = unitNamesFrom(uniteler);

    if (mode === 'kelime' || mode === 'quiz') {
      const bucket = await loadJson(grade, mode === 'quiz' ? 'quiz' : 'testler');
      const isQuiz = mode === 'quiz';
      const label = isQuiz ? 'Quiz' : 'Test';
      const totalTests = units.reduce((sum, unit) => sum + listTestIds(bucket, unit.no).length, 0);

      statusEl.hidden = true;
      listEl.hidden = false;
      listEl.innerHTML = `
        <div class="tests-hub ${isQuiz ? 'is-quiz' : 'is-kelime'}">
          ${hizliTestButtonHtml()}
          <section class="tests-hub-banner" aria-label="Özet">
            <div class="tests-hub-banner-glow" aria-hidden="true"></div>
            <div class="tests-hub-banner-icon">${isQuiz ? '🎯' : '📝'}</div>
            <div class="tests-hub-banner-copy">
              <p class="tests-hub-eyebrow">${isQuiz ? 'Görselli quiz' : 'Kelime pratiği'}</p>
              <h2>${escapeHtml(mod.title)}</h2>
              <p>Ünite kartından bir ${label.toLowerCase()} seçerek hemen başla.</p>
            </div>
            <div class="tests-hub-stats">
              <div class="tests-hub-stat">
                <strong>${units.length}</strong>
                <span>Ünite</span>
              </div>
              <div class="tests-hub-stat">
                <strong>${totalTests}</strong>
                <span>${label}</span>
              </div>
            </div>
          </section>

          <div class="tests-hub-list">
            ${units
              .map((unit) => {
                const tests = listTestIds(bucket, unit.no);
                const solvedCount = countSolvedInUnit(grade, mode, unit.no, tests);
                return `
                  <article class="tests-unit-card">
                    <div class="tests-unit-head">
                      <img class="unit-icon" src="/icons/${grade}/icon_unite-${unit.no}.png" alt="" />
                      <div class="tests-unit-copy">
                        <span class="unit-no">Ünite ${unit.no}</span>
                        <h2>${escapeHtml(unit.name)}</h2>
                      </div>
                      <span class="tests-unit-count">${solvedCount}/${tests.length} çözüldü</span>
                    </div>
                    <div class="tests-tile-grid">
                      ${
                        tests.length
                          ? tests
                              .map((id) => {
                                const num = id.replace('test-', '');
                                const qCount = getRawQuestions(bucket, unit.no, id).length;
                                const solved = isTestSolved(grade, mode, unit.no, id);
                                return `
                                  <a class="tests-tile ${isQuiz ? 'is-quiz' : ''} ${solved ? 'is-solved' : ''}" href="/test.html?g=${grade}&type=${mode}&unite=${unit.no}&test=${encodeURIComponent(id)}">
                                    <span class="tests-tile-num">${
                                      solved
                                        ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4-9.4 9.4z"/></svg>'
                                        : num
                                    }</span>
                                    <span class="tests-tile-body">
                                      <strong>${label} ${num}</strong>
                                      <span>${solved ? 'Çözüldü · ' : ''}${qCount} soru</span>
                                    </span>
                                    <span class="tests-tile-go">${solved ? 'Tekrar' : 'Başla'}</span>
                                  </a>`;
                              })
                              .join('')
                          : '<p class="empty-hint">Bu ünitede içerik yok</p>'
                      }
                    </div>
                  </article>`;
              })
              .join('')}
          </div>
        </div>`;
      bindHizliTestButton(grade, { defaultType: isQuiz ? 'quiz' : 'kelime' });
      return;
    }

    statusEl.hidden = true;
    listEl.hidden = false;
    listEl.innerHTML = `
      <div class="unit-pick-grid">
        ${units
          .map(
            (unit) => `
          <a class="unit-pick" href="/etkinlik.html?g=${grade}&mode=${encodeURIComponent(mode)}&unite=${unit.no}">
            <img src="/icons/${grade}/icon_unite-${unit.no}.png" alt="" />
            <span class="unit-no">Ünite ${unit.no}</span>
            <strong>${escapeHtml(unit.name)}</strong>
          </a>`,
          )
          .join('')}
      </div>
    `;
  } catch (err) {
    console.error(err);
    statusEl.hidden = false;
    statusEl.textContent = 'İçerik yüklenirken hata oluştu.';
  }
}

main();
