import { isSoundEnabled } from './settings.js';

const AVAILABLE = new Set([2, 3, 4, 5, 6, 7, 8]);

export const MODULES = [
  { id: 'kartlar', title: 'Kelime Kartları', subtitle: 'Kartlarla öğren', accent: '#38bdf8' },
  { id: 'kelime', title: 'Kelime Testleri', subtitle: 'Çoktan seçmeli test', accent: '#10b981' },
  { id: 'dinleme', title: 'Dinleme', subtitle: 'Metin ve sorular', accent: '#0ea5e9' },
  { id: 'kelime-yaz', title: 'Kelime Yaz', subtitle: 'Harflerden kelime kur', accent: '#f59e0b' },
  { id: 'cumle', title: 'Cümle Oluştur', subtitle: 'Kelimelerden cümle kur', accent: '#f97316' },
  { id: 'quiz', title: 'Quiz', subtitle: 'Görselli sorular', accent: '#8b5cf6' },
  { id: 'oyunlar', title: 'Oyunlar', subtitle: 'Eşleştirme ve daha fazlası', accent: '#ec4899' },
  { id: 'wordwall', title: 'Wordwall', subtitle: 'Ünite oyunları', accent: '#a855f7' },
  { id: 'bilgi', title: 'Bilgi Kartları', subtitle: 'Soru-cevap kartları', accent: '#14b8a6' },
];

export const GAMES = [
  { id: 'eslestirme', title: 'Kelime Eşleştirme', subtitle: 'EN–TR eşleştir' },
  { id: 'ucan-balon', title: 'Uçan Balon', subtitle: 'Doğru balona dokun' },
  { id: 'hafiza', title: 'Hafıza Kartı', subtitle: 'Çiftleri bul' },
  { id: 'dogru-yanlis', title: 'Doğru mu Yanlış mı?', subtitle: 'Eşleşmeyi yakala' },
  { id: 'hizli-dokun', title: 'Hızlı Dokun', subtitle: 'Hedefi bul, puan topla' },
  { id: 'dusen', title: 'Düşen Kelimeler', subtitle: 'Doğru sepete yakala' },
];

export function isGradeReady(grade) {
  return AVAILABLE.has(Number(grade));
}

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function loadJson(grade, name) {
  const res = await fetch(`/data/${grade}/${name}.json`);
  if (!res.ok) throw new Error(`${name} yüklenemedi`);
  return res.json();
}

export function unitNamesFrom(uniteler) {
  const entries = Object.entries(uniteler || {}).map(([key, name]) => {
    const match = String(key).match(/(\d+)/);
    const no = match ? Number(match[1]) : 0;
    return { no, name: String(name) };
  });
  entries.sort((a, b) => a.no - b.no);
  return entries.filter((e) => e.no > 0);
}

export function listTestIds(bucket, uniteNo) {
  const node = bucket?.[`unite-${uniteNo}`];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  return Object.keys(node)
    .filter((k) => k.startsWith('test-'))
    .sort((a, b) => testNumber(a) - testNumber(b));
}

export function testNumber(id) {
  const m = String(id).match(/test-(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function getRawQuestions(bucket, uniteNo, testId) {
  const node = bucket?.[`unite-${uniteNo}`]?.[testId];
  if (!node) return [];
  if (Array.isArray(node)) return node;
  if (typeof node === 'object') {
    return Object.keys(node)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => node[k])
      .filter(Boolean);
  }
  return [];
}

/** Ünitedeki tüm testlerden soruları birleştirir (öğrenme yolculuğu için). */
export function getAllUnitQuestions(bucket, uniteNo) {
  const node = bucket?.[`unite-${uniteNo}`];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const testIds = Object.keys(node)
    .filter((k) => k.startsWith('test-'))
    .sort((a, b) => Number(String(a).replace(/\D/g, '')) - Number(String(b).replace(/\D/g, '')));
  const out = [];
  for (const testId of testIds) {
    out.push(...getRawQuestions(bucket, uniteNo, testId));
  }
  return out;
}

export function getUnitWords(kelimeler, uniteNo) {
  const node = kelimeler?.[`unite-${uniteNo}`];
  if (!node) return [];
  const list = Array.isArray(node) ? node : Object.values(node);
  return list
    .map((item) => ({
      en: String(item?.en ?? '').trim(),
      tr: String(item?.tr ?? '').trim(),
    }))
    .filter((w) => w.en && w.tr);
}

/**
 * Flutter `FirebaseQuestionService.uniteKelimeleriGetir` ile aynı:
 * ünite testlerindeki soru metni (EN) + doğru şık (TR), benzersiz.
 */
export function getUnitWordsFromTests(testler, uniteNo) {
  const node = testler?.[`unite-${uniteNo}`];
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];

  const testIds = Object.keys(node)
    .filter((k) => k.startsWith('test-'))
    .sort((a, b) => testNumber(a) - testNumber(b));

  const kartlar = [];
  const seenEn = new Set();

  for (const testId of testIds) {
    const questions = getRawQuestions(testler, uniteNo, testId);
    for (const s of questions) {
      const en = String(s?.soru ?? '')
        .replace(/#+\s*/g, '')
        .replace(/\*\*/g, '')
        .trim();
      if (!en) continue;
      const options = Array.isArray(s?.secenekler) ? s.secenekler : [];
      if (!options.length) continue;
      const di = Number(s?.dogruIndex ?? 0);
      const tr = String(options[Math.max(0, Math.min(di, options.length - 1))] ?? '').trim();
      if (!tr) continue;
      const key = en.toLowerCase();
      if (seenEn.has(key)) continue;
      seenEn.add(key);
      kartlar.push({ en, tr });
    }
  }

  return kartlar;
}

export function getUnitSentences(cumleler, uniteNo) {
  const node = cumleler?.[`unite-${uniteNo}`];
  if (!node) return [];
  const list = Array.isArray(node) ? node : Object.values(node);
  return list
    .map((item) => ({
      en: String(item?.en ?? '').trim(),
      tr: String(item?.tr ?? '').trim(),
    }))
    .filter((c) => c.en && c.tr);
}

export function getListeningContents(dinleme, uniteNo) {
  const icerikler = dinleme?.[`unite-${uniteNo}`]?.icerikler;
  if (!icerikler) return [];
  const entries = Array.isArray(icerikler)
    ? icerikler.map((v, i) => [String(i + 1), v])
    : Object.entries(icerikler);

  return entries
    .map(([key, value]) => {
      if (value == null) return null;
      if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return null;
        if (/youtu(\.be|be\.com)/i.test(raw)) {
          return { key, baslik: 'Dersi İzle', youtubeId: youtubeIdFromUrl(raw), metin: '', sorular: [] };
        }
        return { key, baslik: 'Metin', youtubeId: '', metin: raw, sorular: [] };
      }
      if (typeof value === 'object') {
        const baslik = String(value.baslik ?? key).trim() || key;
        const metin = String(value.metin ?? '').trim();
        const youtubeId = String(value.youtubeId ?? '').trim() || youtubeIdFromUrl(String(value.url ?? ''));
        const sorular = Array.isArray(value.sorular)
          ? value.sorular
          : value.sorular && typeof value.sorular === 'object'
            ? Object.keys(value.sorular)
                .sort((a, b) => Number(a) - Number(b))
                .map((k) => value.sorular[k])
                .filter(Boolean)
            : [];
        if (!metin && !youtubeId) return null;
        return { key, baslik, youtubeId, metin, sorular };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const na = Number(String(a.key).match(/\d+/)?.[0] || 0);
      const nb = Number(String(b.key).match(/\d+/)?.[0] || 0);
      return na - nb || String(a.key).localeCompare(String(b.key));
    });
}

export function getWordwallLinks(oyunlar, uniteNo) {
  const node = oyunlar?.[`unite-${uniteNo}`];
  if (!node) return [];
  const list = Array.isArray(node) ? node : Object.values(node);
  return list
    .map((item, i) => {
      if (typeof item === 'string') {
        const link = item.trim();
        return link ? { link, baslik: `Oyun ${i + 1}` } : null;
      }
      if (item && typeof item === 'object') {
        const link = String(item.link ?? item.url ?? '').trim();
        if (!link) return null;
        return {
          link,
          baslik: String(item.baslik ?? item.title ?? item.ad ?? `Oyun ${i + 1}`).trim(),
        };
      }
      return null;
    })
    .filter(Boolean);
}

export async function loadBilgiCards(grade, uniteNo) {
  const res = await fetch(`/bilgi/${grade}/unite-${uniteNo}.csv`);
  if (!res.ok) return [];
  const text = await res.text();
  return parseCsvPairs(text);
}

function parseCsvPairs(text) {
  const rows = [];
  let i = 0;
  let field = '';
  let row = [];
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.trim())) rows.push(row);
  }

  return rows
    .map((r) => ({
      soru: String(r[0] ?? '').trim(),
      cevap: String(r[1] ?? '').trim(),
    }))
    .filter((r) => r.soru && r.cevap);
}

function youtubeIdFromUrl(url) {
  const m =
    String(url).match(/[?&]v=([^&]+)/) ||
    String(url).match(/youtu\.be\/([^?&]+)/) ||
    String(url).match(/embed\/([^?&]+)/);
  return m ? m[1] : '';
}

export function normalizeQuestion(raw, { grade, uniteNo, type }) {
  const optionsRaw = raw.secenekler ?? raw.options ?? [];
  let options = Array.isArray(optionsRaw)
    ? optionsRaw.map((o) => String(o ?? '').trim()).filter(Boolean)
    : [];

  const tip = String(raw.soruTipi ?? raw.type ?? '').toLowerCase();
  let kind = 'multiple_choice';
  if (['true_false', 'true/false', 'dogru_yanlis'].includes(tip)) kind = 'true_false';
  else if (['fill_blank', 'fill in the blank', 'blank', 'bosluk_doldurma'].includes(tip)) {
    kind = 'fill_blank';
  } else if (
    options.length === 2 &&
    options.every((s) => s === 'True' || s === 'False')
  ) {
    kind = 'true_false';
  }

  if (kind === 'true_false' && options.length === 0) options = ['True', 'False'];
  if (kind === 'fill_blank') options = [];

  let correctIndex = 0;
  let acceptedAnswers = [];

  if (kind === 'fill_blank') {
    const correct = raw.dogruCevapMetni ?? raw.correctAnswer ?? raw.cevap ?? '';
    acceptedAnswers = [String(correct)].filter(Boolean);
    if (Array.isArray(raw.kabulEdilenCevaplar)) {
      acceptedAnswers.push(...raw.kabulEdilenCevaplar.map(String));
    }
  } else if (typeof raw.dogruIndex === 'number') {
    correctIndex = raw.dogruIndex;
  } else if (typeof raw.correctAnswer === 'number') {
    correctIndex = raw.correctAnswer;
  } else if (typeof raw.correctAnswer === 'boolean') {
    correctIndex = raw.correctAnswer ? 0 : 1;
  } else if (raw.correctAnswer != null || raw.cevap != null) {
    const cevap = String(raw.correctAnswer ?? raw.cevap).trim().toLowerCase();
    if (cevap === 'true' || cevap === 'doğru' || cevap === 'dogru') correctIndex = 0;
    else if (cevap === 'false' || cevap === 'yanlış' || cevap === 'yanlis') correctIndex = 1;
    else {
      const idx = options.findIndex((s) => s.trim().toLowerCase() === cevap);
      correctIndex = idx >= 0 ? idx : 0;
    }
  }

  if (options.length > 0) {
    correctIndex = Math.max(0, Math.min(correctIndex, options.length - 1));
  }

  const image = raw.image ? String(raw.image) : null;

  return {
    id: String(raw.id ?? ''),
    prompt: String(raw.soru ?? raw.question ?? ''),
    options,
    correctIndex,
    kind,
    acceptedAnswers,
    image,
    imageUrl: image ? `/quiz/${grade}/unite-${uniteNo}/${image}` : null,
    type,
  };
}

export function isBlankCorrect(question, input) {
  const g = String(input ?? '')
    .trim()
    .toLowerCase();
  if (!g) return false;
  return question.acceptedAnswers.some((a) => String(a).trim().toLowerCase() === g);
}

export function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Çoktan seçmeli sorunun şıklarını karıştırır (doğru index güncellenir). */
export function shuffleQuestionOptions(question) {
  if (!question || question.kind === 'fill_blank' || !Array.isArray(question.options) || question.options.length < 2) {
    return question;
  }
  const paired = question.options.map((opt, i) => ({ opt, i }));
  const shuffled = shuffle(paired);
  return {
    ...question,
    options: shuffled.map((p) => p.opt),
    correctIndex: shuffled.findIndex((p) => p.i === question.correctIndex),
  };
}


/** Soru listesini ve her sorunun şıklarını karıştırır. */
export function shuffleQuestions(list) {
  return shuffle(list.map(shuffleQuestionOptions));
}

export function playSfx(name) {
  try {
    if (!isSoundEnabled()) return;
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.45;
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

let activeUtterance = null;
/** @type {ReturnType<typeof setTimeout>[]} */
let highlightTimers = [];

function pickEnglishVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|_)/i.test(v.lang) || /english/i.test(v.name));
  const pool = en.length ? en : voices;
  const local =
    pool.find((v) => !/google/i.test(v.name) && /en-US/i.test(v.lang)) ||
    pool.find((v) => !/google/i.test(v.name) && /^en/i.test(v.lang)) ||
    pool.find((v) => !/google/i.test(v.name)) ||
    pool.find((v) => /en-US/i.test(v.lang)) ||
    pool[0];
  return local || null;
}

function ensureVoices() {
  return new Promise((resolve) => {
    const ready = () => resolve(window.speechSynthesis.getVoices() || []);
    if (window.speechSynthesis.getVoices()?.length) {
      ready();
      return;
    }
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
      ready();
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoices);
    window.setTimeout(ready, 350);
  });
}

function clearHighlightTimers() {
  highlightTimers.forEach((id) => clearTimeout(id));
  highlightTimers = [];
}

function sleep(ms) {
  return new Promise((resolve) => {
    highlightTimers.push(window.setTimeout(resolve, ms));
  });
}

/** Group words into natural phrases/sentences for continuous speech. */
function groupWordsIntoPhrases(words) {
  const phrases = [];
  let current = [];
  words.forEach((w) => {
    current.push(w);
    const text = String(w.text || '');
    const endPunct = /[.!?;]$/.test(text);
    if (endPunct || current.length >= 12) {
      phrases.push(current);
      current = [];
    }
  });
  if (current.length) phrases.push(current);
  return phrases;
}

function phraseSpeechText(phraseWords) {
  return phraseWords.map((w) => String(w.text || '').trim()).filter(Boolean).join(' ');
}

function estimatePhraseWordDurations(phraseWords, rate) {
  // ~160 wpm at rate 1.0 — natural classroom TTS pace
  const safeRate = Math.max(0.5, rate);
  const wpm = 160 * safeRate;
  const avgWordMs = 60000 / wpm;
  return phraseWords.map((w) => {
    const token = String(w.text || '');
    const letters = token.replace(/[^A-Za-z0-9']/g, '').length || 1;
    let ms = avgWordMs * (Math.max(letters, 2) / 4.6);
    if (/[,]$/.test(token)) ms += 90 / safeRate;
    if (/[.!?;:]$/.test(token)) ms += 160 / safeRate;
    return Math.max(140 / safeRate, ms);
  });
}

function speakPhrase(phraseWords, { rate, voice, lang, isStopped, onWord, onBoundary }) {
  return new Promise((resolve) => {
    if (isStopped?.() || !phraseWords.length) {
      resolve();
      return;
    }

    const text = phraseSpeechText(phraseWords);
    if (!text) {
      resolve();
      return;
    }

    // Local char ranges inside this phrase utterance
    const local = [];
    let cursor = 0;
    phraseWords.forEach((w, i) => {
      const token = String(w.text || '').trim();
      if (!token) return;
      if (i > 0) cursor += 1; // space
      const start = cursor;
      const end = start + token.length;
      local.push({ start, end, globalIndex: w.index ?? i });
      cursor = end;
    });

    const u = new SpeechSynthesisUtterance(text);
    activeUtterance = u;
    u.rate = rate;
    u.lang = lang || 'en-US';
    if (voice) {
      u.voice = voice;
      if (voice.lang) u.lang = voice.lang;
    }

    let boundarySeen = false;
    let lastIdx = -1;
    const phraseTimers = [];

    const emit = (globalIndex) => {
      if (globalIndex === lastIdx || globalIndex < 0) return;
      lastIdx = globalIndex;
      onWord?.(globalIndex);
      const src = phraseWords.find((w) => (w.index ?? -1) === globalIndex);
      if (src) onBoundary?.(src.start);
    };

    const clearLocal = () => {
      phraseTimers.forEach((id) => clearTimeout(id));
      phraseTimers.length = 0;
    };

    const startTimed = () => {
      if (boundarySeen || isStopped?.()) return;
      const durations = estimatePhraseWordDurations(phraseWords, rate);
      let at = 30;
      phraseWords.forEach((w, i) => {
        const id = window.setTimeout(() => {
          if (boundarySeen || isStopped?.()) return;
          emit(w.index ?? i);
        }, at);
        phraseTimers.push(id);
        highlightTimers.push(id);
        at += durations[i];
      });
    };

    u.onboundary = (event) => {
      if (event.name && event.name !== 'word') return;
      boundarySeen = true;
      clearLocal();
      const idx = wordIndexAtChar(local, event.charIndex ?? 0);
      if (idx >= 0) emit(local[idx].globalIndex);
    };

    u.onstart = () => {
      // Prefer boundary events; if none arrive, use timed highlight for this phrase.
      const id = window.setTimeout(() => {
        if (!boundarySeen && !isStopped?.()) startTimed();
      }, 180);
      phraseTimers.push(id);
      highlightTimers.push(id);
    };

    const done = () => {
      clearLocal();
      if (activeUtterance === u) activeUtterance = null;
      resolve();
    };
    u.onend = done;
    u.onerror = done;

    if (isStopped?.()) {
      done();
      return;
    }
    window.speechSynthesis.speak(u);
  });
}

/**
 * Speak English text.
 * With `words` + `onWord`: speaks natural phrases and syncs word highlight.
 */
export function speakEn(text, options = {}) {
  if (!window.speechSynthesis) return () => {};
  window.speechSynthesis.cancel();
  clearHighlightTimers();

  const raw = String(text ?? '');
  if (!raw.trim()) return () => {};

  let stopped = false;
  const rate = options.rate ?? 0.92;
  const lang = options.lang || 'en-US';

  const stop = () => {
    stopped = true;
    clearHighlightTimers();
    window.speechSynthesis.cancel();
    activeUtterance = null;
  };

  if (options.words?.length && typeof options.onWord === 'function') {
    (async () => {
      await ensureVoices();
      if (stopped) return;
      const voice = options.voice || pickEnglishVoice();
      const phrases = groupWordsIntoPhrases(options.words);

      for (let p = 0; p < phrases.length; p += 1) {
        if (stopped) return;
        await speakPhrase(phrases[p], {
          rate,
          voice,
          lang,
          isStopped: () => stopped,
          onWord: options.onWord,
          onBoundary: options.onBoundary,
        });
        if (!stopped && p < phrases.length - 1) await sleep(120);
      }

      if (!stopped) options.onEnd?.();
    })();

    return stop;
  }

  (async () => {
    await ensureVoices();
    if (stopped) return;
    const voice = options.voice || pickEnglishVoice();
    await speakPhrase(
      [{ index: 0, start: 0, end: raw.length, text: raw }],
      {
        rate,
        voice,
        lang,
        isStopped: () => stopped,
      },
    );
    if (!stopped) options.onEnd?.();
  })();

  return stop;
}

// Warm voice list early (Chrome loads async).
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}

/** Split text into word spans for karaoke-style highlight during TTS. */
export function buildListenWordHtml(text) {
  const raw = String(text ?? '');
  const words = [];
  let html = '';
  const re = /(\S+)(\s*)/g;
  let match;
  let i = 0;
  while ((match = re.exec(raw)) !== null) {
    const word = match[1];
    const space = match[2] || '';
    const start = match.index;
    const end = start + word.length;
    words.push({ index: i, start, end, text: word });
    html += `<span class="listen-word" data-i="${i}" data-start="${start}" data-end="${end}">${escapeHtml(word)}</span>${escapeHtml(space)}`;
    i += 1;
  }
  return { html, words };
}

export function wordIndexAtChar(words, charIndex) {
  if (!words.length) return -1;
  let best = 0;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].start <= charIndex) best = i;
    if (charIndex < words[i].end) return i;
  }
  return best;
}

/** Canvas confetti burst; returns a stop function. */
export function launchConfetti(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const colors = ['#16a34a', '#22c55e', '#eab308', '#ea580c', '#6b4eaa', '#2563eb', '#f472b6'];
  let particles = [];
  let raf = 0;
  let running = true;
  const start = performance.now();
  const duration = 3200;

  const resize = () => {
    const parent = canvas.parentElement;
    canvas.width = parent?.clientWidth || window.innerWidth;
    canvas.height = Math.max(420, window.innerHeight * 0.55);
  };
  resize();

  for (let i = 0; i < 90; i += 1) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      vx: -3 + Math.random() * 6,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
      color: colors[i % colors.length],
    });
  }

  const tick = (now) => {
    if (!running) return;
    const t = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - t / duration);
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (t < duration) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  raf = requestAnimationFrame(tick);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
