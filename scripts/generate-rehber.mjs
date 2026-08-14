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

function sampleWords(kelimeler, uniteNo, limit = 18) {
  const node = kelimeler?.[`unite-${uniteNo}`];
  if (!node) return [];
  const list = Array.isArray(node) ? node : Object.values(node);
  return list
    .map((w) => ({ en: String(w?.en ?? '').trim(), tr: String(w?.tr ?? '').trim() }))
    .filter((w) => w.en && w.tr)
    .slice(0, limit);
}

function countTests(testler, uniteNo) {
  const node = testler?.[`unite-${uniteNo}`];
  if (!node || typeof node !== 'object') return 0;
  return Object.keys(node).filter((k) => k.startsWith('test-')).length;
}

function buildUnitSection(grade, unit, words, testCount) {
  const g = grade;
  const n = unit.no;
  const name = unit.name;
  const wordRows =
    words.length > 0
      ? `<ul class="rehber-word-list">${words.map((w) => `<li><strong>${escapeHtml(w.en)}</strong> — ${escapeHtml(w.tr)}</li>`).join('')}</ul>`
      : '<p>Bu ünitede kelime listesi platformda etkinlik soruları üzerinden sunulur.</p>';

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
      <h2>Ünite ${n}: ${escapeHtml(name)}</h2>
      <p>
        <strong>${g}. sınıf İngilizce</strong> müfredatında <em>${escapeHtml(name)}</em> teması,
        öğrencilerin günlük hayatta sık kullanacağı kelime ve ifadeleri pekiştirmeyi hedefler.
        Bu rehber; ünite kapsamını, örnek kelime listesini, sınıfta nasıl çalışılacağını ve
        platformdaki etkinlik bağlantılarını özetler.
      </p>
      <p>
        Ünite ${n} kapsamında yaklaşık <strong>${testCount || 'birkaç'}</strong> kelime testi,
        görselli quiz soruları, dinleme metni ve oyun etkinlikleri bulunur. Öğretmenler tahtada
        doğrudan etkinliği açabilir; öğrenciler ise evde tekrar için aynı üniteyi seçebilir.
        Hesap oluşturma gerekmez; ilerleme tarayıcıda yerel olarak saklanabilir.
      </p>
      <h3>Ünite konusu</h3>
      <p>
        ${escapeHtml(name)} teması, ${g}. sınıf seviyesine uygun kelime dağarcığı ve basit cümle
        yapıları sunar. Derste önce temayı tanıtmak, ardından dinleme-tekrar ve görsel destekli
        quiz ile pekiştirmek önerilir. Kelimeleri yalnızca ezberletmek yerine kısa diyaloglar
        veya resimli kartlarla bağlama oturtmak kalıcı öğrenmeyi artırır.
      </p>
      <h3>Örnek kelimeler</h3>
      ${wordRows}
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
  let kelimeler = {};
  let testler = {};
  try {
    kelimeler = loadJson(resolve(dataDir, 'kelimeler.json'));
  } catch {
    /* optional */
  }
  try {
    testler = loadJson(resolve(dataDir, 'testler.json'));
  } catch {
    /* optional */
  }

  const units = unitList(uniteler);
  const toc = units.map((u) => `<li><a href="#unite-${u.no}">Ünite ${u.no}: ${escapeHtml(u.name)}</a></li>`).join('');
  const sections = units
    .map((u) => buildUnitSection(grade, u, sampleWords(kelimeler, u.no), countTests(testler, u.no)))
    .join('\n');

  indexEntries.push({ grade, units, count: units.length });

  const html = pageShell({
    grade,
    body: { toc, sections },
    title: `${grade}. Sınıf İngilizce Ünite Rehberi`,
    description: `${grade}. sınıf İngilizce tüm üniteler: konu özeti, kelime listesi, çalışma önerileri ve etkinlik bağlantıları.`,
  });

  writeFileSync(resolve(root, `rehber-${grade}.html`), html, 'utf8');
  console.log(`rehber-${grade}.html (${units.length} ünite)`);
}

// Hub sayfası içeriği JSON (rehber.js için)
mkdirSync(resolve(root, 'public', 'data', 'rehber'), { recursive: true });
writeFileSync(resolve(root, 'public', 'data', 'rehber', 'index.json'), JSON.stringify(indexEntries, null, 2));

console.log('public/data/rehber/index.json');

const siteBase = 'https://dersingilizce.com';
const staticPages = [
  '/',
  '/hakkinda.html',
  '/iletisim.html',
  '/gizlilik.html',
  '/mobil.html',
  '/kaynaklar.html',
  '/rehber.html',
  ...grades.map((g) => `/rehber-${g}.html`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map((p) => `  <url><loc>${siteBase}${p === '/' ? '' : p}</loc></url>`).join('\n')}
</urlset>`;
writeFileSync(resolve(root, 'public', 'sitemap.xml'), sitemap);
console.log('public/sitemap.xml');
