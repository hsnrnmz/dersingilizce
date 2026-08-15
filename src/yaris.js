import { bootSite } from './site-boot.js';
import { isGradeReady, loadJson, unitNamesFrom, escapeHtml } from './content.js';
import {
  SORU_SECENEKLERI,
  SURE_SECENEKLERI,
  loadRaceQuestions,
  runRaceMatch,
  renderMatchScoreboard,
} from './race-match.js';

bootSite();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || params.get('grade') || 0);

const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const kickerEl = document.getElementById('yaris-kicker');
const backLink = document.getElementById('back-link');

backLink.href = grade ? `/yarismalar.html?g=${grade}` : '/yarismalar.html';

/** @type {{ no: number, name: string }[]} */
let units = [];
/** @type {ReturnType<typeof loadRaceQuestions> extends Promise<infer T> ? T['questions'] : never} */
let questions = [];
/** @type {ReturnType<typeof loadRaceQuestions> extends Promise<infer T> ? T['jokerQuestions'] : never} */
let jokerPool = [];
let names = ['Öğrenci 1', 'Öğrenci 2'];
let timerSec = 0;

async function main() {
  if (!isGradeReady(grade)) {
    document.title = 'Yarış — hazır değil';
    kickerEl.textContent = `${grade || '?'}. Sınıf`;
    statusEl.textContent = 'Bu sınıf henüz hazır değil.';
    return;
  }

  document.title = `2’li Yarış — ${grade}. Sınıf`;
  kickerEl.textContent = `${grade}. Sınıf · 2’li Yarış`;

  try {
    const uniteler = await loadJson(grade, 'uniteler');
    units = unitNamesFrom(uniteler);
    if (!units.length) throw new Error('Ünite yok');
    statusEl.hidden = true;
    renderSetup();
  } catch (err) {
    console.error(err);
    statusEl.hidden = false;
    statusEl.textContent = 'Üniteler yüklenemedi.';
  }
}

function renderSetup() {
  const defaultUnite = units[0].no;
  app.innerHTML = `
    <header class="page-hero page-hero-compact">
      <h1>2’li Yarış</h1>
      <p class="lead">Aynı soru, iki yarı — önce doğru cevaplayan puanı alır.</p>
    </header>
    <form class="yaris-setup" id="yaris-setup">
      <div class="yaris-setup-grid">
        <label class="hizli-field">
          <span class="hizli-field-label">Öğrenci 1</span>
          <input class="hizli-select yaris-input" id="p1" type="text" maxlength="24" value="Öğrenci 1" required />
        </label>
        <label class="hizli-field">
          <span class="hizli-field-label">Öğrenci 2</span>
          <input class="hizli-select yaris-input" id="p2" type="text" maxlength="24" value="Öğrenci 2" required />
        </label>
        <label class="hizli-field">
          <span class="hizli-field-label">Kategori</span>
          <select class="hizli-select" id="type">
            <option value="kelime">Kelime Testi</option>
            <option value="quiz">Quiz</option>
          </select>
        </label>
        <label class="hizli-field">
          <span class="hizli-field-label">Ünite</span>
          <select class="hizli-select" id="unite">
            ${units
              .map(
                (u) => `
              <option value="${u.no}" ${u.no === defaultUnite ? 'selected' : ''}>
                Ünite ${u.no} — ${escapeHtml(u.name)}
              </option>`,
              )
              .join('')}
          </select>
        </label>
        <label class="hizli-field">
          <span class="hizli-field-label">Soru sayısı</span>
          <select class="hizli-select" id="count">
            ${SORU_SECENEKLERI.map(
              (n) => `<option value="${n}" ${n === 10 ? 'selected' : ''}>${n} soru</option>`,
            ).join('')}
          </select>
        </label>
        <label class="hizli-field">
          <span class="hizli-field-label">Süre</span>
          <select class="hizli-select" id="timer">
            ${SURE_SECENEKLERI.map(
              (t) => `<option value="${t.value}">${escapeHtml(t.label)}</option>`,
            ).join('')}
          </select>
        </label>
      </div>
      <ul class="yaris-rules">
        <li>İki taraf aynı soruyu görür.</li>
        <li>Doğru ve önce basan +1 alır; soru biter.</li>
        <li>Yanlış basan o soruda elenir; rakip cevaplayabilir.</li>
        <li>İkisi de yanlışsa sonraki soruya geçilir.</li>
        <li>Beraberlikte joker sorular sorulur; ilk doğru cevaplayan kazanır.</li>
      </ul>
      <button class="hizli-start-btn yaris-start-btn" type="submit">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>
        Yarışı Başlat
      </button>
    </form>
  `;

  document.getElementById('yaris-setup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = /** @type {HTMLSelectElement} */ (document.getElementById('type')).value;
    const uniteNo = Number(/** @type {HTMLSelectElement} */ (document.getElementById('unite')).value);
    const count = Number(/** @type {HTMLSelectElement} */ (document.getElementById('count')).value) || 10;
    timerSec = Number(/** @type {HTMLSelectElement} */ (document.getElementById('timer')).value) || 0;
    names = [
      String(/** @type {HTMLInputElement} */ (document.getElementById('p1')).value || 'Öğrenci 1').trim() ||
        'Öğrenci 1',
      String(/** @type {HTMLInputElement} */ (document.getElementById('p2')).value || 'Öğrenci 2').trim() ||
        'Öğrenci 2',
    ];

    statusEl.hidden = false;
    statusEl.textContent = 'Sorular hazırlanıyor…';
    app.querySelector('.yaris-setup')?.setAttribute('hidden', '');

    try {
      const { questions: mainQuestions, jokerQuestions } = await loadRaceQuestions(grade, {
        type,
        uniteNo,
        count,
      });
      if (mainQuestions.length < 2) {
        statusEl.textContent = 'Bu ünite için yeterli çoktan seçmeli soru yok. Başka ünite dene.';
        app.querySelector('.yaris-setup')?.removeAttribute('hidden');
        return;
      }

      questions = mainQuestions;
      jokerPool = jokerQuestions;
      statusEl.hidden = true;
      await startRace();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Sorular yüklenemedi.';
      app.querySelector('.yaris-setup')?.removeAttribute('hidden');
    }
  });
}

async function startRace() {
  const result = await runRaceMatch(app, {
    questions,
    jokerQuestions: jokerPool,
    names,
    timerSec,
  });
  showResult(result);
}

function showResult({ winner, scores, reason, tie, jokerUsed }) {
  let title = 'Berabere!';
  if (winner === 0) title = `${names[0]} kazandı!`;
  else if (winner === 1) title = `${names[1]} kazandı!`;

  let extra = '';
  if (reason === 'time') extra = 'Süre doldu';
  else if (reason === 'joker_exhausted') extra = 'Joker sorular bitti';
  if (jokerUsed && winner !== null) extra = extra ? `${extra} · Joker soru` : 'Joker soru';
  else if (tie) extra = extra ? `${extra} · Berabere` : 'Berabere';

  app.innerHTML = `
    <div class="yaris-result">
      <p class="yaris-result-eyebrow">${reason === 'time' ? 'Süre doldu' : 'Sonuç'}</p>
      <h1>${escapeHtml(title)}</h1>
      ${renderMatchScoreboard(names, scores, { winner: tie ? null : winner, extra })}
      <div class="yaris-result-actions">
        <button class="hizli-start-btn" type="button" id="yaris-again">Tekrar yarış</button>
        <a class="home-cta-secondary" href="/yarismalar.html?g=${grade}">Yarışmalara dön</a>
      </div>
    </div>
  `;

  document.getElementById('yaris-again')?.addEventListener('click', renderSetup);
}

main();
