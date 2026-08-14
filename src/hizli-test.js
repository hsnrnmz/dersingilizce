import { loadJson, unitNamesFrom, escapeHtml } from './content.js';

const SORU_SECENEKLERI = [5, 10, 15, 20];

/**
 * Uygulamadaki gibi Hızlı Test Oluştur diyaloğu.
 * @param {number} grade
 * @param {{ defaultType?: 'kelime'|'quiz', defaultUnite?: number }} [opts]
 */
export async function openHizliTestDialog(grade, opts = {}) {
  const uniteler = await loadJson(grade, 'uniteler');
  const units = unitNamesFrom(uniteler);
  if (!units.length) return;

  let type = opts.defaultType === 'quiz' ? 'quiz' : 'kelime';
  let uniteNo = opts.defaultUnite && units.some((u) => u.no === opts.defaultUnite)
    ? opts.defaultUnite
    : units[0].no;
  let soruSayisi = 10;

  const existing = document.getElementById('hizli-dialog-root');
  existing?.remove();

  const root = document.createElement('div');
  root.id = 'hizli-dialog-root';
  root.className = 'hizli-overlay';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'hizli-dialog-title');

  const paint = () => {
    root.innerHTML = `
      <div class="hizli-dialog">
        <header class="hizli-dialog-head">
          <span class="hizli-dialog-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M4 6h2v12H4V6zm4 0h2v12H8V6zm3.5 0 6.5 6-6.5 6V6zM18 6h2v12h-2V6z"/></svg>
          </span>
          <h2 id="hizli-dialog-title">Hızlı Test Oluştur</h2>
        </header>
        <div class="hizli-dialog-body">
          <label class="hizli-field">
            <span class="hizli-field-label">Kategori</span>
            <select class="hizli-select" id="hizli-type">
              <option value="kelime" ${type === 'kelime' ? 'selected' : ''}>Kelime Testi</option>
              <option value="quiz" ${type === 'quiz' ? 'selected' : ''}>Quiz</option>
            </select>
          </label>
          <label class="hizli-field">
            <span class="hizli-field-label">Ünite</span>
            <select class="hizli-select" id="hizli-unite">
              ${units
                .map(
                  (u) => `
                <option value="${u.no}" ${u.no === uniteNo ? 'selected' : ''}>
                  Ünite ${u.no} — ${escapeHtml(u.name)}
                </option>`,
                )
                .join('')}
            </select>
          </label>
          <label class="hizli-field">
            <span class="hizli-field-label">Soru sayısı</span>
            <select class="hizli-select" id="hizli-count">
              ${SORU_SECENEKLERI.map(
                (n) => `
                <option value="${n}" ${n === soruSayisi ? 'selected' : ''}>${n} soru</option>`,
              ).join('')}
            </select>
          </label>
          <div class="hizli-dialog-actions">
            <button class="ghost-btn" type="button" id="hizli-cancel">İptal</button>
            <button class="hizli-start-btn" type="button" id="hizli-start">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7L8 5z"/></svg>
              Testi Başlat
            </button>
          </div>
        </div>
      </div>`;

    root.querySelector('#hizli-type')?.addEventListener('change', (e) => {
      type = e.target.value === 'quiz' ? 'quiz' : 'kelime';
    });
    root.querySelector('#hizli-unite')?.addEventListener('change', (e) => {
      uniteNo = Number(e.target.value) || uniteNo;
    });
    root.querySelector('#hizli-count')?.addEventListener('change', (e) => {
      soruSayisi = Number(e.target.value) || 10;
    });
    root.querySelector('#hizli-cancel')?.addEventListener('click', close);
    root.querySelector('#hizli-start')?.addEventListener('click', () => {
      const url = `/test.html?g=${grade}&type=${type}&unite=${uniteNo}&n=${soruSayisi}&hizli=1`;
      location.href = url;
    });
  };

  const close = () => {
    document.removeEventListener('keydown', onKey);
    root.remove();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };

  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });

  document.addEventListener('keydown', onKey);
  document.body.appendChild(root);
  paint();
  root.querySelector('#hizli-start')?.focus();
}

/** Sınıf / hub sayfalarına yerleştirilecek buton HTML'i. */
export function hizliTestButtonHtml() {
  return `
    <button class="hizli-launch-btn" type="button" id="hizli-open-btn">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M4 6h2v12H4V6zm4 0h2v12H8V6zm3.5 0 6.5 6-6.5 6V6zM18 6h2v12h-2V6z"/></svg>
      <span>Hızlı Test Oluştur</span>
    </button>`;
}

export function bindHizliTestButton(grade, opts = {}) {
  document.getElementById('hizli-open-btn')?.addEventListener('click', () => {
    openHizliTestDialog(grade, opts).catch((err) => console.error(err));
  });
}
