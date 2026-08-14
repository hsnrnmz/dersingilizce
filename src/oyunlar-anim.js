import { shuffle, playSfx, escapeHtml } from './content.js';

const BALLOON_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];
const BASKET_COLORS = ['#ef4444', '#3b82f6', '#10b981'];

function uniqWords(list) {
  const seen = new Set();
  const out = [];
  for (const w of list) {
    const key = `${w.en.toLowerCase()}|${w.tr.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function resultCard(playerEl, { scoreText, detail, onAgain, onComplete, extraActionsHtml = '' }) {
  onComplete?.();
  playerEl.innerHTML = `
    <div class="q-card result-card">
      <p class="result-score">${escapeHtml(scoreText)}</p>
      ${detail ? `<p class="result-ratio">${escapeHtml(detail)}</p>` : ''}
      <div class="result-actions">
        <button class="primary-btn" type="button" id="again-btn">Tekrar oyna</button>
        ${extraActionsHtml || ''}
      </div>
    </div>`;
  document.getElementById('again-btn').addEventListener('click', onAgain);
}

/**
 * Flutter Uçan Balon: TR hedef üstte, EN balonlar 3 şeritte yukarı kayar.
 */
export function startUcanBalon({ playerEl, leadEl, words, onRestart, onComplete, extraActionsHtml }) {
  const all = uniqWords(words);
  if (all.length < 5) {
    playerEl.hidden = false;
    playerEl.innerHTML = `<div class="status-box">Bu oyun için en az 5 kelime gerekli.</div>`;
    return () => {};
  }

  const BALLOON_COUNT = 5;
  const QUESTION_COUNT = Math.min(10, all.length);
  const SPEED = 0.13;
  const SPAWN_GAP = 1.4;
  const LANE_X = [0.5, 0.24, 0.76, 0.5, 0.24];
  const targets = shuffle(all).slice(0, QUESTION_COUNT);

  let index = 0;
  let score = 0;
  let correct = 0;
  let locked = false;
  let raf = 0;
  let lastTs = 0;
  let spawnTimer = 0;
  let spawned = 0;
  let feedbackId = null;
  let feedbackKind = null;
  let balloons = [];

  const prepareQuestion = () => {
    const hedef = targets[index];
    const wrong = shuffle(all.filter((w) => w.en.toLowerCase() !== hedef.en.toLowerCase()))
      .map((w) => w.en)
      .slice(0, BALLOON_COUNT - 1);
    while (wrong.length < BALLOON_COUNT - 1) wrong.push(hedef.en);
    const labels = shuffle([...wrong, hedef.en]);
    balloons = labels.map((en, i) => ({
      id: i,
      en,
      correct: en === hedef.en,
      x: LANE_X[i],
      y: -0.22,
      visible: false,
      color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    }));
    spawned = 0;
    spawnTimer = 0;
    spawnNext();
  };

  const spawnNext = () => {
    if (spawned >= BALLOON_COUNT) return;
    balloons[spawned].visible = true;
    balloons[spawned].y = -0.22;
    spawned += 1;
    spawnTimer = SPAWN_GAP;
  };

  const laneClear = (laneX, exceptId) => {
    for (const b of balloons) {
      if (b.id === exceptId || !b.visible) continue;
      if (Math.abs(b.x - laneX) > 0.01) continue;
      if (b.y < 0.38) return false;
    }
    return true;
  };

  const paint = (full = true) => {
    const hedef = targets[index];
    leadEl.textContent = `Soru ${index + 1} / ${QUESTION_COUNT} · Puan ${score}`;

    if (!full) {
      const arena = playerEl.querySelector('#arena');
      if (!arena) return;
      balloons.forEach((b) => {
        let el = arena.querySelector(`[data-id="${b.id}"]`);
        if (!b.visible) {
          el?.remove();
          return;
        }
        if (!el) {
          el = document.createElement('button');
          el.type = 'button';
          el.className = 'fly-balloon';
          el.dataset.id = String(b.id);
          el.style.setProperty('--ball', b.color);
          el.innerHTML = `
            <span class="fly-balloon-body"></span>
            <span class="fly-balloon-text">${escapeHtml(b.en)}</span>
            <span class="fly-balloon-string"></span>`;
          el.addEventListener('click', () => onTap(b.id));
          arena.appendChild(el);
        }
        el.style.left = `${b.x * 100}%`;
        // Flutter: top = height * (1 - y) → y artınca balon yukarı çıkar
        el.style.top = `${(1 - b.y) * 100}%`;
        el.classList.toggle('is-ok', feedbackId === b.id && feedbackKind === 'ok');
        el.classList.toggle('is-bad', feedbackId === b.id && feedbackKind === 'bad');
      });
      return;
    }

    playerEl.innerHTML = `
      <div class="game-stage">
        <div class="game-hud">
          <div class="game-target">
            <span>Bu kelimenin İngilizcesini bul</span>
            <strong>${escapeHtml(hedef.tr)}</strong>
          </div>
          <div class="game-meta">Puan ${score}</div>
        </div>
        <div class="balloon-arena" id="arena"></div>
      </div>`;
    paint(false);
  };

  const onTap = async (id) => {
    if (locked) return;
    const balon = balloons.find((b) => b.id === id);
    if (!balon || !balon.visible) return;

    if (balon.correct) {
      locked = true;
      feedbackId = id;
      feedbackKind = 'ok';
      correct += 1;
      score += 10;
      playSfx('correct');
      paint(false);
      await wait(650);
      index += 1;
      feedbackId = null;
      feedbackKind = null;
      if (index >= QUESTION_COUNT) {
        cancelAnimationFrame(raf);
        playSfx('win');
        resultCard(playerEl, {
          scoreText: `${correct} / ${QUESTION_COUNT}`,
          detail: `Puan: ${score}`,
          onAgain: onRestart,
          onComplete,
          extraActionsHtml,
        });
        return;
      }
      prepareQuestion();
      locked = false;
      lastTs = 0;
      paint(true);
      return;
    }

    feedbackId = id;
    feedbackKind = 'bad';
    score = Math.max(0, score - 2);
    playSfx('false');
    paint(false);
    await wait(500);
    feedbackId = null;
    feedbackKind = null;
    paint(false);
  };

  const tick = (ts) => {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (!locked) {
      if (spawned < BALLOON_COUNT) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) spawnNext();
      }
      for (const b of balloons) {
        if (!b.visible) continue;
        b.y += SPEED * dt;
        if (b.y > 1.08) {
          b.y = laneClear(b.x, b.id) ? -0.22 : 1.05;
        }
      }
      paint(false);
    }
    raf = requestAnimationFrame(tick);
  };

  prepareQuestion();
  playerEl.hidden = false;
  paint(true);
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}

/**
 * Flutter Hızlı Dokun: TR hedef, 4 EN balon seçenek, 5 sn süre, combo.
 */
export function startHizliDokun({ playerEl, leadEl, words, onRestart, onComplete, extraActionsHtml }) {
  const all = uniqWords(words);
  if (all.length < 4) {
    playerEl.hidden = false;
    playerEl.innerHTML = `<div class="status-box">Bu oyun için en az 4 kelime gerekli.</div>`;
    return () => {};
  }

  const TOTAL = Math.min(10, all.length);
  const questions = shuffle(all).slice(0, TOTAL);
  let index = 0;
  let score = 0;
  let combo = 0;
  let left = 5;
  let locked = false;
  let timer = null;
  let options = [];
  let target = null;

  const prepare = () => {
    target = questions[index];
    const wrong = shuffle(all.filter((w) => w.en !== target.en))
      .slice(0, 3)
      .map((w) => w.en);
    options = shuffle([target.en, ...wrong]);
    left = 5;
    locked = false;
  };

  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  const paint = () => {
    leadEl.textContent = `Soru ${index + 1}/${TOTAL} · Combo ${combo}`;
    playerEl.innerHTML = `
      <div class="game-stage">
        <div class="game-hud">
          <div class="timer-ring ${left <= 2 ? 'is-urgent' : ''}">${left}</div>
          <div class="game-target">
            <span>Türkçesi</span>
            <strong>${escapeHtml(target.tr)}</strong>
          </div>
          <div class="game-meta">Puan ${score}</div>
        </div>
        <div class="hizli-grid">
          ${options
            .map(
              (en, i) => `
            <button class="hizli-balloon" type="button" data-en="${escapeHtml(en)}" style="--ball:${BALLOON_COLORS[i]}">
              <span class="fly-balloon-body"></span>
              <span class="fly-balloon-text">${escapeHtml(en)}</span>
            </button>`,
            )
            .join('')}
        </div>
      </div>`;

    playerEl.querySelectorAll('.hizli-balloon').forEach((btn) => {
      btn.addEventListener('click', () => choose(btn.dataset.en));
    });
  };

  const finish = () => {
    stopTimer();
    playSfx('win');
    resultCard(playerEl, {
      scoreText: `${score} puan`,
      detail: `${TOTAL} soru tamamlandı`,
      onAgain: onRestart,
      onComplete,
      extraActionsHtml,
    });
  };

  const choose = async (en) => {
    if (locked) return;
    locked = true;
    stopTimer();
    const ok = en === target.en;
    if (ok) {
      combo += 1;
      score += 10 + Math.max(0, combo - 1) * 2;
      playSfx('correct');
    } else {
      combo = 0;
      score = Math.max(0, score - 2);
      playSfx('false');
    }
    await wait(350);
    index += 1;
    if (index >= TOTAL) {
      finish();
      return;
    }
    prepare();
    paint();
    startTimer();
  };

  const startTimer = () => {
    stopTimer();
    timer = setInterval(() => {
      left -= 1;
      paint();
      if (left <= 0) choose(null);
    }, 1000);
  };

  prepare();
  playerEl.hidden = false;
  paint();
  startTimer();

  return () => stopTimer();
}

/**
 * Flutter Düşen Kelimeler: EN kelime düşer, alttaki TR sepetlerden doğru olanı seç.
 */
export function startDusenKelimeler({ playerEl, leadEl, words, onRestart, onComplete, extraActionsHtml }) {
  const all = uniqWords(words);
  if (all.length < 4) {
    playerEl.hidden = false;
    playerEl.innerHTML = `<div class="status-box">Bu oyun için en az 4 kelime gerekli.</div>`;
    return () => {};
  }

  const TOTAL = Math.min(10, all.length);
  const questions = shuffle(all).slice(0, TOTAL);
  let index = 0;
  let score = 0;
  let lives = 3;
  let y = 0;
  let speed = 0.17;
  let locked = false;
  let raf = 0;
  let lastTs = 0;
  let options = [];

  const prepare = () => {
    const hedef = questions[index];
    const wrong = shuffle(all.filter((w) => w.tr.toLowerCase() !== hedef.tr.toLowerCase()))
      .slice(0, 2)
      .map((w) => w.tr);
    options = shuffle([hedef.tr, ...wrong]);
    y = 0;
    locked = false;
    lastTs = 0;
  };

  const paint = () => {
    const hedef = questions[index];
    leadEl.textContent = `Can ${'❤'.repeat(lives)}${'♡'.repeat(3 - lives)} · ${index + 1}/${TOTAL}`;
    playerEl.innerHTML = `
      <div class="game-stage">
        <div class="game-hud">
          <div class="game-meta">Puan ${score}</div>
          <div class="game-meta">Doğru sepete dokun</div>
        </div>
        <div class="fall-arena" id="fall-arena">
          <div class="fall-word" style="top:${y * 100}%">${escapeHtml(hedef.en)}</div>
        </div>
        <div class="basket-row fall-baskets">
          ${options
            .map(
              (tr, i) => `
            <button class="basket-btn fall-basket" type="button" data-tr="${escapeHtml(tr)}" style="--ball:${BASKET_COLORS[i]}">
              ${escapeHtml(tr)}
            </button>`,
            )
            .join('')}
        </div>
      </div>`;

    playerEl.querySelectorAll('.fall-basket').forEach((btn) => {
      btn.addEventListener('click', () => pick(btn.dataset.tr));
    });
  };

  const endGame = () => {
    cancelAnimationFrame(raf);
    playSfx('win');
    resultCard(playerEl, {
      scoreText: `${score} puan`,
      detail: lives > 0 ? 'Tur tamamlandı' : 'Canlar bitti',
      onAgain: onRestart,
      onComplete: lives > 0 ? onComplete : undefined,
      extraActionsHtml,
    });
  };

  const next = () => {
    if (lives <= 0 || index >= TOTAL - 1) {
      if (lives > 0 && index >= TOTAL - 1) index = TOTAL;
      endGame();
      return;
    }
    index += 1;
    speed += 0.02;
    prepare();
    paint();
    raf = requestAnimationFrame(tick);
  };

  const miss = async () => {
    if (locked) return;
    locked = true;
    lives -= 1;
    score = Math.max(0, score - 2);
    playSfx('false');
    await wait(280);
    if (lives <= 0) {
      endGame();
      return;
    }
    next();
  };

  const pick = async (tr) => {
    if (locked) return;
    locked = true;
    cancelAnimationFrame(raf);
    const ok = tr.toLowerCase() === questions[index].tr.toLowerCase();
    if (ok) {
      const bonus = Math.round((1 - y) * 10);
      score += 10 + bonus;
      playSfx('correct');
    } else {
      lives -= 1;
      score = Math.max(0, score - 2);
      playSfx('false');
    }
    await wait(250);
    if (lives <= 0) {
      endGame();
      return;
    }
    if (index >= TOTAL - 1) {
      endGame();
      return;
    }
    next();
  };

  const tick = (ts) => {
    if (locked) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    y += speed * dt;
    if (y >= 0.78) {
      miss();
      return;
    }
    const word = playerEl.querySelector('.fall-word');
    if (word) word.style.top = `${y * 100}%`;
    else paint();
    raf = requestAnimationFrame(tick);
  };

  prepare();
  playerEl.hidden = false;
  paint();
  raf = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(raf);
}

/**
 * Pro Kelime Eşleştirme — EN / TR sütunları, seçim, shake, kaybolma.
 */
export function startEslestirme({ playerEl, leadEl, words, onRestart, onComplete, extraActionsHtml }) {
  const all = uniqWords(words);
  if (all.length < 2) {
    playerEl.hidden = false;
    playerEl.innerHTML = `<div class="status-box">Eşleştirme için yeterli kelime yok.</div>`;
    return () => {};
  }

  const pairCount = Math.min(6, all.length);
  let round = 0;
  let totalScore = 0;

  const startRound = () => {
    round += 1;
    const picked = shuffle(all)
      .slice(0, pairCount)
      .map((w, id) => ({ ...w, id }));
    const left = [...picked];
    const right = shuffle([...picked]);
    const matched = new Set();
    const exiting = new Set();
    let selectedLeft = null;
    let wrongLeft = null;
    let wrongRight = null;
    let score = 0;
    let lock = false;

    const paint = () => {
      const done = matched.size === pairCount;
      leadEl.textContent = `Tur ${round} · Eşleşen ${matched.size}/${pairCount}`;
      playerEl.innerHTML = `
        <div class="game-stage match-stage">
          <div class="game-hud">
            <div class="game-meta">Tur puanı ${score}</div>
            <div class="match-progress">
              <div class="match-progress-bar" style="width:${(matched.size / pairCount) * 100}%"></div>
            </div>
            <div class="game-meta">Toplam ${totalScore + score}</div>
          </div>
          <div class="match-arena">
            <div class="match-col">
              <div class="match-col-label">İngilizce</div>
              ${left
                .map((w) => {
                  if (matched.has(w.id) && !exiting.has(w.id)) return '';
                  const cls = [
                    'match-pro-btn',
                    'en',
                    selectedLeft === w.id ? 'is-selected' : '',
                    wrongLeft === w.id ? 'is-wrong' : '',
                    exiting.has(w.id) ? 'is-exit' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return `<button class="${cls}" type="button" data-left="${w.id}">${escapeHtml(w.en)}</button>`;
                })
                .join('')}
            </div>
            <div class="match-vs">⟷</div>
            <div class="match-col">
              <div class="match-col-label">Türkçe</div>
              ${right
                .map((w) => {
                  if (matched.has(w.id) && !exiting.has(w.id)) return '';
                  const cls = [
                    'match-pro-btn',
                    'tr',
                    wrongRight === w.id ? 'is-wrong' : '',
                    exiting.has(w.id) ? 'is-exit' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return `<button class="${cls}" type="button" data-right="${w.id}">${escapeHtml(w.tr)}</button>`;
                })
                .join('')}
            </div>
          </div>
          ${
            done
              ? `<div class="card-actions match-done">
                  <p class="feedback is-ok">Harika! Tur tamamlandı.</p>
                  <button class="primary-btn" type="button" id="again-btn">Yeni tur</button>
                  ${extraActionsHtml || ''}
                </div>`
              : ''
          }
        </div>`;

      playerEl.querySelectorAll('[data-left]').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (lock || exiting.has(Number(btn.dataset.left))) return;
          selectedLeft = Number(btn.dataset.left);
          wrongLeft = null;
          wrongRight = null;
          paint();
        });
      });

      playerEl.querySelectorAll('[data-right]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (lock || selectedLeft == null) return;
          const rightId = Number(btn.dataset.right);
          if (exiting.has(rightId)) return;
          lock = true;

          if (rightId === selectedLeft) {
            matched.add(rightId);
            exiting.add(rightId);
            score += 15;
            playSfx('correct');
            paint();
            await wait(420);
            exiting.delete(rightId);
            selectedLeft = null;
            lock = false;
            if (matched.size === pairCount) {
              totalScore += score;
              playSfx('win');
              onComplete?.();
            }
            paint();
            return;
          }

          wrongLeft = selectedLeft;
          wrongRight = rightId;
          score = Math.max(0, score - 3);
          playSfx('false');
          paint();
          await wait(480);
          wrongLeft = null;
          wrongRight = null;
          selectedLeft = null;
          lock = false;
          paint();
        });
      });

      document.getElementById('again-btn')?.addEventListener('click', () => {
        totalScore += 0;
        startRound();
      });
    };

    paint();
  };

  playerEl.hidden = false;
  startRound();
  return () => {};
}

/**
 * Pro Doğru / Yanlış — VS düello kartları, can, arcade butonlar.
 */
export function startDogruYanlis({ playerEl, leadEl, words, onRestart, onComplete, extraActionsHtml }) {
  const all = uniqWords(words);
  if (all.length < 2) {
    playerEl.hidden = false;
    playerEl.innerHTML = `<div class="status-box">Yeterli kelime yok.</div>`;
    return () => {};
  }

  const TOTAL = 10;
  let tur = 0;
  let score = 0;
  let correct = 0;
  let lives = 3;
  let locked = false;
  let aktif = null;
  let flash = null; // 'ok' | 'bad' | null

  const makeRound = () => {
    const kart = all[Math.floor(Math.random() * all.length)];
    const dogruEslesme = Math.random() > 0.45;
    if (dogruEslesme) {
      aktif = { en: kart.en, tr: kart.tr, dogruEslesme: true };
      return;
    }
    const yanlis =
      shuffle(all.filter((w) => w.tr.toLowerCase() !== kart.tr.toLowerCase()))[0] || kart;
    aktif = { en: kart.en, tr: yanlis.tr, dogruEslesme: false };
  };

  const paint = () => {
    leadEl.textContent = `Tur ${tur + 1}/${TOTAL}`;
    playerEl.innerHTML = `
      <div class="game-stage duel-stage ${flash ? `is-${flash}` : ''}">
        <div class="game-hud">
          <div class="lives">${'❤'.repeat(lives)}${'♡'.repeat(3 - lives)}</div>
          <div class="game-meta">Puan ${score}</div>
          <div class="game-meta">Doğru ${correct}</div>
        </div>
        <div class="duel-board">
          <div class="duel-vs">VS</div>
          <div class="duel-cards">
            <div class="duel-card en">
              <span>İngilizce</span>
              <strong>${escapeHtml(aktif.en)}</strong>
            </div>
            <div class="duel-bolt">⚡</div>
            <div class="duel-card tr">
              <span>Türkçe</span>
              <strong>${escapeHtml(aktif.tr)}</strong>
            </div>
          </div>
          <p class="duel-ask">Bu eşleşme doğru mu?</p>
        </div>
        <div class="duel-actions">
          <button class="arcade-btn wrong" type="button" id="no-btn" ${locked ? 'disabled' : ''}>
            <span class="arcade-x">✕</span>
            Yanlış
          </button>
          <button class="arcade-btn right" type="button" id="yes-btn" ${locked ? 'disabled' : ''}>
            <span class="arcade-check">✓</span>
            Doğru
          </button>
        </div>
      </div>`;

    document.getElementById('yes-btn').addEventListener('click', () => answer(true));
    document.getElementById('no-btn').addEventListener('click', () => answer(false));
  };

  const finish = () => {
    playSfx('win');
    resultCard(playerEl, {
      scoreText: `${correct} / ${TOTAL}`,
      detail: `Puan: ${score}`,
      onAgain: onRestart,
      onComplete: lives > 0 ? onComplete : undefined,
      extraActionsHtml,
    });
  };

  const answer = async (userSaysTrue) => {
    if (locked || !aktif) return;
    locked = true;
    const ok = userSaysTrue === aktif.dogruEslesme;
    flash = ok ? 'ok' : 'bad';
    if (ok) {
      correct += 1;
      score += 10;
      playSfx('correct');
    } else {
      lives -= 1;
      score = Math.max(0, score - 2);
      playSfx('false');
    }
    paint();
    await wait(450);
    flash = null;

    if (lives <= 0 || tur >= TOTAL - 1) {
      finish();
      return;
    }
    tur += 1;
    makeRound();
    locked = false;
    paint();
  };

  makeRound();
  playerEl.hidden = false;
  paint();
  return () => {};
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
