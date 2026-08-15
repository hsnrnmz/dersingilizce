import { bootSite } from './site-boot.js';
import {
  isGradeReady,
  MODULES,
  GAMES,
  loadJson,
  unitNamesFrom,
  getUnitWordsFromTests,
  getUnitSentences,
  getListeningContents,
  getWordwallLinks,
  loadBilgiCards,
  normalizeQuestion,
  shuffle,
  playSfx,
  speakEn,
  buildListenWordHtml,
  escapeHtml,
  launchConfetti,
} from './content.js';
import {
  bindSoruBildirButtons,
  enrichAnswersForReport,
  renderResultQuestionArticle,
} from './soru-bildirim.js';
import {
  startUcanBalon,
  startHizliDokun,
  startDusenKelimeler,
  startEslestirme,
  startDogruYanlis,
} from './oyunlar-anim.js';
import { adimiGec, yolculukHref } from './yolculuk-progress.js';

bootSite();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || 0);
const mode = params.get('mode') || 'kartlar';
const uniteNo = Number(params.get('unite') || 0);
const yolculukModu = params.get('yolculuk') === '1';
const yolculukAdimId = params.get('adim') || '';

const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const titleEl = document.getElementById('page-title');
const kickerEl = document.getElementById('page-kicker');
const leadEl = document.getElementById('page-lead');
const backLink = document.getElementById('back-link');

const gameMode = GAMES.some((g) => g.id === mode);
backLink.href = yolculukModu
  ? yolculukHref(grade || 5, uniteNo)
  : gameMode
    ? `/unite.html?g=${grade}&mode=oyunlar`
    : `/unite.html?g=${grade}&mode=${encodeURIComponent(mode)}`;

const modeMeta =
  MODULES.find((m) => m.id === mode) ||
  GAMES.find((g) => g.id === mode) ||
  { title: 'Etkinlik' };

let stopGame = null;
let yolculukKaydedildi = false;

function markYolculukDone() {
  if (!yolculukModu || !yolculukAdimId || yolculukKaydedildi) return;
  yolculukKaydedildi = true;
  adimiGec(grade, uniteNo, yolculukAdimId);
}

function yolculukReturnBtn() {
  if (!yolculukModu) return '';
  return `<a class="ghost-btn" href="${yolculukHref(grade, uniteNo)}">Yolculuğa dön</a>`;
}

async function main() {
  if (!isGradeReady(grade) || !uniteNo) {
    statusEl.textContent = 'Geçersiz etkinlik bağlantısı.';
    return;
  }

  try {
    const uniteler = await loadJson(grade, 'uniteler');
    const unit = unitNamesFrom(uniteler).find((u) => u.no === uniteNo);
    const uniteAdi = unit?.name || `Ünite ${uniteNo}`;

    document.title = `${modeMeta.title} — Ünite ${uniteNo}`;
    kickerEl.textContent = `${grade}. Sınıf · Ünite ${uniteNo}`;
    titleEl.textContent = modeMeta.title;
    leadEl.textContent = uniteAdi;

    if (mode === 'kartlar') await runKartlar();
    else if (mode === 'kelime-yaz') await runKelimeYaz();
    else if (mode === 'cumle') await runCumle();
    else if (mode === 'dinleme') await runDinleme();
    else if (mode === 'bilgi') await runBilgi();
    else if (mode === 'wordwall') await runWordwall();
    else if (mode === 'eslestirme') await runAnimated('eslestirme');
    else if (mode === 'hafiza') await runHafiza();
    else if (mode === 'dogru-yanlis') await runAnimated('dogru-yanlis');
    else if (mode === 'ucan-balon') await runAnimated('ucan-balon');
    else if (mode === 'hizli-dokun') await runAnimated('hizli-dokun');
    else if (mode === 'dusen') await runAnimated('dusen');
    else statusEl.textContent = 'Bu etkinlik henüz bağlanmadı.';
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Etkinlik yüklenirken hata oluştu.';
  }
}

function showPlayer() {
  statusEl.hidden = true;
  playerEl.hidden = false;
}

async function words() {
  const testler = await loadJson(grade, 'testler');
  return shuffle(getUnitWordsFromTests(testler, uniteNo));
}

async function runAnimated(kind) {
  const list = await words();
  if (!list.length) {
    statusEl.textContent = 'Bu ünitede kelime yok.';
    return;
  }
  showPlayer();
  stopGame?.();

  const restart = () => runAnimated(kind);
  const args = {
    playerEl,
    leadEl,
    words: list,
    onRestart: restart,
    onComplete: markYolculukDone,
    extraActionsHtml: yolculukReturnBtn(),
  };

  if (kind === 'ucan-balon') stopGame = startUcanBalon(args);
  else if (kind === 'hizli-dokun') stopGame = startHizliDokun(args);
  else if (kind === 'dusen') stopGame = startDusenKelimeler(args);
  else if (kind === 'eslestirme') stopGame = startEslestirme(args);
  else if (kind === 'dogru-yanlis') stopGame = startDogruYanlis(args);
}

window.addEventListener('pagehide', () => stopGame?.());

/* ---------- Kelime Kartları ---------- */
async function runKartlar() {
  let list = await words();
  if (!list.length) {
    statusEl.textContent = 'Bu ünitede kelime yok.';
    return;
  }
  showPlayer();
  let i = 0;
  let flipped = false;

  const render = () => {
    const w = list[i];
    flipped = false;
    leadEl.textContent = `Kart ${i + 1} / ${list.length}`;
    playerEl.innerHTML = `
      <div class="flash-wrap">
        <div class="flash-topbar">
          <span class="flash-icon">📖</span>
          <strong>Kelime kartları · ${i + 1} / ${list.length}</strong>
        </div>
        <div class="flash-stage">
          <div class="flash-card" id="flip-card" role="button" tabindex="0" aria-label="Kartı çevir">
            <div class="flash-inner" id="flash-inner">
              <div class="flash-face flash-front">
                <span class="flash-badge">${i + 1}/${list.length}</span>
                <div class="flash-body">
                  <button class="flash-speaker" type="button" id="speak-btn" aria-label="Dinle">
                    <span class="flash-speaker-ring" aria-hidden="true"></span>
                    <span class="flash-speaker-core">
                      <span class="flash-speaker-ico" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 9.5v5h3.2L12 18.5V5.5L7.2 9.5H4z" fill="currentColor" stroke="none"/>
                          <path d="M15.2 9.2a3.2 3.2 0 0 1 0 5.6"/>
                          <path d="M17.5 6.8a6 6 0 0 1 0 10.4"/>
                        </svg>
                      </span>
                      <span>Dinle</span>
                    </span>
                  </button>
                  <p class="flash-word">${escapeHtml(w.en)}</p>
                </div>
                <p class="flash-hint">Kelimenin anlamı için karta dokun</p>
              </div>
              <div class="flash-face flash-back">
                <span class="flash-badge">${i + 1}/${list.length}</span>
                <div class="flash-body">
                  <button class="flash-speaker warm" type="button" id="speak-btn-back" aria-label="Dinle">
                    <span class="flash-speaker-ring" aria-hidden="true"></span>
                    <span class="flash-speaker-core">
                      <span class="flash-speaker-ico" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 9.5v5h3.2L12 18.5V5.5L7.2 9.5H4z" fill="currentColor" stroke="none"/>
                          <path d="M15.2 9.2a3.2 3.2 0 0 1 0 5.6"/>
                          <path d="M17.5 6.8a6 6 0 0 1 0 10.4"/>
                        </svg>
                      </span>
                      <span>Dinle</span>
                    </span>
                  </button>
                  <p class="flash-word">${escapeHtml(w.tr)}</p>
                </div>
                <p class="flash-hint">İngilizce yüz için tekrar dokun</p>
              </div>
            </div>
          </div>
        </div>
        <div class="card-actions flash-actions">
          <button class="ghost-btn" type="button" id="prev-btn" ${i === 0 ? 'disabled' : ''}>← Önceki</button>
          <button class="primary-btn" type="button" id="next-btn">${i + 1 >= list.length ? 'Başa dön' : 'Sonraki kelime →'}</button>
        </div>
      </div>`;

    const card = document.getElementById('flip-card');
    const inner = document.getElementById('flash-inner');

    const flip = () => {
      flipped = !flipped;
      inner.classList.toggle('is-flipped', flipped);
      playSfx('flip');
    };

    card.addEventListener('click', (e) => {
      if (e.target.closest('.flash-speaker')) return;
      flip();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });

    const speak = (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakEn(w.en);
      const btn = e.currentTarget;
      btn.classList.remove('is-pulse');
      void btn.offsetWidth;
      btn.classList.add('is-pulse');
    };
    document.getElementById('speak-btn').addEventListener('click', speak);
    document.getElementById('speak-btn-back').addEventListener('click', speak);

    document.getElementById('prev-btn').addEventListener('click', () => {
      if (i > 0) {
        i -= 1;
        render();
      }
    });
    document.getElementById('next-btn').addEventListener('click', () => {
      if (i + 1 >= list.length) {
        list = shuffle(list);
        i = 0;
      } else {
        i += 1;
      }
      render();
    });
  };
  render();
}

/* ---------- Kelime Yaz ---------- */
async function runKelimeYaz() {
  const list = await words();
  if (!list.length) {
    statusEl.textContent = 'Bu ünitede kelime yok.';
    return;
  }
  showPlayer();
  document.body.classList.add('is-spell-mode');
  let i = 0;
  let selected = [];
  let pool = [];
  let checked = false;
  let lastOk = false;

  const prepare = () => {
    const en = list[i].en;
    selected = [];
    checked = false;
    lastOk = false;
    pool = shuffle(en.split('').map((ch, idx) => ({ ch, idx, used: false })));
  };

  const render = () => {
    prepare();
    leadEl.textContent = `Kelime ${i + 1} / ${list.length}`;
    paint();
  };

  const paint = () => {
    const w = list[i];
    const progress = Math.round(((i + (checked ? 1 : 0)) / list.length) * 100);
    const targetLen = w.en.length;

    playerEl.innerHTML = `
      <div class="spell-stage">
        <div class="spell-progress">
          <div class="spell-progress-meta">
            <span>Kelime ${i + 1} / ${list.length}</span>
            <span>${targetLen} harf</span>
          </div>
          <div class="spell-progress-track" aria-hidden="true">
            <div class="spell-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="q-card spell-card">
          <div class="spell-card-accent" aria-hidden="true"></div>
          <p class="spell-kicker">Türkçe anlam</p>
          <p class="spell-prompt">${escapeHtml(w.tr)}</p>
          <p class="spell-hint">Harflere dokunarak İngilizce kelimeyi yaz</p>

          <div class="spell-answer" id="answer-slots" aria-label="Yazılan kelime">
            ${
              selected.length
                ? selected
                    .map((s, idx) => {
                      const isSpace = s.ch === ' ';
                      const state = checked ? (lastOk ? ' is-correct' : ' is-wrong') : '';
                      return `<button class="spell-letter is-selected${isSpace ? ' is-space' : ''}${state}" type="button" data-sel="${idx}" aria-label="${isSpace ? 'Boşluk' : escapeHtml(s.ch)}" ${checked ? 'disabled' : ''}>${isSpace ? '' : escapeHtml(s.ch)}</button>`;
                    })
                    .join('')
                : `<div class="spell-answer-empty">${Array.from({ length: Math.min(targetLen, 12) }, () => '<span class="spell-dash"></span>').join('')}</div>`
            }
          </div>

          <div class="spell-pool-label">Harf havuzu</div>
          <div class="spell-pool letter-pool">
            ${pool
              .map((p, idx) => {
                const isSpace = p.ch === ' ';
                const label = isSpace ? 'Boşluk' : escapeHtml(p.ch);
                if (p.used) {
                  return `<span class="spell-letter is-used${isSpace ? ' is-space' : ''}" aria-label="${label}">${isSpace ? '' : escapeHtml(p.ch)}</span>`;
                }
                return `<button class="spell-letter${isSpace ? ' is-space' : ''}" type="button" data-pool="${idx}" aria-label="${label}" ${checked ? 'disabled' : ''}>${isSpace ? '' : escapeHtml(p.ch)}</button>`;
              })
              .join('')}
          </div>

          <div class="feedback-panel spell-feedback ${checked ? (lastOk ? 'is-ok' : 'is-bad') : ''}" id="feedback" ${checked ? '' : 'hidden'}>
            <span class="feedback-icon">${checked ? (lastOk ? '✓' : '✕') : ''}</span>
            <p class="feedback ${checked ? (lastOk ? 'is-ok' : 'is-bad') : ''}" id="feedback-text">${
              checked ? (lastOk ? 'Harika, doğru!' : `Yanlış. Doğru yazım: ${escapeHtml(w.en)}`) : ''
            }</p>
          </div>

          <div class="spell-actions card-actions">
            <button class="ghost-btn" type="button" id="clear-btn" ${checked ? 'disabled' : ''}>Temizle</button>
            <button class="primary-btn" type="button" id="check-btn" ${checked ? 'disabled' : ''}>Kontrol et</button>
            <button class="primary-btn spell-next-btn" type="button" id="next-btn" ${checked ? '' : 'hidden'}>
              ${i + 1 >= list.length ? 'Başa dön' : 'Sonraki kelime'}
            </button>
          </div>
        </div>
      </div>`;

    playerEl.querySelectorAll('[data-pool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (checked) return;
        const idx = Number(btn.dataset.pool);
        selected.push(pool[idx]);
        pool[idx].used = true;
        playSfx('pop');
        paint();
      });
    });
    playerEl.querySelectorAll('[data-sel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (checked) return;
        const idx = Number(btn.dataset.sel);
        const item = selected.splice(idx, 1)[0];
        const p = pool.find((x) => x.idx === item.idx);
        if (p) p.used = false;
        paint();
      });
    });
    document.getElementById('clear-btn')?.addEventListener('click', () => {
      if (checked) return;
      prepare();
      paint();
    });
    document.getElementById('check-btn')?.addEventListener('click', () => {
      if (checked) return;
      const built = selected.map((s) => s.ch).join('');
      lastOk = built.toLowerCase() === w.en.toLowerCase();
      checked = true;
      playSfx(lastOk ? 'correct' : 'false');
      paint();
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      i = (i + 1) % list.length;
      render();
    });
  };

  render();
}

/* ---------- Cümle Oluştur ---------- */
async function runCumle() {
  const data = await loadJson(grade, 'cumleler');
  const list = shuffle(getUnitSentences(data, uniteNo));
  if (!list.length) {
    statusEl.textContent = 'Bu ünitede cümle yok.';
    return;
  }
  showPlayer();
  document.body.classList.add('is-build-mode');
  let i = 0;
  let selected = [];
  let pool = [];
  let checked = false;
  let lastOk = false;
  let correctWords = [];

  const prepare = () => {
    correctWords = list[i].en.trim().split(/\s+/);
    selected = [];
    checked = false;
    lastOk = false;
    pool = shuffle(correctWords.map((w, idx) => ({ w, idx, used: false })));
  };

  const render = () => {
    prepare();
    leadEl.textContent = `Cümle ${i + 1} / ${list.length}`;
    paint();
  };

  const paint = () => {
    const c = list[i];
    const progress = Math.round(((i + (checked ? 1 : 0)) / list.length) * 100);
    const wordCount = correctWords.length;

    playerEl.innerHTML = `
      <div class="build-stage">
        <div class="build-progress">
          <div class="build-progress-meta">
            <span>Cümle ${i + 1} / ${list.length}</span>
            <span>${wordCount} kelime</span>
          </div>
          <div class="build-progress-track" aria-hidden="true">
            <div class="build-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="q-card build-card">
          <div class="build-card-accent" aria-hidden="true"></div>
          <p class="build-kicker">Türkçe anlam</p>
          <p class="build-prompt">${escapeHtml(c.tr)}</p>
          <p class="build-hint">Kelimeleri doğru sırayla seçerek cümleyi kur</p>

          <div class="build-answer" aria-label="Kurulan cümle">
            ${
              selected.length
                ? selected
                    .map((s, idx) => {
                      const state = checked ? (lastOk ? ' is-correct' : ' is-wrong') : '';
                      return `<button class="build-word is-selected${state}" type="button" data-sel="${idx}" ${checked ? 'disabled' : ''}>${escapeHtml(s.w)}</button>`;
                    })
                    .join('')
                : `<div class="build-answer-empty">
                    ${Array.from({ length: Math.min(wordCount, 8) }, () => '<span class="build-slot"></span>').join('')}
                    <span class="build-empty-hint">Kelimeleri sırayla seç</span>
                  </div>`
            }
          </div>

          <div class="build-pool-label">Kelime havuzu</div>
          <div class="build-pool">
            ${pool
              .map((p, idx) =>
                p.used
                  ? `<span class="build-word is-used">${escapeHtml(p.w)}</span>`
                  : `<button class="build-word" type="button" data-pool="${idx}" ${checked ? 'disabled' : ''}>${escapeHtml(p.w)}</button>`,
              )
              .join('')}
          </div>

          <div class="feedback-panel build-feedback ${checked ? (lastOk ? 'is-ok' : 'is-bad') : ''}" id="feedback" ${checked ? '' : 'hidden'}>
            <span class="feedback-icon">${checked ? (lastOk ? '✓' : '✕') : ''}</span>
            <p class="feedback ${checked ? (lastOk ? 'is-ok' : 'is-bad') : ''}" id="feedback-text">${
              checked ? (lastOk ? 'Harika, doğru!' : `Yanlış. Doğru cümle: ${escapeHtml(c.en)}`) : ''
            }</p>
          </div>

          <div class="build-actions card-actions">
            <button class="ghost-btn" type="button" id="clear-btn" ${checked ? 'disabled' : ''}>Temizle</button>
            <button class="primary-btn" type="button" id="check-btn" ${checked ? 'disabled' : ''}>Kontrol et</button>
            <button class="primary-btn build-next-btn" type="button" id="next-btn" ${checked ? '' : 'hidden'}>
              ${i + 1 >= list.length ? 'Başa dön' : 'Sonraki cümle'}
            </button>
          </div>
        </div>
      </div>`;

    playerEl.querySelectorAll('[data-pool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (checked) return;
        const idx = Number(btn.dataset.pool);
        selected.push(pool[idx]);
        pool[idx].used = true;
        playSfx('pop');
        paint();
      });
    });
    playerEl.querySelectorAll('[data-sel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (checked) return;
        const idx = Number(btn.dataset.sel);
        const item = selected.splice(idx, 1)[0];
        const p = pool.find((x) => x.idx === item.idx);
        if (p) p.used = false;
        paint();
      });
    });
    document.getElementById('clear-btn')?.addEventListener('click', () => {
      if (checked) return;
      prepare();
      paint();
    });
    document.getElementById('check-btn')?.addEventListener('click', () => {
      if (checked) return;
      const built = selected.map((s) => s.w);
      lastOk =
        built.length === correctWords.length &&
        built.every((w, idx) => w === correctWords[idx]);
      checked = true;
      playSfx(lastOk ? 'correct' : 'false');
      paint();
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      i = (i + 1) % list.length;
      render();
    });
  };

  render();
}

/* ---------- Dinleme ---------- */
async function runDinleme() {
  const data = await loadJson(grade, 'dinleme');
  const contents = getListeningContents(data, uniteNo);
  if (!contents.length) {
    statusEl.textContent = 'Bu ünitede dinleme içeriği yok.';
    return;
  }
  showPlayer();
  let contentIndex = 0;
  let qIndex = 0;
  let phase = 'text';
  let correct = 0;
  let stopSpeak = null;
  let confettiStop = null;
  /** @type {{ no:number, prompt:string, userAnswer:string, correctAnswer:string, ok:boolean }[]} */
  let quizAnswers = [];
  /** @type {object[]} */
  let quizQuestions = [];

  const clearWordHighlight = () => {
    playerEl.querySelectorAll('.listen-word.is-active').forEach((el) => el.classList.remove('is-active'));
  };

  const stopListening = () => {
    stopSpeak?.();
    stopSpeak = null;
    clearWordHighlight();
    const btn = document.getElementById('speak-btn');
    if (btn) btn.textContent = 'Metni dinle';
    const qBtn = document.getElementById('speak-q-btn');
    if (qBtn) qBtn.textContent = 'Soruyu dinle';
  };

  const stopConfetti = () => {
    confettiStop?.();
    confettiStop = null;
  };

  const highlightWordByIndex = (idx) => {
    const nodes = [...playerEl.querySelectorAll('.listen-word')];
    if (!nodes.length || idx < 0) return;
    nodes.forEach((el, i) => {
      const on = i === idx;
      el.classList.toggle('is-active', on);
      if (on) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    });
  };

  const playText = (text, words) => {
    stopListening();
    const btn = document.getElementById('speak-btn');
    if (btn) btn.textContent = 'Durdur';
    stopSpeak = speakEn(text, {
      rate: 0.78,
      words,
      onWord: (idx) => highlightWordByIndex(idx),
      onEnd: () => {
        stopSpeak = null;
        clearWordHighlight();
        if (btn) btn.textContent = 'Metni dinle';
      },
    });
  };

  const goToContent = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= contents.length) return;
    stopConfetti();
    contentIndex = nextIndex;
    phase = 'text';
    qIndex = 0;
    correct = 0;
    quizAnswers = [];
    quizQuestions = [];
    render();
  };

  const renderQuizResult = (item) => {
    stopListening();
    stopConfetti();
    const total = item.sorular.length;
    const wrong = total - correct;
    const ratio = total ? Math.round((correct / total) * 100) : 0;
    const basarili = correct >= 3;
    const hasNext = contentIndex + 1 < contents.length;
    leadEl.textContent = 'Sonuç';

    const reportCtx = {
      grade,
      uniteNo,
      testId: `dinleme-metin-${contentIndex + 1}`,
      etkinlik: 'dinleme',
      contentIndex,
    };
    const reportAnswers = enrichAnswersForReport(quizAnswers, quizQuestions, reportCtx);

    playerEl.innerHTML = `
      <div class="result-page">
        <canvas class="confetti-layer" id="confetti-canvas" aria-hidden="true"></canvas>
        <div class="result-hero ${basarili ? 'is-win' : ''}">
          <div class="result-hero-icon">${basarili ? '🏆' : '📋'}</div>
          <div>
            <h2>${basarili ? 'Tebrikler!' : 'Test Tamamlandı'}</h2>
            <p>${escapeHtml(item.baslik)}</p>
          </div>
        </div>

        <div class="result-ring-wrap">
          <div class="result-ring" style="--p:${ratio}">
            <strong>%${ratio}</strong>
            <span>Başarı</span>
          </div>
        </div>

        <div class="result-stats">
          <div class="result-stat ok">
            <span>Doğru</span>
            <strong>${correct}</strong>
          </div>
          <div class="result-stat bad">
            <span>Yanlış</span>
            <strong>${wrong}</strong>
          </div>
          <div class="result-stat">
            <span>Toplam</span>
            <strong>${total}</strong>
          </div>
        </div>

        <h3 class="result-detail-title">Soru Detayları</h3>
        <div class="result-detail-list">
          ${reportAnswers.map((a) => renderResultQuestionArticle(a)).join('')}
        </div>

        <div class="result-actions">
          <button class="primary-btn" type="button" id="retry-quiz">Tekrar çöz</button>
          <button class="ghost-btn" type="button" id="back-text">Metne dön</button>
          ${
            hasNext
              ? `<button class="primary-btn" type="button" id="next-content">Sonraki metin</button>`
              : ''
          }
          <a class="ghost-btn" href="/unite.html?g=${grade}&mode=dinleme">Ünitelere dön</a>
        </div>
      </div>`;

    document.getElementById('retry-quiz')?.addEventListener('click', () => {
      stopConfetti();
      phase = 'quiz';
      qIndex = 0;
      correct = 0;
      quizAnswers = [];
      quizQuestions = [];
      render();
    });
    document.getElementById('back-text')?.addEventListener('click', () => {
      stopConfetti();
      phase = 'text';
      render();
    });
    document.getElementById('next-content')?.addEventListener('click', () => goToContent(contentIndex + 1));

    bindSoruBildirButtons(playerEl.querySelector('.result-detail-list'), reportCtx, reportAnswers);

    if (basarili) {
      playSfx('win');
      confettiStop = launchConfetti(document.getElementById('confetti-canvas'));
    }
  };

  const render = () => {
    stopListening();
    const item = contents[contentIndex];
    if (phase === 'text') {
      leadEl.textContent = `Metin ${contentIndex + 1} / ${contents.length}`;
      const listenWords = item.metin ? buildListenWordHtml(item.metin) : null;
      const hasMany = contents.length > 1;
      playerEl.innerHTML = `
        <div class="q-card listen-card">
          ${
            hasMany
              ? `<div class="listen-picker" role="tablist" aria-label="Dinleme metinleri">
                  ${contents
                    .map(
                      (c, i) => `
                    <button class="listen-picker-btn ${i === contentIndex ? 'is-active' : ''}" type="button" data-content="${i}" role="tab" aria-selected="${i === contentIndex}">
                      <span class="listen-picker-no">${i + 1}</span>
                      <span class="listen-picker-title">${escapeHtml(c.baslik)}</span>
                    </button>`,
                    )
                    .join('')}
                </div>`
              : ''
          }
          <h2 class="section-title">${escapeHtml(item.baslik)}</h2>
          ${
            item.youtubeId
              ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${escapeHtml(item.youtubeId)}" title="Video" allowfullscreen></iframe></div>`
              : ''
          }
          ${
            listenWords
              ? `<p class="listen-text" id="listen-text">${listenWords.html}</p>`
              : ''
          }
          <div class="card-actions listen-actions">
            ${item.metin ? `<button class="primary-btn" type="button" id="speak-btn">Metni dinle</button>` : ''}
            ${
              item.sorular?.length
                ? `<button class="primary-btn" type="button" id="quiz-btn">Sorulara geç</button>`
                : ''
            }
          </div>
          ${
            hasMany
              ? `<div class="listen-nav">
                  <button class="ghost-btn" type="button" id="prev-content" ${contentIndex === 0 ? 'disabled' : ''}>← Önceki metin</button>
                  <button class="ghost-btn" type="button" id="next-content" ${contentIndex + 1 >= contents.length ? 'disabled' : ''}>Sonraki metin →</button>
                </div>`
              : ''
          }
        </div>`;
      document.getElementById('speak-btn')?.addEventListener('click', () => {
        if (stopSpeak) {
          stopListening();
          return;
        }
        playText(item.metin, listenWords?.words || []);
      });
      document.getElementById('quiz-btn')?.addEventListener('click', () => {
        phase = 'quiz';
        qIndex = 0;
        correct = 0;
        quizAnswers = [];
        quizQuestions = [];
        stopConfetti();
        render();
      });
      document.getElementById('prev-content')?.addEventListener('click', () => goToContent(contentIndex - 1));
      document.getElementById('next-content')?.addEventListener('click', () => goToContent(contentIndex + 1));
      playerEl.querySelectorAll('[data-content]').forEach((btn) => {
        btn.addEventListener('click', () => goToContent(Number(btn.dataset.content)));
      });
      return;
    }

    if (phase === 'quiz') {
      const raw = item.sorular[qIndex];
      const q = normalizeQuestion(raw, { grade, uniteNo, type: 'dinleme' });
      leadEl.textContent = `Soru ${qIndex + 1} / ${item.sorular.length}`;
      playerEl.innerHTML = `
        <div class="q-card listen-quiz-card">
          <div class="listen-q-head">
            <div class="listen-q-audio" aria-hidden="true">
              <span class="listen-q-wave"></span>
              <span class="listen-q-wave"></span>
              <span class="listen-q-wave"></span>
            </div>
            <p class="listen-q-hint">Soruyu dinle, sonra cevabı seç.</p>
            <p class="q-prompt listen-q-prompt" id="q-prompt" hidden>${escapeHtml(q.prompt)}</p>
            <div class="listen-q-actions">
              <button class="primary-btn speak-q-btn" type="button" id="speak-q-btn">Soruyu dinle</button>
              <button class="ghost-btn" type="button" id="reveal-q-btn">Soruyu gör</button>
            </div>
          </div>
          <div class="option-list">
            ${q.options
              .map(
                (opt, idx) => `
              <button class="option-btn" type="button" data-index="${idx}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span>${escapeHtml(opt)}</span>
              </button>`,
              )
              .join('')}
          </div>
          <div class="feedback-panel listen-feedback" id="feedback" hidden>
            <span class="feedback-icon" id="feedback-icon"></span>
            <p class="feedback" id="feedback-text"></p>
          </div>
          <button class="primary-btn" type="button" id="next-btn" hidden>Devam</button>
        </div>`;

      const promptEl = document.getElementById('q-prompt');
      const revealBtn = document.getElementById('reveal-q-btn');
      const speakBtn = document.getElementById('speak-q-btn');
      const audioEl = playerEl.querySelector('.listen-q-audio');

      const setSpeakingUi = (on) => {
        audioEl?.classList.toggle('is-playing', on);
        if (speakBtn) speakBtn.textContent = on ? 'Durdur' : 'Soruyu dinle';
      };

      revealBtn?.addEventListener('click', () => {
        const visible = !promptEl.hidden;
        promptEl.hidden = visible;
        revealBtn.textContent = visible ? 'Soruyu gör' : 'Soruyu gizle';
      });

      document.getElementById('speak-q-btn')?.addEventListener('click', () => {
        if (stopSpeak) {
          stopListening();
          setSpeakingUi(false);
          return;
        }
        setSpeakingUi(true);
        stopSpeak = speakEn(q.prompt, {
          rate: 0.78,
          onEnd: () => {
            stopSpeak = null;
            setSpeakingUi(false);
          },
        });
      });

      // Auto-play audio only; question text stays hidden
      setSpeakingUi(true);
      stopSpeak = speakEn(q.prompt, {
        rate: 0.78,
        onEnd: () => {
          stopSpeak = null;
          setSpeakingUi(false);
        },
      });

      let answered = false;
      playerEl.querySelectorAll('.option-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          stopListening();
          setSpeakingUi(false);
          const selected = Number(btn.dataset.index);
          playerEl.querySelectorAll('.option-btn').forEach((b) => {
            b.disabled = true;
            const n = Number(b.dataset.index);
            if (n === q.correctIndex) b.classList.add('is-correct');
            if (n === selected && selected !== q.correctIndex) b.classList.add('is-wrong');
          });
          const ok = selected === q.correctIndex;
          const userAnswer = q.options[selected] ?? '—';
          const correctAnswer = q.options[q.correctIndex] ?? '—';
          if (ok) correct += 1;
          quizQuestions.push(q);
          quizAnswers.push({
            no: qIndex + 1,
            prompt: q.prompt,
            userAnswer,
            correctAnswer,
            ok,
          });
          playSfx(ok ? 'correct' : 'false');
          const panel = document.getElementById('feedback');
          const fb = document.getElementById('feedback-text');
          const icon = document.getElementById('feedback-icon');
          panel.hidden = false;
          panel.className = `feedback-panel listen-feedback ${ok ? 'is-ok' : 'is-bad'}`;
          icon.textContent = ok ? '✓' : '✕';
          fb.className = `feedback ${ok ? 'is-ok' : 'is-bad'}`;
          fb.textContent = ok ? 'Doğru!' : `Yanlış. Doğru cevap: ${correctAnswer}`;
          // Reveal question after answer so students can review
          if (promptEl) {
            promptEl.hidden = false;
            if (revealBtn) revealBtn.textContent = 'Soruyu gizle';
          }
          document.getElementById('next-btn').hidden = false;
        });
      });
      document.getElementById('next-btn').addEventListener('click', () => {
        if (qIndex + 1 < item.sorular.length) {
          qIndex += 1;
          render();
          return;
        }
        renderQuizResult(item);
      });
    }
  };

  render();
}

/* ---------- Bilgi Kartları ---------- */
async function runBilgi() {
  const loaded = await loadBilgiCards(grade, uniteNo);
  if (!loaded.length) {
    statusEl.textContent = 'Bu ünitede bilgi kartı yok.';
    return;
  }
  showPlayer();
  document.body.classList.add('is-bilgi-mode');

  let cards = shuffle([...loaded]);
  let i = 0;
  let flipped = false;
  /** @type {Set<number>} */
  const anladim = new Set();
  /** @type {Set<number>} */
  const bilmiyorum = new Set();

  const render = () => {
    const c = cards[i];
    const total = cards.length;
    const progress = Math.round(((i + 1) / total) * 100);
    const understood = anladim.has(i);
    const unknown = bilmiyorum.has(i);

    leadEl.textContent = `Kart ${i + 1} / ${total}`;
    playerEl.innerHTML = `
      <div class="bilgi-stage">
        <div class="bilgi-progress">
          <div class="bilgi-progress-meta">
            <span>${i + 1} / ${total}</span>
            <span class="bilgi-understood-pill">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9.2 16.6 4.8 12.2l1.4-1.4 3 3 8-8 1.4 1.4-9.4 9.4z"/></svg>
              ${anladim.size} anladım
            </span>
          </div>
          <div class="bilgi-progress-track" aria-hidden="true">
            <div class="bilgi-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="bilgi-card-stage">
          <div class="bilgi-card ${understood ? 'is-understood' : ''}" id="bilgi-card" role="button" tabindex="0" aria-label="Kartı çevir">
            <div class="bilgi-inner ${flipped ? 'is-flipped' : ''}" id="bilgi-inner">
              <div class="bilgi-face bilgi-front">
                ${understood ? '<span class="bilgi-chip ok">Anladım</span>' : ''}
                <span class="bilgi-face-icon" aria-hidden="true">?</span>
                <span class="bilgi-tag is-q">Soru</span>
                <p class="bilgi-text">${escapeHtml(c.soru)}</p>
                <p class="bilgi-tap-hint">Yanıtı göster · karta dokun</p>
              </div>
              <div class="bilgi-face bilgi-back">
                ${understood ? '<span class="bilgi-chip ok">Anladım</span>' : ''}
                <span class="bilgi-face-icon is-answer" aria-hidden="true">💡</span>
                <span class="bilgi-tag is-a">Cevap</span>
                <p class="bilgi-text">${escapeHtml(c.cevap)}</p>
                <p class="bilgi-tap-hint">Soruya dön · karta dokun</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bilgi-controls">
          <button class="bilgi-round-btn" type="button" id="prev-btn" ${i === 0 ? 'disabled' : ''} aria-label="Önceki">
            ←
          </button>
          <button class="bilgi-mark-btn is-bad ${unknown ? 'is-active' : ''}" type="button" id="unknown-btn">
            <span aria-hidden="true">✕</span>
            <strong>${bilmiyorum.size}</strong>
            <em>Bilmiyorum</em>
          </button>
          <button class="bilgi-mark-btn is-ok ${understood ? 'is-active' : ''}" type="button" id="known-btn">
            <span aria-hidden="true">✓</span>
            <strong>${anladim.size}</strong>
            <em>Anladım</em>
          </button>
          <button class="bilgi-round-btn" type="button" id="next-btn" ${i + 1 >= total ? 'disabled' : ''} aria-label="Sonraki">
            →
          </button>
        </div>

        <div class="bilgi-extra">
          <button class="ghost-btn" type="button" id="shuffle-btn">Kartları karıştır</button>
          ${
            yolculukModu
              ? `<button class="primary-btn" type="button" id="yolculuk-done-btn">Tamamla · Yolculuğa dön</button>`
              : ''
          }
        </div>
      </div>`;

    const card = document.getElementById('bilgi-card');
    const inner = document.getElementById('bilgi-inner');

    const flip = () => {
      flipped = !flipped;
      inner.classList.toggle('is-flipped', flipped);
      playSfx('flip');
    };

    card.addEventListener('click', flip);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });

    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (i <= 0) return;
      i -= 1;
      flipped = false;
      render();
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      if (i + 1 >= total) return;
      i += 1;
      flipped = false;
      render();
    });
    document.getElementById('known-btn')?.addEventListener('click', () => {
      anladim.add(i);
      bilmiyorum.delete(i);
      playSfx('correct');
      render();
    });
    document.getElementById('unknown-btn')?.addEventListener('click', () => {
      bilmiyorum.add(i);
      anladim.delete(i);
      playSfx('pop');
      render();
    });
    document.getElementById('shuffle-btn')?.addEventListener('click', () => {
      cards = shuffle([...loaded]);
      i = 0;
      flipped = false;
      anladim.clear();
      bilmiyorum.clear();
      playSfx('flip');
      render();
    });
    document.getElementById('yolculuk-done-btn')?.addEventListener('click', () => {
      markYolculukDone();
      location.href = yolculukHref(grade, uniteNo);
    });
  };

  render();
}

/* ---------- Wordwall ---------- */
async function runWordwall() {
  const data = await loadJson(grade, 'oyunlar');
  const links = getWordwallLinks(data, uniteNo);
  if (!links.length) {
    statusEl.textContent = 'Bu ünitede Wordwall oyunu yok.';
    return;
  }
  showPlayer();
  document.body.classList.add('is-wordwall-mode');
  let active = -1;

  const renderList = () => {
    active = -1;
    leadEl.textContent = `${links.length} oyun`;
    playerEl.innerHTML = `
      <div class="wordwall-hub">
        <div class="wordwall-hub-banner">
          <div class="wordwall-hub-banner-glow" aria-hidden="true"></div>
          <div class="wordwall-hub-icon">🎮</div>
          <div class="wordwall-hub-copy">
            <p class="wordwall-hub-eyebrow">Wordwall</p>
            <h2>Ünite ${uniteNo} oyunları</h2>
            <p>Bir oyuna tıklayarak başla.</p>
          </div>
          <div class="wordwall-hub-stat">
            <strong>${links.length}</strong>
            <span>Oyun</span>
          </div>
        </div>
        <div class="wordwall-grid">
          ${links
            .map(
              (item, idx) => `
            <article class="wordwall-tile" data-game="${idx}">
              <div class="wordwall-tile-preview" aria-hidden="true">
                <div class="wordwall-tile-scaler">
                  <iframe src="${escapeHtml(item.link)}" title="" loading="lazy" tabindex="-1"></iframe>
                </div>
                <div class="wordwall-tile-shade"></div>
              </div>
              <div class="wordwall-tile-foot">
                <span class="wordwall-tile-no">${idx + 1}</span>
                <div class="wordwall-tile-body">
                  <strong>${escapeHtml(item.baslik)}</strong>
                  <span>Oyna</span>
                </div>
              </div>
              <button class="wordwall-tile-hit" type="button" data-game-btn="${idx}" aria-label="${escapeHtml(item.baslik)} oyununu aç"></button>
            </article>`,
            )
            .join('')}
        </div>
      </div>`;

    playerEl.querySelectorAll('[data-game-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = Number(btn.dataset.gameBtn);
        renderGame();
      });
    });
  };

  const renderGame = () => {
    const item = links[active];
    if (!item) {
      renderList();
      return;
    }
    leadEl.textContent = `Oyun ${active + 1} / ${links.length}`;
    playerEl.innerHTML = `
      <div class="wordwall-play">
        <div class="wordwall-play-bar">
          <button class="ghost-btn" type="button" id="back-list">← Oyun listesi</button>
          <h2 class="wordwall-play-title">${escapeHtml(item.baslik)}</h2>
          <a class="primary-btn" href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Yeni sekmede aç</a>
        </div>
        <div class="q-card wordwall-card">
          <div class="wordwall-frame">
            <iframe src="${escapeHtml(item.link)}" title="${escapeHtml(item.baslik)}" allowfullscreen></iframe>
          </div>
        </div>
        <div class="wordwall-play-nav">
          <button class="ghost-btn" type="button" id="prev-btn" ${active === 0 ? 'disabled' : ''}>← Önceki</button>
          <button class="ghost-btn" type="button" id="next-btn" ${active + 1 >= links.length ? 'disabled' : ''}>Sonraki →</button>
        </div>
      </div>`;

    document.getElementById('back-list')?.addEventListener('click', renderList);
    document.getElementById('prev-btn')?.addEventListener('click', () => {
      if (active > 0) {
        active -= 1;
        renderGame();
      }
    });
    document.getElementById('next-btn')?.addEventListener('click', () => {
      if (active + 1 < links.length) {
        active += 1;
        renderGame();
      }
    });
  };

  renderList();
}

/* ---------- Hafıza Kartı ---------- */
async function runHafiza() {
  const all = await words();
  if (all.length < 4) {
    statusEl.textContent = 'Hafıza oyunu için yeterli kelime yok.';
    return;
  }
  showPlayer();
  const picked = shuffle(all).slice(0, 6);
  const tiles = shuffle(
    picked.flatMap((w, id) => [
      { id, key: `${id}-en`, text: w.en, side: 'en' },
      { id, key: `${id}-tr`, text: w.tr, side: 'tr' },
    ]),
  );
  const matched = new Set();
  let open = [];
  let wrongKeys = new Set();
  let lock = false;
  let moves = 0;

  const paint = () => {
    leadEl.textContent = `Hamle: ${moves}`;
    playerEl.innerHTML = `
      <div class="q-card">
        <div class="memory-grid">
          ${tiles
            .map((t) => {
              const isMatched = matched.has(t.id);
              const isSelected = open.some((o) => o.key === t.key);
              const isWrong = wrongKeys.has(t.key);
              const revealed = isMatched || isSelected || isWrong;
              const cls = [
                'memory-tile',
                isSelected && !isMatched ? 'is-open' : '',
                isMatched ? 'is-matched' : '',
                isWrong ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return `<button class="${cls}" type="button" data-key="${t.key}">
                ${revealed ? escapeHtml(t.text) : '?'}
              </button>`;
            })
            .join('')}
        </div>
        ${
          matched.size === picked.length
            ? `<div class="card-actions">
                <button class="primary-btn" type="button" id="again-btn">Yeniden</button>
                ${yolculukReturnBtn()}
              </div>`
            : ''
        }
      </div>`;

    playerEl.querySelectorAll('.memory-tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (lock) return;
        const key = btn.dataset.key;
        const tile = tiles.find((t) => t.key === key);
        if (!tile || matched.has(tile.id) || open.some((o) => o.key === key)) return;
        open.push(tile);
        paint();
        if (open.length < 2) return;
        moves += 1;
        lock = true;
        const [a, b] = open;
        if (a.id === b.id && a.side !== b.side) {
          matched.add(a.id);
          playSfx('correct');
          open = [];
          lock = false;
          if (matched.size === picked.length) {
            playSfx('win');
            markYolculukDone();
          }
          paint();
        } else {
          wrongKeys = new Set([a.key, b.key]);
          playSfx('false');
          paint();
          setTimeout(() => {
            open = [];
            wrongKeys = new Set();
            lock = false;
            paint();
          }, 700);
        }
      });
    });
    document.getElementById('again-btn')?.addEventListener('click', () => runHafiza());
  };
  paint();
}

main();
