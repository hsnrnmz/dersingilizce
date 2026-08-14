import { bootSite } from './site-boot.js';
import { isGradeReady, loadJson, unitNamesFrom, escapeHtml } from './content.js';
import { setClassGrade } from './settings.js';

bootSite();

const params = new URLSearchParams(location.search);
const grade = Number(params.get('g') || params.get('grade') || 0);

const app = document.getElementById('app');
const statusEl = document.getElementById('status');
const kickerEl = document.getElementById('kaynak-kicker');
const backLink = document.getElementById('back-link');

backLink.href = grade ? `/sinif.html?g=${grade}` : '/';

function youtubeId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!s.includes('/') && !s.includes('.')) return s;
  try {
    const uri = new URL(s);
    if (uri.hostname.includes('youtu.be')) return uri.pathname.split('/').filter(Boolean)[0] || '';
    if (uri.hostname.includes('youtube.com')) {
      const v = uri.searchParams.get('v');
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  return '';
}

async function main() {
  if (!isGradeReady(grade)) {
    document.title = 'Kaynaklar — hazır değil';
    kickerEl.textContent = `${grade || '?'}. Sınıf`;
    statusEl.textContent = 'Bu sınıf henüz hazır değil.';
    return;
  }

  setClassGrade(grade);
  document.title = `Kaynaklar — ${grade}. Sınıf`;
  kickerEl.textContent = `${grade}. Sınıf · Kaynaklar`;

  try {
    const [uniteler, videolar, kagitlar] = await Promise.all([
      loadJson(grade, 'uniteler'),
      loadJson(grade, 'ders-videolari').catch(() => ({})),
      loadJson(grade, 'calisma-kagitlari').catch(() => ({})),
    ]);

    const units = unitNamesFrom(uniteler);
    statusEl.hidden = true;

    const lgsBlock =
      grade === 8
        ? `
      <section class="kaynak-lgs" id="lgs">
        <header class="kaynak-lgs-head">
          <p class="kaynak-lgs-eyebrow">8. Sınıf</p>
          <h2>LGS Tekrar Paketi</h2>
          <p class="lead">Tüm ünitelerden hızlı erişim — video, PDF ve kelime testi.</p>
        </header>
        <div class="kaynak-lgs-grid">
          ${units
            .map(
              (u) => `
            <a class="kaynak-lgs-chip" href="/test.html?g=8&type=kelime&unite=${u.no}&hizli=1&n=10">
              Ünite ${u.no} · Test
            </a>`,
            )
            .join('')}
          ${units
            .map(
              (u) => `
            <a class="kaynak-lgs-chip is-quiz" href="/test.html?g=8&type=quiz&unite=${u.no}&hizli=1&n=10">
              Ünite ${u.no} · Quiz
            </a>`,
            )
            .join('')}
        </div>
      </section>`
        : '';

    app.innerHTML = `
      <header class="page-hero page-hero-compact">
        <h1>Video &amp; Çalışma Kağıdı</h1>
        <p class="lead">Ünite bazında ders videoları ve PDF çalışma kağıtları.</p>
      </header>
      ${lgsBlock}
      <section class="kaynak-list" aria-label="Ünite kaynakları">
        ${units
          .map((u) => {
            const videoRaw = videolar?.[String(u.no)] || videolar?.[u.no];
            const pdfUrl = kagitlar?.[String(u.no)] || kagitlar?.[u.no];
            const yt = youtubeId(videoRaw);
            return `
              <article class="kaynak-card">
                <header class="kaynak-card-head">
                  <h2>Ünite ${u.no}</h2>
                  <p>${escapeHtml(u.name)}</p>
                </header>
                <div class="kaynak-card-actions">
                  ${
                    yt
                      ? `<a class="kaynak-btn is-video" href="https://www.youtube.com/watch?v=${yt}" target="_blank" rel="noopener noreferrer">
                          <span>Ders videosu</span>
                        </a>`
                      : `<span class="kaynak-btn is-disabled">Video yok</span>`
                  }
                  ${
                    pdfUrl
                      ? `<a class="kaynak-btn is-pdf" href="${escapeHtml(String(pdfUrl))}" target="_blank" rel="noopener noreferrer">
                          <span>Çalışma kağıdı (PDF)</span>
                        </a>`
                      : `<span class="kaynak-btn is-disabled">PDF yok</span>`
                  }
                  <a class="kaynak-btn is-test" href="/test.html?g=${grade}&type=kelime&unite=${u.no}&hizli=1&n=10">Kelime testi</a>
                  <a class="kaynak-btn is-quiz" href="/test.html?g=${grade}&type=quiz&unite=${u.no}&hizli=1&n=10">Quiz</a>
                </div>
              </article>`;
          })
          .join('')}
      </section>
    `;

    if (location.hash === '#lgs') {
      document.getElementById('lgs')?.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (err) {
    console.error(err);
    statusEl.hidden = false;
    statusEl.textContent = 'Kaynaklar yüklenemedi.';
  }
}

main();
