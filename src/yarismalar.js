import { initNav } from './nav.js';
import { isGradeReady } from './content.js';

initNav();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || params.get('grade') || 0);
const backLink = document.getElementById('back-link');
const kickerEl = document.getElementById('yaris-kicker');
const hubEl = document.getElementById('yaris-hub');

backLink.href = grade ? `/sinif.html?g=${grade}` : '/';

if (!isGradeReady(grade)) {
  document.title = 'Yarışmalar — hazır değil';
  kickerEl.textContent = `${grade || '?'}. Sınıf`;
  hubEl.innerHTML = `<p class="status-box">Bu sınıf henüz hazır değil.</p>`;
} else {
  document.title = `Yarışmalar — ${grade}. Sınıf`;
  kickerEl.textContent = `${grade}. Sınıf · Yarışmalar`;
  hubEl.innerHTML = `
    <a class="yaris-hub-card yaris-hub-duel" href="/yaris.html?g=${grade}">
      <span class="yaris-hub-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M12 2 9.2 8.5H2.5l5.4 4-2.1 6.5L12 15.2l6.2 3.8-2.1-6.5 5.4-4h-6.7L12 2z"/></svg>
      </span>
      <h2>2’li Yarış</h2>
      <p>İki öğrenci, aynı sorular, önce doğru cevaplayan kazanır.</p>
      <span class="yaris-hub-cta">Başla</span>
    </a>
    <a class="yaris-hub-card yaris-hub-bracket" href="/turnuva.html?g=${grade}">
      <span class="yaris-hub-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="32" height="32"><path fill="currentColor" d="M5 3h4v6H5V3zm10 0h4v6h-4V3zM5 15h4v6H5v-6zm10 0h4v6h-4v-6zM11 5h2v14h-2V5z"/></svg>
      </span>
      <h2>Turnuva</h2>
      <p>Öğrenci sayısını gir; isimleri yapıştır veya Excel yükle. Karışık eşleşme.</p>
      <span class="yaris-hub-cta">Turnuva kur</span>
    </a>
  `;
}
