import { bootSite } from './site-boot.js';
import { escapeHtml } from './content.js';

bootSite();

const hub = document.getElementById('rehber-hub');
if (!hub) throw new Error('rehber-hub missing');

async function main() {
  const res = await fetch('/data/rehber/index.json');
  if (!res.ok) throw new Error('Rehber listesi yüklenemedi');
  const entries = await res.json();

  hub.innerHTML = `
    <div class="rehber-hub-grid">
      ${entries
        .map(
          (e) => `
        <a class="rehber-hub-card" href="/rehber-${e.grade}.html" style="--accent: var(--grade-${e.grade}, #a78bfa)">
          <span class="rehber-hub-grade">${e.grade}</span>
          <span class="rehber-hub-title">${e.grade}. Sınıf rehberi</span>
          <span class="rehber-hub-meta">${e.count} ünite · metin + etkinlik linkleri</span>
          <ul class="rehber-hub-units">
            ${e.units
              .slice(0, 4)
              .map((u) => `<li>${escapeHtml(u.name)}</li>`)
              .join('')}
            ${e.units.length > 4 ? `<li>+ ${e.units.length - 4} ünite daha</li>` : ''}
          </ul>
        </a>`,
        )
        .join('')}
    </div>`;
}

main().catch(() => {
  hub.innerHTML = `<p class="status-box">Rehber listesi yüklenemedi. <code>npm run generate:rehber</code> komutunu çalıştırın.</p>`;
});
