import {
  loadJson,
  getAllUnitQuestions,
  normalizeQuestion,
  shuffleQuestions,
  escapeHtml,
  playSfx,
} from './content.js';

export const SORU_SECENEKLERI = [5, 8, 10, 12, 15];
export const SURE_SECENEKLERI = [
  { value: 0, label: 'Süre yok' },
  { value: 60, label: '60 sn' },
  { value: 90, label: '90 sn' },
  { value: 120, label: '2 dk' },
];

export function formatRaceTime(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export async function loadRaceQuestions(grade, { type, uniteNo, count, jokerCount = 12 }) {
  const pool = await loadRaceQuestionPool(grade, { type, uniteNo });
  const picked = shuffleQuestions(pool).slice(0, count + jokerCount);
  return {
    questions: picked.slice(0, count),
    jokerQuestions: picked.slice(count, count + jokerCount),
  };
}

/** Seçilen ünitedeki tüm uygun yarış sorularını yükler. */
export async function loadRaceQuestionPool(grade, { type, uniteNo }) {
  const file = type === 'quiz' ? 'quiz' : 'testler';
  const data = await loadJson(grade, file);
  return shuffleQuestions(
    getAllUnitQuestions(data, uniteNo)
      .map((q) => normalizeQuestion(q, { grade, uniteNo, type }))
      .filter((q) => q.prompt && q.kind !== 'fill_blank' && q.options?.length >= 2),
  );
}

export function questionKey(q) {
  return q.id || q.prompt;
}

/**
 * Havuzdan maç için soru çeker; daha önce kullanılanları atlar.
 * @param {ReturnType<typeof normalizeQuestion>[]} pool
 * @param {{ count: number, jokerCount?: number, usedKeys: Set<string> }} opts
 */
export function drawMatchQuestions(pool, { count, jokerCount = 12, usedKeys }) {
  const need = count + jokerCount;
  let source = pool.filter((q) => !usedKeys.has(questionKey(q)));
  let allowReuse = false;

  if (source.length < count) {
    source = [...pool];
    allowReuse = true;
  }

  const shuffled = shuffleQuestions(source);
  /** @type {typeof pool} */
  const picked = [];
  const seen = new Set();

  for (const q of shuffled) {
    if (picked.length >= need) break;
    const key = questionKey(q);
    if (seen.has(key)) continue;
    if (!allowReuse && usedKeys.has(key)) continue;
    seen.add(key);
    picked.push(q);
  }

  if (picked.length < need) {
    for (const q of shuffleQuestions(pool)) {
      if (picked.length >= need) break;
      const key = questionKey(q);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(q);
    }
  }

  for (const q of picked) usedKeys.add(questionKey(q));

  return {
    questions: shuffleQuestions(picked.slice(0, count)),
    jokerQuestions: picked.slice(count, count + jokerCount),
  };
}

function playCountdownSound(step) {
  playSfx(step === 'Başla!' ? 'win' : 'pop');
}

function runStartCountdown(host, names) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = reduced ? ['Başla!'] : ['3', '2', '1', 'Başla!'];
  const stepMs = reduced ? 400 : 900;
  let countdownTimer = null;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'yaris-countdown';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.innerHTML = `
      <div class="yaris-countdown-inner">
        <p class="yaris-countdown-label">${escapeHtml(names[0])} · VS · ${escapeHtml(names[1])}</p>
        <span class="yaris-countdown-num" id="yaris-countdown-num">${steps[0]}</span>
      </div>
    `;
    const mount = host.querySelector('#yaris-play') || host;
    mount.appendChild(overlay);

    let i = 0;
    const tick = () => {
      const step = steps[i];
      playCountdownSound(step);
      const numEl = overlay.querySelector('#yaris-countdown-num');
      if (numEl) {
        numEl.textContent = step;
        numEl.classList.remove('yaris-countdown-pop');
        void numEl.offsetWidth;
        numEl.classList.add('yaris-countdown-pop');
        numEl.classList.toggle('is-go', step === 'Başla!');
      }
      i += 1;
      if (i >= steps.length) {
        overlay.classList.add('is-done');
        countdownTimer = setTimeout(() => {
          overlay.remove();
          resolve();
        }, stepMs * 0.75);
      } else {
        countdownTimer = setTimeout(tick, stepMs);
      }
    };
    tick();
  });
}

/**
 * Beraberlikte joker sorular: ilk doğru cevaplayan kazanır;
 * ikisi de yanlışsa sıradaki joker soruya geçilir.
 */
export function runJokerTiebreak(app, { jokerQuestions, names, scores = [0, 0], hudExtra = '' }) {
  return new Promise((resolve) => {
    let jokerIndex = 0;
    let questionLocked = false;
    let eliminated = [false, false];
    /** @type {ReturnType<typeof setTimeout> | null} */
    let advanceTimer = null;

    const clearAdvance = () => {
      if (advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
      }
    };

    const finish = (winner) => {
      clearAdvance();
      resolve({ winner, usedCount: winner === null ? jokerIndex : jokerIndex + 1 });
    };

    const setStatus = (text) => {
      const el = app.querySelector('#yaris-status');
      if (el) el.textContent = text;
    };

    const renderSide = (player, q) => {
      const side = player === 0 ? 'a' : 'b';
      return `
        <section class="yaris-side yaris-side-${side}" data-player="${player}">
          <header class="yaris-side-head">
            <span class="yaris-side-name">${escapeHtml(names[player])}</span>
          </header>
          <div class="yaris-options">
            ${q.options
              .map(
                (opt, i) => `
              <button class="yaris-opt" type="button" data-player="${player}" data-index="${i}">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </button>`,
              )
              .join('')}
          </div>
        </section>
      `;
    };

    const bindSide = (player, q) => {
      app.querySelectorAll(`.yaris-opt[data-player="${player}"]`).forEach((btn) => {
        btn.addEventListener('click', () => onAnswer(player, Number(btn.dataset.index), q, btn));
      });
    };

    const onAnswer = (player, selected, q, btn) => {
      if (questionLocked || eliminated[player]) return;
      const side = app.querySelector(`.yaris-side[data-player="${player}"]`);
      const ok = selected === q.correctIndex;

      if (ok) {
        questionLocked = true;
        playSfx('correct');
        side?.classList.add('is-won');
        btn.classList.add('is-correct');
        app.querySelectorAll('.yaris-opt').forEach((b) => {
          b.disabled = true;
        });
        app.querySelectorAll(`.yaris-opt[data-index="${q.correctIndex}"]`).forEach((b) => {
          b.classList.add('is-correct');
        });
        setStatus(`${names[player]} doğru — kazandı!`);
        advanceTimer = setTimeout(() => finish(player), 900);
        return;
      }

      eliminated[player] = true;
      playSfx('false');
      btn.classList.add('is-wrong');
      side?.classList.add('is-out');
      side?.querySelectorAll('.yaris-opt').forEach((b) => {
        b.disabled = true;
      });
      setStatus(`${names[player]} yanlış — rakip cevaplayabilir`);

      if (eliminated[0] && eliminated[1]) {
        questionLocked = true;
        app.querySelectorAll(`.yaris-opt[data-index="${q.correctIndex}"]`).forEach((b) => {
          b.classList.add('is-correct');
          b.disabled = true;
        });
        setStatus(`İkisi de yanlış — sonraki joker soru`);
        advanceTimer = setTimeout(() => {
          jokerIndex += 1;
          renderQuestion();
        }, 1200);
      }
    };

    function renderQuestion() {
      clearAdvance();
      const q = jokerQuestions[jokerIndex];
      if (!q) {
        finish(null);
        return;
      }

      eliminated = [false, false];
      questionLocked = false;

      const imageHtml = q.imageUrl
        ? `<div class="yaris-media"><img src="${q.imageUrl}" alt="" /></div>`
        : '';

      app.innerHTML = `
        <div class="yaris-play is-joker" id="yaris-play">
          <div class="yaris-joker-bar">Joker soru — beraberliği bozan kazanır</div>
          <div class="yaris-hud">
            <div class="yaris-hud-meta">
              ${hudExtra ? `<span class="yaris-hud-extra">${escapeHtml(hudExtra)}</span>` : ''}
              <span>Joker ${jokerIndex + 1}${jokerQuestions.length ? ` / ${jokerQuestions.length}` : ''}</span>
            </div>
            <div class="yaris-hud-scores">${renderHudScores(names, scores)}</div>
          </div>
          <div class="yaris-prompt-bar">
            ${imageHtml}
            <p class="yaris-prompt">${escapeHtml(q.prompt)}</p>
          </div>
          <div class="yaris-split">
            ${renderSide(0, q)}
            ${renderSide(1, q)}
          </div>
          <p class="yaris-status" id="yaris-status" aria-live="polite"></p>
        </div>
      `;

      bindSide(0, q);
      bindSide(1, q);
    }

    renderQuestion();
  });
}

/**
 * İki kişilik yarış maçı. Bittiğinde { winner, scores, reason, tie, jokerUsed } döner.
 * Beraberlikte jokerQuestions varsa tiebreak oynanır.
 */
export function runRaceMatch(
  app,
  { questions, names, timerSec = 0, hudExtra = '', jokerQuestions = [] },
) {
  return new Promise((resolve) => {
    let index = 0;
    let scores = [0, 0];
    let eliminated = [false, false];
    let questionLocked = false;
    let timerLeft = timerSec;
    /** @type {ReturnType<typeof setInterval> | null} */
    let timerId = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let advanceTimer = null;

    const clearTimers = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      if (advanceTimer) {
        clearTimeout(advanceTimer);
        advanceTimer = null;
      }
    };

    const finish = (reason) => {
      clearTimers();
      questionLocked = true;
      let winner = null;
      if (scores[0] > scores[1]) winner = 0;
      else if (scores[1] > scores[0]) winner = 1;
      const tie = winner === null;

      const done = (finalWinner, extra = {}) => {
        if (finalWinner !== null) playSfx('correct');
        resolve({
          winner: finalWinner,
          scores: [...scores],
          reason,
          tie: finalWinner === null,
          jokerUsed: false,
          ...extra,
        });
      };

      if (!tie || !jokerQuestions.length) {
        done(winner);
        return;
      }

      runJokerTiebreak(app, { jokerQuestions, names, scores, hudExtra }).then((joker) => {
        if (joker.winner !== null) {
          done(joker.winner, { jokerUsed: true, jokerCount: joker.usedCount });
          return;
        }
        done(null, { jokerUsed: true, jokerCount: joker.usedCount, reason: 'joker_exhausted' });
      });
    };

    const disableAll = () => {
      app.querySelectorAll('.yaris-opt').forEach((b) => {
        b.disabled = true;
      });
    };

    const enableAll = () => {
      app.querySelectorAll('.yaris-opt').forEach((b) => {
        b.disabled = false;
      });
    };

    const setStatus = (text) => {
      const el = app.querySelector('#yaris-status');
      if (el) el.textContent = text;
    };

    const renderSide = (player, q) => {
      const side = player === 0 ? 'a' : 'b';
      return `
        <section class="yaris-side yaris-side-${side}" data-player="${player}">
          <header class="yaris-side-head">
            <span class="yaris-side-name">${escapeHtml(names[player])}</span>
            <span class="yaris-side-pts yaris-score-badge" id="pts-${player}">${scores[player]}</span>
          </header>
          <div class="yaris-options">
            ${q.options
              .map(
                (opt, i) => `
              <button class="yaris-opt" type="button" data-player="${player}" data-index="${i}">
                <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
              </button>`,
              )
              .join('')}
          </div>
        </section>
      `;
    };

    const scheduleAdvance = () => {
      if (advanceTimer) clearTimeout(advanceTimer);
      advanceTimer = setTimeout(() => {
        advanceTimer = null;
        if (index + 1 >= questions.length) {
          finish('done');
          return;
        }
        index += 1;
        renderPlay();
      }, 1100);
    };

    const onAnswer = (player, selected, q, btn) => {
      if (questionLocked || eliminated[player]) return;
      const side = app.querySelector(`.yaris-side[data-player="${player}"]`);
      const ok = selected === q.correctIndex;

      if (ok) {
        questionLocked = true;
        scores[player] += 1;
        playSfx('correct');
        app.querySelector(`#pts-${player}`).textContent = String(scores[player]);
        const hudBadge = app.querySelector(`#hud-badge-${player}`);
        if (hudBadge) hudBadge.textContent = String(scores[player]);
        side?.classList.add('is-won');
        btn.classList.add('is-correct');
        disableAll();
        app.querySelectorAll(`.yaris-opt[data-index="${q.correctIndex}"]`).forEach((b) => {
          b.classList.add('is-correct');
        });
        setStatus(`${names[player]} doğru! +1`);
        scheduleAdvance();
        return;
      }

      eliminated[player] = true;
      playSfx('false');
      btn.classList.add('is-wrong');
      side?.classList.add('is-out');
      side?.querySelectorAll('.yaris-opt').forEach((b) => {
        b.disabled = true;
      });
      setStatus(`${names[player]} elendi — rakip devam edebilir`);

      if (eliminated[0] && eliminated[1]) {
        questionLocked = true;
        app.querySelectorAll(`.yaris-opt[data-index="${q.correctIndex}"]`).forEach((b) => {
          b.classList.add('is-correct');
          b.disabled = true;
        });
        setStatus(`İkisi de yanlış. Doğru: ${q.options[q.correctIndex] ?? '—'}`);
        scheduleAdvance();
      }
    };

    const bindSide = (player, q) => {
      app.querySelectorAll(`.yaris-opt[data-player="${player}"]`).forEach((btn) => {
        btn.addEventListener('click', () => onAnswer(player, Number(btn.dataset.index), q, btn));
      });
    };

    function renderPlay() {
      const q = questions[index];
      if (!q) {
        finish('done');
        return;
      }

      eliminated = [false, false];
      questionLocked = false;

      const imageHtml = q.imageUrl
        ? `<div class="yaris-media"><img src="${q.imageUrl}" alt="" /></div>`
        : '';

      app.innerHTML = `
        <div class="yaris-play" id="yaris-play">
          <div class="yaris-hud">
            <div class="yaris-hud-meta">
              ${hudExtra ? `<span class="yaris-hud-extra">${escapeHtml(hudExtra)}</span>` : ''}
              <span>Soru ${index + 1} / ${questions.length}</span>
              ${timerSec > 0 ? `<span class="yaris-timer" id="yaris-timer">${formatRaceTime(timerLeft)}</span>` : ''}
            </div>
            <div class="yaris-hud-scores">${renderHudScores(names, scores)}</div>
          </div>
          <div class="yaris-prompt-bar">
            ${imageHtml}
            <p class="yaris-prompt">${escapeHtml(q.prompt)}</p>
          </div>
          <div class="yaris-split">
            ${renderSide(0, q)}
            ${renderSide(1, q)}
          </div>
          <p class="yaris-status" id="yaris-status" aria-live="polite"></p>
        </div>
      `;

      bindSide(0, q);
      bindSide(1, q);
    }

    async function start() {
      clearTimers();
      index = 0;
      scores = [0, 0];
      timerLeft = timerSec;
      questionLocked = true;
      eliminated = [false, false];

      renderPlay();
      disableAll();
      await runStartCountdown(app, names);
      questionLocked = false;
      enableAll();

      if (timerSec > 0) {
        timerId = setInterval(() => {
          timerLeft -= 1;
          const el = app.querySelector('#yaris-timer');
          if (el) el.textContent = formatRaceTime(timerLeft);
          if (timerLeft <= 0) {
            clearTimers();
            finish('time');
          }
        }, 1000);
      }
    }

    start();
  });
}

/** Öğrencileri karıştırıp rastgele eşleştirir; tek kalan bay geçer. */
export function pairRandom(players) {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      matches.push({ a: shuffled[i], b: shuffled[i + 1], bye: false, winner: null });
    } else {
      matches.push({ a: shuffled[i], b: null, bye: true, winner: shuffled[i] });
    }
  }
  return matches;
}

export function defaultPlayerName(no) {
  return `Öğrenci ${no}`;
}

/** Maç sonucu skor panosu — isim ve puan ayrı kutularda. */
export function renderMatchScoreboard(names, scores, { winner = null, extra = '' } = {}) {
  const card = (idx, side) => {
    const won = winner === idx;
    const lost = winner !== null && winner !== idx;
    return `
      <div class="yaris-result-card yaris-side-${side} ${won ? 'is-match-winner' : ''} ${lost ? 'is-match-loser' : ''}">
        <span class="yaris-result-name">${escapeHtml(names[idx])}</span>
        <div class="yaris-score-box" aria-label="${scores[idx]} doğru cevap">${scores[idx]}</div>
        <span class="yaris-result-score-label">doğru cevap</span>
      </div>`;
  };

  return `
    <div class="yaris-result-scores">
      ${card(0, 'a')}
      ${card(1, 'b')}
    </div>
    ${extra ? `<p class="yaris-result-extra">${escapeHtml(extra)}</p>` : ''}`;
}

function renderHudScores(names, scores) {
  return `
    <span class="yaris-score yaris-score-a">
      <strong class="yaris-score-name">${escapeHtml(names[0])}</strong>
      <span class="yaris-score-badge" id="hud-badge-0">${scores[0]}</span>
    </span>
    <span class="yaris-vs">VS</span>
    <span class="yaris-score yaris-score-b">
      <strong class="yaris-score-name">${escapeHtml(names[1])}</strong>
      <span class="yaris-score-badge" id="hud-badge-1">${scores[1]}</span>
    </span>`;
}
