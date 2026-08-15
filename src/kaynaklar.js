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
    const host = uri.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return uri.pathname.split('/').filter(Boolean)[0] || '';
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = uri.searchParams.get('v');
      if (v) return v;
      const parts = uri.pathname.split('/').filter(Boolean);
      const i = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
      if (i >= 0 && parts[i + 1]) return parts[i + 1];
    }
  } catch {
    /* ignore */
  }
  return '';
}

function posterButtonHtml(yt, title) {
  return `<button class="kaynak-video-play" type="button" data-play-yt="${escapeHtml(yt)}" aria-label="${escapeHtml(title)}">
        <img src="https://i.ytimg.com/vi/${escapeHtml(yt)}/hqdefault.jpg" alt="" />
        <span class="kaynak-video-play-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>
        </span>
        <span class="kaynak-video-play-label">Ders videosunu izle</span>
      </button>`;
}

function videoPlayerHtml(yt, title) {
  return `
    <div class="kaynak-video video-wrap" data-yt="${escapeHtml(yt)}" data-title="${escapeHtml(title)}">
      ${posterButtonHtml(yt, title)}
    </div>`;
}

function youtubeEmbedHtml(yt) {
  return `<iframe
          src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?autoplay=1&rel=0"
          title="Ders videosu"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen
        ></iframe>`;
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
                <div class="kaynak-card-media">
                  ${
                    yt
                      ? videoPlayerHtml(yt, `Ünite ${u.no}: ${u.name}`)
                      : `<p class="kaynak-video-empty">Bu ünite için video yok.</p>`
                  }
                </div>
                <div class="kaynak-card-actions">
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

    app.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-play-yt]');
      if (!btn) return;
      const wrap = btn.closest('.kaynak-video');
      const yt = btn.getAttribute('data-play-yt');
      if (!yt || !wrap) return;
      app.querySelectorAll('.kaynak-video[data-yt]').forEach((other) => {
        if (other === wrap || !other.querySelector('iframe')) return;
        const id = other.getAttribute('data-yt');
        const title = other.getAttribute('data-title') || 'Ders videosu';
        if (id) other.innerHTML = posterButtonHtml(id, title);
      });
      wrap.innerHTML = youtubeEmbedHtml(yt);
    });

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
