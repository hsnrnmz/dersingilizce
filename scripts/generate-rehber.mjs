#!/usr/bin/env node
/**
 * Ünite rehber HTML sayfalarını üretir (AdSense için crawl edilebilir metin).
 * npm run build öncesinde otomatik çalışır.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const grades = [2, 3, 4, 5, 6, 7, 8];
const siteBase = 'https://dersingilizce.com';

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function unitList(uniteler) {
  return Object.entries(uniteler)
    .map(([key, name]) => {
      const m = key.match(/(\d+)/);
      return { no: m ? Number(m[1]) : 0, name: String(name) };
    })
    .filter((u) => u.no > 0)
    .sort((a, b) => a.no - b.no);
}

function optionalJson(path) {
  try {
    return loadJson(path);
  } catch {
    return {};
  }
}

function unitWords(kelimeler, uniteNo) {
  const node = kelimeler?.[`unite-${uniteNo}`];
  if (!node) return [];
  const list = Array.isArray(node) ? node : Object.values(node);
  return list
    .map((w) => ({ en: String(w?.en ?? '').trim(), tr: String(w?.tr ?? '').trim() }))
    .filter((w) => w.en && w.tr);
}

function unitSentences(cumleler, uniteNo, limit = 6) {
  const node = cumleler?.[`unite-${uniteNo}`];
  if (!Array.isArray(node)) return [];
  return node
    .map((s) => ({ en: String(s?.en ?? '').trim(), tr: String(s?.tr ?? '').trim() }))
    .filter((s) => s.en && s.tr)
    .slice(0, limit);
}

function unitListening(dinleme, uniteNo) {
  const block = dinleme?.[`unite-${uniteNo}`];
  const pack = block?.icerikler && typeof block.icerikler === 'object' ? block.icerikler : block;
  if (!pack || typeof pack !== 'object') return null;
  const first = Object.values(pack).find((item) => item && typeof item === 'object' && item.metin);
  if (!first) return null;
  return {
    title: String(first.baslik || '').trim(),
    text: String(first.metin || '').trim(),
  };
}

function countTests(testler, uniteNo) {
  const node = testler?.[`unite-${uniteNo}`];
  if (!node || typeof node !== 'object') return 0;
  return Object.keys(node).filter((k) => k.startsWith('test-')).length;
}

function topicParagraph(grade, unit, words) {
  const highlights = words
    .slice(0, 8)
        .map((w) => `${escapeHtml(w.en)} (${escapeHtml(w.tr)})`)
    .join(', ');
  const extra = highlights
    ? ` Öne çıkan kelimeler: ${highlights}.`
    : '';
  return `${grade}. sınıf İngilizce <em>${escapeHtml(unit.name)}</em> ünitesinde öğrenciler temayı günlük hayat bağlamında öğrenir.
        Kelimeleri kart ve testlerle pekiştirir, kısa cümlelerle konuşma alıştırması yapar.${extra}
        Derste önce kelimeleri sesli tekrar etmek, ardından örnek cümle ve dinleme metniyle kullanmak önerilir.`;
}

function buildUnitSection(grade, unit, { words, sentences, listening, testCount }) {
  const g = grade;
  const n = unit.no;
  const name = unit.name;
  const wordRows =
    words.length > 0
      ? `<ul class="rehber-word-list">${words.map((w) => `<li><strong>${escapeHtml(w.en)}</strong> — ${escapeHtml(w.tr)}</li>`).join('')}</ul>`
      : '<p>Bu ünitede kelime listesi platformda etkinlik soruları üzerinden sunulur.</p>';
  const sentenceRows =
    sentences.length > 0
      ? `<ul class="rehber-sentence-list">${sentences
          .map((s) => `<li><strong>${escapeHtml(s.en)}</strong> — ${escapeHtml(s.tr)}</li>`)
          .join('')}</ul>`
      : '';
  const listeningBlock = listening
    ? `<h3>Örnek dinleme / okuma metni</h3>
      ${listening.title ? `<p><strong>${escapeHtml(listening.title)}</strong></p>` : ''}
      <p>${escapeHtml(listening.text)}</p>`
    : '';

  const links = `
    <ul class="rehber-links">
      <li><a href="/unite.html?g=${g}&amp;mode=kelime">Kelime testleri</a></li>
      <li><a href="/unite.html?g=${g}&amp;mode=quiz">Görselli quiz</a></li>
      <li><a href="/unite.html?g=${g}&amp;mode=dinleme">Dinleme etkinliği</a></li>
      <li><a href="/yolculuk.html?g=${g}&amp;unite=${n}">Öğrenme yolculuğu</a></li>
      <li><a href="/kaynaklar.html?g=${g}">Video ve çalışma kağıdı</a></li>
      <li><a href="/sinif.html?g=${g}">Tüm etkinlikler</a></li>
    </ul>`;

  return `
    <section class="rehber-unit" id="unite-${n}">
      <h2>${g}. Sınıf İngilizce Ünite ${n}: ${escapeHtml(name)}</h2>
      <p>
        <strong>${g}. sınıf İngilizce ünite ${n} kelimeleri</strong> ve konu tekrarı için hazırlanmış
        ücretsiz rehber. <em>${escapeHtml(name)}</em> temasında kelime listesi, örnek cümleler ve
        dinleme metni birlikte sunulur.
      </p>
      <p>
        Bu ünitede yaklaşık <strong>${testCount || 'birkaç'}</strong> kelime testi, görselli quiz,
        dinleme ve oyun etkinliği bulunur. Öğretmen tahtada açabilir; öğrenci evde tekrarlayabilir.
        Hesap gerekmez.
      </p>
      <h3>Ünite konusu</h3>
      <p>
        ${topicParagraph(g, unit, words)}
      </p>
      <h3>${g}. sınıf ${escapeHtml(name)} kelimeleri</h3>
      ${wordRows}
      ${
        sentenceRows
          ? `<h3>Örnek cümleler</h3>
      ${sentenceRows}`
          : ''
      }
      ${listeningBlock}
      <h3>Platformda neler var?</h3>
      <p>
        Bu ünite için sitede kelime kartları, çoktan seçmeli testler, görselli quiz, dinleme
        metinleri, cümle kurma ve Wordwall oyun bağlantıları (varsa) hazırdır. Yarışma modunda
        sınıf içi 2’li yarış veya turnuva fikstürü de aynı ünite sorularını kullanabilir.
      </p>
      ${links}
      <h3>Çalışma önerisi</h3>
      <ol>
        <li>Ünite kelimelerini sesli tekrar edin (5–10 dakika).</li>
        <li>Kelime testinden bir bölüm çözün; yanlışları tahtada düzeltin.</li>
        <li>Quiz veya dinleme ile anlama becerisini ölçün.</li>
        <li>Öğrenme yolculuğu adımlarını ödev veya istasyon rotasyonu olarak kullanın.</li>
      </ol>
      <h3>Sık sorulan</h3>
      <dl class="rehber-faq">
        <dt>Bu ünite hangi sınıfa ait?</dt>
        <dd>${g}. sınıf — Ünite ${n}: ${escapeHtml(name)}.</dd>
        <dt>İçerik ücretsiz mi?</dt>
        <dd>Evet. Sınıf seçerek etkinliklere doğrudan erişebilirsiniz.</dd>
        <dt>Mobil uygulama var mı?</dt>
        <dd><a href="/mobil.html">${g}. sınıf uygulaması</a> Google Play’de mevcuttur.</dd>
      </dl>
    </section>`;
}

function pageShell({ grade, body, title, description }) {
  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <link rel="canonical" href="${siteBase}/rehber-${grade}.html" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="tr_TR" />
    <meta property="og:site_name" content="Ders İngilizce" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${siteBase}/rehber-${grade}.html" />
    <meta property="og:image" content="${siteBase}/logo-mark.png" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/styles.css" />
    <script src="/theme-init.js"></script>
  </head>
  <body>
    <div class="bg-blob bg-blob-1" aria-hidden="true"></div>
    <div class="bg-blob bg-blob-2" aria-hidden="true"></div>
    <div class="bg-blob bg-blob-3" aria-hidden="true"></div>

    <header class="site-header">
      <div class="nav-inner">
        <div class="nav-start">
          <a class="brand" href="/"><img class="brand-mark" src="/logo-mark.png" width="36" height="36" alt="" /><span class="brand-text">Ders İngilizce</span></a>
          <div class="nav-crumb">
            <a class="nav-back" href="/rehber.html">
              <svg class="nav-back-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M14.5 5.5 8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>Rehberler</span>
            </a>
            <span class="nav-grade">${grade}. Sınıf</span>
          </div>
        </div>
        <button class="nav-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false" aria-controls="site-nav">
          <span></span><span></span><span></span>
        </button>
        <nav class="site-nav" id="site-nav" aria-label="Ana menü">
          <a href="/">Ana Sayfa</a>
          <a href="/#siniflar">Sınıflar</a>
          <a href="/rehber.html" aria-current="page">Rehberler</a>
          <a href="/mobil.html">Uygulamalar</a>
          <a href="/hakkinda.html">Hakkında</a>
          <a href="/iletisim.html">İletişim</a>
          <a href="/gizlilik.html">Gizlilik</a>
        </nav>
      </div>
    </header>

    <div class="shell prose-shell">
      <header class="prose-hero">
        <p class="prose-kicker">Ünite rehberi</p>
        <h1>${grade}. Sınıf İngilizce — tüm üniteler</h1>
        <p class="prose-lead">
          Müfredat ünitelerinin özeti, örnek kelimeler ve etkinlik bağlantıları. Derste veya evde
          tekrar için metin tabanlı rehber; interaktif testler için bağlantılara tıklayın.
        </p>
      </header>

      <aside class="ad-wrap ad-wrap-top" aria-label="Reklam alanı">
        <div class="ad-slot" data-ad-format="horizontal"></div>
      </aside>

      <nav class="rehber-toc" aria-label="Ünite listesi">
        <h2 class="rehber-toc-title">Bu sayfadaki üniteler</h2>
        <ol class="rehber-toc-list">
          ${body.toc}
        </ol>
      </nav>

      <article class="prose rehber-article">
        ${body.sections}
      </article>

      <aside class="ad-wrap ad-wrap-bottom" aria-label="Reklam alanı">
        <div class="ad-slot" data-ad-format="horizontal"></div>
      </aside>

      <footer class="site-footer">
        <p>© 2026 Ders İngilizce · <a class="footer-inline" href="/gizlilik.html">Gizlilik</a></p>
      </footer>
    </div>

    <script type="module">
      import { bootSite } from '/src/site-boot.js';
      bootSite();
    </script>
  </body>
</html>`;
}

const indexEntries = [];

for (const grade of grades) {
  const dataDir = resolve(root, 'public', 'data', String(grade));
  const uniteler = loadJson(resolve(dataDir, 'uniteler.json'));
  const kelimeler = optionalJson(resolve(dataDir, 'kelimeler.json'));
  const testler = optionalJson(resolve(dataDir, 'testler.json'));
  const cumleler = optionalJson(resolve(dataDir, 'cumleler.json'));
  const dinleme = optionalJson(resolve(dataDir, 'dinleme.json'));

  const units = unitList(uniteler);
  const toc = units.map((u) => `<li><a href="#unite-${u.no}">Ünite ${u.no}: ${escapeHtml(u.name)}</a></li>`).join('');
  const sections = units
    .map((u) =>
      buildUnitSection(grade, u, {
        words: unitWords(kelimeler, u.no),
        sentences: unitSentences(cumleler, u.no),
        listening: unitListening(dinleme, u.no),
        testCount: countTests(testler, u.no),
      }),
    )
    .join('\n');

  indexEntries.push({ grade, units, count: units.length });

  const html = pageShell({
    grade,
    body: { toc, sections },
    title: `${grade}. Sınıf İngilizce Ünite Rehberi`,
    description: `${grade}. sınıf İngilizce ünite kelimeleri, konu özeti, örnek cümleler ve dinleme metinleri.`,
  });

  writeFileSync(resolve(root, `rehber-${grade}.html`), html, 'utf8');
  console.log(`rehber-${grade}.html (${units.length} ünite)`);
}

// Hub sayfası içeriği JSON (rehber.js için)
mkdirSync(resolve(root, 'public', 'data', 'rehber'), { recursive: true });
writeFileSync(resolve(root, 'public', 'data', 'rehber', 'index.json'), JSON.stringify(indexEntries, null, 2));

console.log('public/data/rehber/index.json');

const lastmod = new Date().toISOString().slice(0, 10);
const gradeModes = ['kelime', 'quiz', 'dinleme'];
const sitemapPaths = [
  '/',
  '/hakkinda.html',
  '/iletisim.html',
  '/gizlilik.html',
  '/mobil.html',
  '/kaynaklar.html',
  '/rehber.html',
  ...grades.map((g) => `/rehber-${g}.html`),
  ...grades.map((g) => `/sinif.html?g=${g}`),
  ...grades.map((g) => `/kaynaklar.html?g=${g}`),
  ...grades.map((g) => `/yolculuk.html?g=${g}`),
  ...grades.flatMap((g) => gradeModes.map((mode) => `/unite.html?g=${g}&mode=${mode}`)),
];

function sitemapLoc(path) {
  const loc = `${siteBase}${path === '/' ? '' : path}`.replaceAll('&', '&amp;');
  return `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`;
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPaths.map(sitemapLoc).join('\n')}
</urlset>
`;
writeFileSync(resolve(root, 'public', 'sitemap.xml'), sitemap);
console.log(`public/sitemap.xml (${sitemapPaths.length} URL)`);
