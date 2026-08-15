import { initNav } from './nav.js';
import { isGradeReady, MODULES, GAMES, escapeHtml } from './content.js';
import { applySeo } from './seo.js';
import { hizliTestButtonHtml, bindHizliTestButton } from './hizli-test.js';
import { setClassGrade } from './settings.js';
import { renderGradeMobileBanner } from './mobile-apps.js';

initNav();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || params.get('grade') || 0);
const statusEl = document.getElementById('status');
const listEl = document.getElementById('module-list');
const titleEl = document.getElementById('grade-title');
const kickerEl = document.getElementById('grade-kicker');
const leadEl = document.getElementById('grade-lead');

function main() {
  if (!isGradeReady(grade)) {
    applySeo({ title: 'Sınıf henüz yok | Ders İngilizce' });
    kickerEl.textContent = `${grade || '?'}. Sınıf`;
    titleEl.textContent = 'İçerik henüz eklenmedi';
    leadEl.textContent = 'Şimdilik 2–8. sınıflar hazır.';
    statusEl.textContent = 'Ana sayfadan hazır sınıflardan birini seçebilirsin.';
    return;
  }

  applySeo({
    title: `${grade}. Sınıf İngilizce Üniteler, Test ve Quiz | Ders İngilizce`,
    description: `${grade}. sınıf İngilizce ünite listesi, kelime testleri, quiz, dinleme etkinlikleri ve oyunlar.`,
  });
  kickerEl.textContent = `${grade}. Sınıf`;
  titleEl.textContent = 'Ne yapmak istersin?';
  leadEl.textContent = 'Uygulamadaki gibi tüm etkinlikler burada.';
  statusEl.hidden = true;
  listEl.hidden = false;
  setClassGrade(grade);

  const lgsCard =
    grade === 8
      ? `
    <a class="lgs-pack-card" href="/kaynaklar.html?g=8#lgs">
      <div class="lgs-pack-glow" aria-hidden="true"></div>
      <div class="lgs-pack-copy">
        <p class="lgs-pack-eyebrow">8. Sınıf</p>
        <h2>LGS Tekrar Paketi</h2>
        <p>Tüm üniteler: video, çalışma kağıdı ve hızlı test bağlantıları.</p>
      </div>
      <span class="lgs-pack-cta">Aç</span>
    </a>`
      : '';

  listEl.innerHTML = `
    ${lgsCard}
    <a class="kaynaklar-home-card" href="/kaynaklar.html?g=${grade}">
      <div class="kaynaklar-home-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.5L18.5 9H13V4.5zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg>
      </div>
      <div class="kaynaklar-home-copy">
        <p class="kaynaklar-home-eyebrow">Ünite kaynakları</p>
        <h2>Video &amp; Çalışma Kağıdı</h2>
        <p>Ders videoları ve PDF çalışma kağıtları.</p>
      </div>
      <span class="kaynaklar-home-cta">Gör</span>
    </a>
    <a class="yol-home-card" href="/yolculuk.html?g=${grade}">
      <div class="yol-home-glow" aria-hidden="true"></div>
      <div class="yol-home-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="36" height="36"><path fill="currentColor" d="M12 2 4.5 6v6.5c0 4.6 3.2 8.9 7.5 9.9 4.3-1 7.5-5.3 7.5-9.9V6L12 2zm0 2.2 5.5 3v5.3c0 3.5-2.3 6.8-5.5 7.7-3.2-.9-5.5-4.2-5.5-7.7V7.2L12 4.2zM11 8h2v5h-2V8zm0 6h2v2h-2v-2z"/></svg>
      </div>
      <div class="yol-home-copy">
        <p class="yol-home-eyebrow">Sıralı öğrenme</p>
        <h2>Öğrenme Yolculuğu</h2>
        <p>Çalışma kağıdından quize kadar adım adım ilerle.</p>
      </div>
      <span class="yol-home-cta">Başla</span>
    </a>
    <div class="module-grid">
      ${MODULES.map(
        (m) => `
        <a class="module-card" href="/unite.html?g=${grade}&mode=${m.id}" style="--accent:${m.accent}">
          <span class="module-title">${escapeHtml(m.title)}</span>
          <span class="module-sub">${escapeHtml(m.subtitle)}</span>
        </a>`,
      ).join('')}
    </div>
    <div class="grade-quick-actions">
      ${hizliTestButtonHtml()}
      <a class="yaris-launch-btn yarismalar-launch-btn" href="/yarismalar.html?g=${grade}">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 2 9.2 8.5H2.5l5.4 4-2.1 6.5L12 15.2l6.2 3.8-2.1-6.5 5.4-4h-6.7L12 2z"/></svg>
        <span>Yarışmalar</span>
      </a>
    </div>
    <section class="games-preview" aria-labelledby="games-preview-title">
      <div class="games-preview-head">
        <div>
          <p class="games-preview-eyebrow">Oyunlar modülü</p>
          <h2 id="games-preview-title">Oyunlar içinde</h2>
          <p class="games-preview-lead">Eşleştirme, balon, hafıza ve daha fazlası — bir oyuna dokunarak başla.</p>
        </div>
        <a class="games-preview-all" href="/unite.html?g=${grade}&mode=oyunlar">Tümünü gör</a>
      </div>
      <div class="chip-row">
        ${GAMES.map(
          (g) => `
          <a class="info-chip" href="/unite.html?g=${grade}&mode=${g.id}">
            <span class="info-chip-dot" aria-hidden="true"></span>
            ${escapeHtml(g.title)}
          </a>`,
        ).join('')}
      </div>
    </section>
    <div class="grade-hub-bottom">
      <a class="kaynaklar-home-card" href="/rehber-${grade}.html">
        <div class="kaynaklar-home-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M6 4h12a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 0 1 2-2z"/></svg>
        </div>
        <div class="kaynaklar-home-copy">
          <p class="kaynaklar-home-eyebrow">Metin rehber</p>
          <h2>Ünite rehberi</h2>
          <p>Tüm üniteler: konu özeti, kelimeler ve etkinlik linkleri.</p>
        </div>
        <span class="kaynaklar-home-cta">Oku</span>
      </a>
      ${renderGradeMobileBanner(grade)}
    </div>
  `;

  bindHizliTestButton(grade);
}

main();
