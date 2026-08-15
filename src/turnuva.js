import { bootSite } from './site-boot.js';
import { isGradeReady, loadJson, unitNamesFrom, escapeHtml } from './content.js';
import {
  SORU_SECENEKLERI,
  SURE_SECENEKLERI,
  loadRaceQuestionPool,
  drawMatchQuestions,
  runRaceMatch,
  defaultPlayerName,
  renderMatchScoreboard,
} from './race-match.js';
import { namesFromExcelBuffer } from './excel-names.js';
import {
  buildBracketTree,
  findCurrentMatch,
  findChampion,
  recordMatchResult,
  renderBracketTree,
} from './turnuva-bracket.js';

bootSite();

const MIN_OGRENCI = 2;
const MAX_OGRENCI = 40;

function parseNameList(text) {
  if (!text?.trim()) return [];
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line
      .split(/\t|,|;/)
      .map((part) => part.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    names.push(...parts);
  }
  return names;
}

function readStudentCountInput(input) {
  const raw = input?.value?.trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const count = Math.floor(n);
  if (count < MIN_OGRENCI || count > MAX_OGRENCI) return null;
  return count;
}

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || params.get('grade') || 0);

const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const kickerEl = document.getElementById('turnuva-kicker');
const backLink = document.getElementById('back-link');

backLink.href = grade ? `/yarismalar.html?g=${grade}` : '/yarismalar.html';

/** @type {{ no: number, name: string }[]} */
let units = [];
/** @type {import('./content.js').normalizeQuestion extends (...args: any) => infer R ? R[] : never[]} */
let questionPool = [];
/** @type {Set<string>} */
let usedQuestionKeys = new Set();
let timerSec = 0;
/** @type {{ no: number, name: string }[]} */
let players = [];
/** @type {import('./turnuva-bracket.js').BracketRound[]} */
let bracketRounds = [];
/** @type {{ type: string, uniteNo: number, count: number }} */
let settings = {};

async function main() {
  if (!isGradeReady(grade)) {
    document.title = 'Turnuva — hazır değil';
    kickerEl.textContent = `${grade || '?'}. Sınıf`;
    statusEl.textContent = 'Bu sınıf henüz hazır değil.';
    return;
  }

  document.title = `Turnuva — ${grade}. Sınıf`;
  kickerEl.textContent = `${grade}. Sınıf · Turnuva`;

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
      <h1>Turnuva</h1>
      <p class="lead">Öğrenciler karışık eşleşir; kazananlar bir üst tura çıkar.</p>
    </header>
    <form class="yaris-setup turnuva-setup" id="turnuva-setup">
      <div class="yaris-setup-grid">
        <label class="hizli-field">
          <span class="hizli-field-label">Öğrenci sayısı</span>
          <input
            class="hizli-select yaris-input"
            type="number"
            id="student-count"
            min="${MIN_OGRENCI}"
            max="${MAX_OGRENCI}"
            step="1"
            placeholder="Kaç öğrenci?"
            inputmode="numeric"
            required
          />
        </label>
        <label class="hizli-field yaris-field-full turnuva-names">
          <span class="hizli-field-label">Öğrenci isimleri (isteğe bağlı)</span>
          <p class="turnuva-names-lead">
            İsimleri yapıştırın veya Excel dosyası yükleyin (.xlsx, .xls, .csv). Her satır bir öğrenci sayılır.
          </p>
          <div class="turnuva-names-tools">
            <label class="turnuva-file-btn">
              <input
                type="file"
                id="student-names-file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                hidden
              />
              Excel dosyası yükle
            </label>
            <span class="turnuva-file-name" id="file-name" hidden></span>
          </div>
          <textarea
            class="turnuva-names-paste yaris-input"
            id="student-names-paste"
            rows="7"
            placeholder="Ali&#10;Veli&#10;Ayşe&#10;…"
            spellcheck="false"
          ></textarea>
          <p class="turnuva-names-hint" id="names-hint" hidden></p>
        </label>
      </div>
      <div class="yaris-setup-grid">
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
          <span class="hizli-field-label">Maç başına soru</span>
          <select class="hizli-select" id="count">
            ${SORU_SECENEKLERI.map(
              (n) => `<option value="${n}" ${n === 8 ? 'selected' : ''}>${n} soru</option>`,
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
        <li>Öğrenci sayısını siz girin; isimler boş kalırsa Öğrenci 1, Öğrenci 2… yazılır.</li>
        <li>Fikstür ağaç şeklinde gösterilir; kazanan yeşil, kaybeden kırmızı işaretlenir.</li>
        <li>Her maç 2’li yarış kurallarıyla oynanır; beraberlikte joker sorular sorulur.</li>
      </ul>
      <button class="hizli-start-btn yaris-start-btn" type="submit">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>
        Turnuvayı Oluştur
      </button>
    </form>
  `;

  const countEl = /** @type {HTMLInputElement | null} */ (document.getElementById('student-count'));
  const pasteEl = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('student-names-paste'));
  const fileEl = /** @type {HTMLInputElement | null} */ (document.getElementById('student-names-file'));
  const fileNameEl = document.getElementById('file-name');
  const hintEl = document.getElementById('names-hint');

  const applyNames = (names, sourceLabel = '') => {
    if (!pasteEl || !names.length) return false;
    pasteEl.value = names.join('\n');
    if (fileNameEl) {
      if (sourceLabel) {
        fileNameEl.textContent = sourceLabel;
        fileNameEl.hidden = false;
      } else {
        fileNameEl.hidden = true;
        fileNameEl.textContent = '';
      }
    }
    updateNamesHint();
    return true;
  };

  const updateNamesHint = () => {
    if (!hintEl) return;
    const count = readStudentCountInput(countEl);
    const names = parseNameList(pasteEl?.value || '');
    if (!names.length) {
      hintEl.hidden = true;
      hintEl.textContent = '';
      return;
    }
    hintEl.hidden = false;
    if (!count) {
      hintEl.textContent = `${names.length} isim yapıştırıldı. Öğrenci sayısını girin.`;
      return;
    }
    if (names.length > count) {
      hintEl.textContent = `${names.length} isim var; ilk ${count} tanesi kullanılacak.`;
      return;
    }
    if (names.length < count) {
      hintEl.textContent = `${names.length} isim var; kalan ${count - names.length} öğrenci numarayla adlandırılır.`;
      return;
    }
    hintEl.textContent = `${names.length} isim — tüm öğrenciler eşleşti.`;
  };

  pasteEl?.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (!text.trim()) return;
    e.preventDefault();
    applyNames(parseNameList(text));
    if (fileEl) fileEl.value = '';
    if (fileNameEl) {
      fileNameEl.hidden = true;
      fileNameEl.textContent = '';
    }
  });

  pasteEl?.addEventListener('input', () => {
    if (fileEl) fileEl.value = '';
    if (fileNameEl) {
      fileNameEl.hidden = true;
      fileNameEl.textContent = '';
    }
    updateNamesHint();
  });

  fileEl?.addEventListener('change', async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    statusEl.hidden = true;
    try {
      const names = namesFromExcelBuffer(await file.arrayBuffer());
      if (!names.length) {
        statusEl.hidden = false;
        statusEl.textContent = 'Dosyada öğrenci ismi bulunamadı. İsim sütununu kontrol edin.';
        fileEl.value = '';
        return;
      }
      applyNames(names, file.name);
    } catch (err) {
      console.error(err);
      statusEl.hidden = false;
      statusEl.textContent = 'Excel dosyası okunamadı.';
      fileEl.value = '';
    }
  });

  countEl?.addEventListener('input', updateNamesHint);

  document.getElementById('turnuva-setup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.hidden = true;
    const studentCount = readStudentCountInput(countEl);
    if (!studentCount) {
      statusEl.hidden = false;
      statusEl.textContent = `Geçerli bir öğrenci sayısı girin (${MIN_OGRENCI}–${MAX_OGRENCI}).`;
      countEl?.focus();
      return;
    }

    const pastedNames = parseNameList(pasteEl?.value || '');
    const type = /** @type {HTMLSelectElement} */ (document.getElementById('type')).value;
    const uniteNo = Number(/** @type {HTMLSelectElement} */ (document.getElementById('unite')).value);
    const count = Number(/** @type {HTMLSelectElement} */ (document.getElementById('count')).value) || 8;
    timerSec = Number(/** @type {HTMLSelectElement} */ (document.getElementById('timer')).value) || 0;

    players = Array.from({ length: studentCount }, (_, i) => {
      const no = i + 1;
      const pasted = pastedNames[i]?.trim().slice(0, 24);
      return { no, name: pasted || defaultPlayerName(no) };
    });

    settings = { type, uniteNo, count };
    statusEl.hidden = false;
    statusEl.textContent = 'Sorular hazırlanıyor…';
    app.querySelector('#turnuva-setup')?.setAttribute('hidden', '');

    try {
      questionPool = await loadRaceQuestionPool(grade, { type, uniteNo });
      if (questionPool.length < settings.count + 2) {
        statusEl.textContent = 'Bu ünite için yeterli soru yok.';
        app.querySelector('#turnuva-setup')?.removeAttribute('hidden');
        return;
      }
      usedQuestionKeys = new Set();
      bracketRounds = buildBracketTree(players);
      statusEl.hidden = true;
      showBracketLobby();
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Sorular yüklenemedi.';
      app.querySelector('#turnuva-setup')?.removeAttribute('hidden');
    }
  });
}

function currentMatchLabel(match) {
  if (!match?.a) return '';
  if (match.bye) return `${match.a.name} · tur atlıyor`;
  return `${match.a.name} vs ${match.b?.name || '—'}`;
}

function renderStagePanel(html) {
  return `<div class="turnuva-stage" id="turnuva-stage">${html}</div>`;
}

function showBracketLobby() {
  const champion = findChampion(bracketRounds);
  if (champion) {
    showChampion(champion);
    return;
  }

  const current = findCurrentMatch(bracketRounds);
  app.innerHTML = `
    ${renderBracketTree(bracketRounds, { currentMatchId: current?.id || null, escapeHtml })}
    ${renderStagePanel(`
      <div class="turnuva-lobby">
        <p class="turnuva-lobby-eyebrow">${players.length} kişilik turnuva · fikstür hazır</p>
        <h2 class="turnuva-lobby-title">${current ? escapeHtml(currentMatchLabel(current)) : 'Turnuva tamamlandı'}</h2>
        <p class="turnuva-lobby-lead">${current?.bye ? 'Bu eşleşme tur atlıyor.' : 'Maçı başlatmak için butona basın.'}</p>
        ${
          current
            ? `<button class="hizli-start-btn yaris-start-btn" type="button" id="start-match">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>
                Yarışmaya Başla
              </button>`
            : ''
        }
      </div>
    `)}
  `;

  document.getElementById('start-match')?.addEventListener('click', () => playCurrentMatch());
}

async function playCurrentMatch() {
  const match = findCurrentMatch(bracketRounds);
  if (!match) {
    const champion = findChampion(bracketRounds);
    if (champion) showChampion(champion);
    return;
  }

  if (match.bye) {
    app.innerHTML = `
      ${renderBracketTree(bracketRounds, { currentMatchId: match.id, escapeHtml })}
      ${renderStagePanel(`
        <div class="turnuva-bye-msg">
          <p class="turnuva-bye-eyebrow">Tur atlama</p>
          <h2>${escapeHtml(match.a.name)}</h2>
          <p class="lead">Tek kaldığı için bir sonraki tura geçiyor.</p>
          <button class="hizli-start-btn" type="button" id="bye-next">Devam</button>
        </div>
      `)}
    `;
    await new Promise((resolve) => {
      document.getElementById('bye-next')?.addEventListener('click', resolve, { once: true });
    });
    match.played = true;
    showBracketLobby();
    return;
  }

  app.innerHTML = `
    ${renderBracketTree(bracketRounds, { currentMatchId: match.id, escapeHtml })}
    ${renderStagePanel('<div class="turnuva-match" id="turnuva-match"></div>')}
  `;

  const matchEl = document.getElementById('turnuva-match');
  const { questions, jokerQuestions } = drawMatchQuestions(questionPool, {
    count: settings.count,
    jokerCount: 12,
    usedKeys: usedQuestionKeys,
  });

  const result = await runRaceMatch(matchEl, {
    questions,
    jokerQuestions,
    names: [match.a.name, match.b.name],
    timerSec,
    hudExtra: currentMatchLabel(match),
  });

  const winnerSide = result.winner;
  if (winnerSide === 0 || winnerSide === 1) {
    recordMatchResult(match, winnerSide, bracketRounds);
  }

  const winner = winnerSide === 0 ? match.a : winnerSide === 1 ? match.b : null;

  app.innerHTML = `
    ${renderBracketTree(bracketRounds, { currentMatchId: null, escapeHtml })}
    ${renderStagePanel(`
      <div class="yaris-result turnuva-match-result">
        <p class="yaris-result-eyebrow">${
          result.jokerUsed && winner
            ? 'Joker ile kazanıldı'
            : result.tie
              ? 'Berabere — joker sorular yetmedi'
              : 'Maç sonucu'
        }</p>
        <h1>${winner ? `${escapeHtml(winner.name)} kazandı!` : 'Kazanan çıkmadı'}</h1>
        ${renderMatchScoreboard([match.a.name, match.b.name], result.scores, {
          winner: winnerSide,
          extra:
            result.jokerUsed && winner
              ? 'Joker soru'
              : result.tie
                ? 'Maç tekrarlanacak'
                : '',
        })}
        <button class="hizli-start-btn turnuva-print-btn" type="button" id="print-bracket">Fikstürü yazdır</button>
        <button class="hizli-start-btn" type="button" id="match-next">${winner ? 'Devam et' : 'Maçı tekrarla'}</button>
      </div>
    `)}
  `;

  document.getElementById('print-bracket')?.addEventListener('click', () => window.print());

  await new Promise((resolve) => {
    document.getElementById('match-next')?.addEventListener('click', resolve, { once: true });
  });

  if (!winner) {
    match.played = false;
    match.winner = null;
    match.loser = null;
    showBracketLobby();
    return;
  }

  const champion = findChampion(bracketRounds);
  if (champion) {
    showChampion(champion);
    return;
  }

  showBracketLobby();
}

function showChampion(player) {
  app.innerHTML = `
    ${renderBracketTree(bracketRounds, { currentMatchId: null, escapeHtml })}
    <div class="yaris-result turnuva-champion" id="turnuva-print-area">
      <p class="yaris-result-eyebrow">Turnuva şampiyonu</p>
      <h1>${escapeHtml(player.name)}</h1>
      <p class="lead">${player.no}. sıra · ${players.length} kişilik turnuva</p>
      <div class="yaris-result-actions">
        <button class="hizli-start-btn" type="button" id="print-bracket">Fikstürü yazdır</button>
        <button class="hizli-start-btn" type="button" id="turnuva-again">Yeni turnuva</button>
        <a class="home-cta-secondary" href="/yarismalar.html?g=${grade}">Yarışmalara dön</a>
      </div>
    </div>
  `;
  document.getElementById('print-bracket')?.addEventListener('click', () => window.print());
  document.getElementById('turnuva-again')?.addEventListener('click', renderSetup);
}

main();
