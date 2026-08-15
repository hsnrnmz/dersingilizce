import { bootSite } from './site-boot.js';
import {
  isGradeReady,
  loadJson,
  getRawQuestions,
  getAllUnitQuestions,
  normalizeQuestion,
  isBlankCorrect,
  playSfx,
  escapeHtml,
  launchConfetti,
  shuffle,
  shuffleQuestions,
} from './content.js';
import { GECME_BARAJI, testTamamlandiIsaretle, yolculukHref } from './yolculuk-progress.js';
import { markTestSolved } from './test-progress.js';
import {
  bindSoruBildirButtons,
  enrichAnswersForReport,
  renderResultQuestionArticle,
} from './soru-bildirim.js';

bootSite();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || 0);
const type = params.get('type') === 'quiz' ? 'quiz' : 'kelime';
const uniteNo = Number(params.get('unite') || 0);
const testId = params.get('test') || 'test-1';
const yolculukModu = params.get('yolculuk') === '1';
const hizliModu = params.get('hizli') === '1';
const yolculukAdimId = params.get('adim') || (type === 'quiz' ? 'quiz' : 'kelime-testi');
const soruLimiti = Number(params.get('n') || 0) || (yolculukModu || hizliModu ? 10 : 0);
const rastgeleHavuz = yolculukModu || hizliModu || soruLimiti > 0;

const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const titleEl = document.getElementById('test-title');
const kickerEl = document.getElementById('test-kicker');
const progressEl = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const progressWrap = document.getElementById('test-progress');
const progressScore = document.getElementById('progress-score');
const testBadge = document.getElementById('test-badge');
const backLink = document.getElementById('back-link');

backLink.href = yolculukModu
  ? yolculukHref(grade || 5, uniteNo)
  : hizliModu
    ? `/sinif.html?g=${grade || 5}`
    : `/unite.html?g=${grade || 5}&mode=${type === 'quiz' ? 'quiz' : 'kelime'}`;

let questions = [];
let index = 0;
let correctCount = 0;
let answered = false;
/** @type {{ no:number, prompt:string, imageUrl:string|null, userAnswer:string, correctAnswer:string, ok:boolean }[]} */
let answers = [];
let confettiStop = null;

async function main() {
  if (!isGradeReady(grade) || !uniteNo) {
    statusEl.textContent = 'Geçersiz test bağlantısı.';
    return;
  }

  const modeLabel = type === 'quiz' ? 'Quiz' : 'Kelime testi';
  document.body.classList.add(type === 'quiz' ? 'is-quiz-mode' : 'is-kelime-mode');
  kickerEl.textContent = `${grade}. Sınıf · Ünite ${uniteNo}`;
  titleEl.textContent = rastgeleHavuz
    ? `Hızlı ${modeLabel} · ${soruLimiti || 10} soru`
    : `${modeLabel} ${testId.replace('test-', '')}`;
  document.title = `${modeLabel} — ${grade}. Sınıf`;
  testBadge.hidden = false;
  testBadge.textContent = yolculukModu ? 'Yolculuk' : hizliModu ? 'Hızlı' : type === 'quiz' ? 'Quiz' : 'Kelime';
  testBadge.className = `test-hero-badge ${type === 'quiz' ? 'is-quiz' : 'is-kelime'}`;

  try {
    const file = type === 'quiz' ? 'quiz' : 'testler';
    const data = await loadJson(grade, file);
    const raw = rastgeleHavuz
      ? shuffle(getAllUnitQuestions(data, uniteNo)).slice(0, soruLimiti || 10)
      : getRawQuestions(data, uniteNo, testId);
    questions = shuffleQuestions(
      raw.map((q) => normalizeQuestion(q, { grade, uniteNo, type })).filter((q) => q.prompt),
    );

    if (!questions.length) {
      statusEl.textContent = 'Bu testte soru bulunamadı.';
      return;
    }

    statusEl.hidden = true;
    playerEl.hidden = false;
    progressWrap.hidden = false;
    startTest();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Test yüklenirken hata oluştu.';
  }
}

function updateProgress() {
  const total = questions.length || 1;
  const pct = Math.round(((index + (answered ? 1 : 0)) / total) * 100);
  progressEl.textContent = `Soru ${Math.min(index + 1, total)} / ${total}`;
  progressScore.textContent = answered || correctCount ? `${correctCount} doğru` : `${total} soru`;
  if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

function startTest() {
  index = 0;
  correctCount = 0;
  answers = [];
  confettiStop?.();
  confettiStop = null;
  progressWrap.hidden = false;
  questions = shuffleQuestions(questions);
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  updateProgress();
  const q = questions[index];

  const imageHtml = q.imageUrl
    ? `<div class="q-media"><img class="q-image" src="${q.imageUrl}" alt="Soru görseli" /></div>`
    : '';

  let bodyHtml = '';
  if (q.kind === 'fill_blank') {
    bodyHtml = `
      <div class="blank-panel">
        <label class="blank-label" for="blank-input">Cevabını yaz</label>
        <input class="blank-input" id="blank-input" type="text" autocomplete="off" placeholder="İngilizce yaz…" />
        <button class="primary-btn test-check-btn" type="button" id="check-btn">Kontrol et</button>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="option-list">
        ${q.options
          .map(
            (opt, i) => `
          <button class="option-btn" type="button" data-index="${i}" style="--i:${i}">
            <span class="option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="option-text">${escapeHtml(opt)}</span>
          </button>`,
          )
          .join('')}
      </div>
    `;
  }

  playerEl.innerHTML = `
    <div class="test-stage">
      <div class="q-card q-card-pro">
        <div class="q-card-accent" aria-hidden="true"></div>
        ${imageHtml}
        <p class="q-prompt">${escapeHtml(q.prompt)}</p>
        ${bodyHtml}
        <div class="feedback-panel" id="feedback" hidden>
          <span class="feedback-icon" id="feedback-icon"></span>
          <p class="feedback" id="feedback-text"></p>
        </div>
        <button class="primary-btn test-next-btn" type="button" id="next-btn" hidden>
          ${index + 1 >= questions.length ? 'Sonucu gör' : 'Sonraki soru'}
        </button>
      </div>
    </div>
  `;

  if (q.kind === 'fill_blank') {
    const input = document.getElementById('blank-input');
    const checkBtn = document.getElementById('check-btn');
    const submit = () => {
      if (answered) return;
      settleBlank(q, input.value);
    };
    checkBtn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    input.focus();
  } else {
    playerEl.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered) return;
        settleChoice(q, Number(btn.dataset.index), btn);
      });
    });
  }

  document.getElementById('next-btn').addEventListener('click', () => {
    if (index + 1 >= questions.length) {
      renderResult();
      return;
    }
    index += 1;
    renderQuestion();
  });
}

function showFeedback(ok, message) {
  const panel = document.getElementById('feedback');
  const text = document.getElementById('feedback-text');
  const icon = document.getElementById('feedback-icon');
  const nextBtn = document.getElementById('next-btn');
  panel.hidden = false;
  panel.className = `feedback-panel ${ok ? 'is-ok' : 'is-bad'}`;
  icon.textContent = ok ? '✓' : '✕';
  text.textContent = message;
  text.className = `feedback ${ok ? 'is-ok' : 'is-bad'}`;
  nextBtn.hidden = false;
  updateProgress();
}

function recordAnswer(q, { ok, userAnswer, correctAnswer }) {
  answers.push({
    no: index + 1,
    prompt: q.prompt,
    imageUrl: q.imageUrl,
    userAnswer,
    correctAnswer,
    ok,
  });
  if (ok) correctCount += 1;
  playSfx(ok ? 'correct' : 'false');
}

function settleChoice(q, selected, btn) {
  answered = true;
  const buttons = [...playerEl.querySelectorAll('.option-btn')];

  buttons.forEach((b) => {
    b.disabled = true;
    const i = Number(b.dataset.index);
    if (i === q.correctIndex) b.classList.add('is-correct');
    if (i === selected && selected !== q.correctIndex) b.classList.add('is-wrong');
  });

  const ok = selected === q.correctIndex;
  const userAnswer = q.options[selected] ?? '—';
  const correctAnswer = q.options[q.correctIndex] ?? '—';
  recordAnswer(q, { ok, userAnswer, correctAnswer });

  showFeedback(ok, ok ? 'Harika, doğru!' : `Yanlış. Doğru cevap: ${correctAnswer}`);
  btn?.classList.toggle('is-wrong', !ok);
}

function settleBlank(q, value) {
  answered = true;
  const checkBtn = document.getElementById('check-btn');
  const input = document.getElementById('blank-input');
  checkBtn.disabled = true;
  input.disabled = true;

  const ok = isBlankCorrect(q, value);
  const userAnswer = String(value || '').trim() || '—';
  const correctAnswer = q.acceptedAnswers[0] || '—';
  recordAnswer(q, { ok, userAnswer, correctAnswer });

  input.classList.add(ok ? 'is-correct' : 'is-wrong');
  showFeedback(ok, ok ? 'Harika, doğru!' : `Yanlış. Doğru cevap: ${correctAnswer}`);
}

function renderResult() {
  progressEl.textContent = 'Tamamlandı';
  progressScore.textContent = `${correctCount} / ${questions.length}`;
  if (progressFill) progressFill.style.width = '100%';

  const total = questions.length;
  const wrong = total - correctCount;
  const ratio = total ? Math.round((correctCount / total) * 100) : 0;
  const basarili = ratio >= 50;
  const modeLabel = type === 'quiz' ? 'Quiz' : 'Kelime testi';
  const title = yolculukModu
    ? `${modeLabel} · Yolculuk`
    : hizliModu || rastgeleHavuz
      ? `Hızlı ${modeLabel} · ${total} soru`
      : `${modeLabel} ${testId.replace('test-', '')}`;
  const gecti = correctCount >= GECME_BARAJI;

  if (yolculukModu) {
    testTamamlandiIsaretle(grade, uniteNo, yolculukAdimId, correctCount, wrong);
  } else if (!hizliModu && !rastgeleHavuz) {
    markTestSolved(grade, type, uniteNo, testId, correctCount, wrong);
  }

  const reportCtx = {
    grade,
    uniteNo,
    testId: rastgeleHavuz ? '' : testId,
    etkinlik: 'test',
  };
  const reportAnswers = enrichAnswersForReport(answers, questions, reportCtx);

  playerEl.innerHTML = `
    <div class="result-page">
      <canvas class="confetti-layer" id="confetti-canvas" aria-hidden="true"></canvas>
      <div class="result-hero ${basarili ? 'is-win' : ''}">
        <div class="result-hero-icon">${basarili ? '🏆' : '📋'}</div>
        <div>
          <h2>${basarili ? 'Tebrikler!' : 'Test Tamamlandı'}</h2>
          <p>${escapeHtml(title)}${
            yolculukModu
              ? gecti
                ? ' · Adım açıldı'
                : ` · En az ${GECME_BARAJI} doğru gerekli`
              : ''
          }</p>
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
          <strong>${correctCount}</strong>
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
        <button class="primary-btn" type="button" id="retry-btn">${
          yolculukModu && !gecti ? 'Tekrar dene' : 'Tekrar çöz'
        }</button>
        <a class="ghost-btn" href="${
          yolculukModu
            ? yolculukHref(grade, uniteNo)
            : hizliModu
              ? `/sinif.html?g=${grade}`
              : `/unite.html?g=${grade}&mode=${type === 'quiz' ? 'quiz' : 'kelime'}`
        }">${yolculukModu ? 'Yolculuğa dön' : hizliModu ? 'Sınıfa dön' : 'Ünitelere dön'}</a>
      </div>
    </div>
  `;

  document.getElementById('retry-btn').addEventListener('click', () => {
    confettiStop?.();
    confettiStop = null;
    startTest();
  });

  bindSoruBildirButtons(playerEl.querySelector('.result-detail-list'), reportCtx, reportAnswers);

  if (basarili) {
    playSfx('win');
    confettiStop = launchConfetti(document.getElementById('confetti-canvas'));
  }
}

window.addEventListener('pagehide', () => confettiStop?.());

main();
