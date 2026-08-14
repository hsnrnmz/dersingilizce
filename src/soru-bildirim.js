import { escapeHtml } from './content.js';
import {
  SORU_BILDIRIM_KATEGORILER,
  buildFirebasePayload,
  submitSoruBildirim,
  mailtoFallback,
  makeSoruId,
} from './firebase-grade-config.js';

/** @typedef {{ grade: number, uniteNo: number, testId?: string, etkinlik?: string, contentIndex?: number, questions?: object[] }} ReportContext */

let dialogEl = null;

function closeDialog() {
  dialogEl?.remove();
  dialogEl = null;
}

function showToast(message, ok = true) {
  let toast = document.getElementById('soru-bildir-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'soru-bildir-toast';
    toast.className = 'soru-bildir-toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `soru-bildir-toast ${ok ? 'is-ok' : 'is-bad'}`;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

/**
 * @param {object} kayit
 * @param {ReportContext} ctx
 */
export function openSoruBildirDialog(kayit, ctx) {
  closeDialog();
  const defaultKat = SORU_BILDIRIM_KATEGORILER[1];

  dialogEl = document.createElement('div');
  dialogEl.className = 'soru-bildir-dialog';
  dialogEl.innerHTML = `
    <div class="soru-bildir-backdrop" data-close="1" aria-hidden="true"></div>
    <div class="soru-bildir-panel" role="dialog" aria-labelledby="soru-bildir-title" aria-modal="true">
      <div class="soru-bildir-head">
        <span class="soru-bildir-icon" aria-hidden="true">🚩</span>
        <h2 id="soru-bildir-title">Hatalı soru bildir</h2>
      </div>
      <p class="soru-bildir-meta">Soru ${kayit.no}</p>
      <p class="soru-bildir-preview">${escapeHtml(kayit.prompt)}</p>
      ${
        kayit.imageUrl
          ? `<img class="soru-bildir-thumb" src="${escapeHtml(kayit.imageUrl)}" alt="" />`
          : ''
      }
      <p class="soru-bildir-label">Sorun türü</p>
      <div class="soru-bildir-kategoriler">
        ${SORU_BILDIRIM_KATEGORILER.map(
          (k, i) => `
          <label class="soru-bildir-kat">
            <input type="radio" name="bildirim-kat" value="${k.kod}" ${i === 1 ? 'checked' : ''} />
            <span>${escapeHtml(k.etiket)}</span>
          </label>`,
        ).join('')}
      </div>
      <label class="soru-bildir-label" for="soru-bildir-not">Ek not (isteğe bağlı)</label>
      <textarea id="soru-bildir-not" class="soru-bildir-not" rows="2" placeholder="Kısa açıklama yazabilirsiniz…"></textarea>
      <div class="soru-bildir-actions">
        <button type="button" class="ghost-btn" data-close="1">Vazgeç</button>
        <button type="button" class="primary-btn" id="soru-bildir-gonder">Gönder</button>
      </div>
    </div>`;

  document.body.appendChild(dialogEl);

  dialogEl.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', closeDialog);
  });

  const sendBtn = dialogEl.querySelector('#soru-bildir-gonder');
  sendBtn?.addEventListener('click', async () => {
    if (sendBtn.disabled) return;
    const kat =
      dialogEl.querySelector('input[name="bildirim-kat"]:checked')?.value || defaultKat.kod;
    const not = dialogEl.querySelector('#soru-bildir-not')?.value || '';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Gönderiliyor…';

    const payload = buildFirebasePayload(kayit, kat, not, ctx);
    let ok = await submitSoruBildirim(ctx.grade, payload);

    if (!ok) {
      window.location.href = mailtoFallback(kayit, kat, ctx);
      closeDialog();
      showToast('E-posta uygulamanız açıldı. Gönderemezseniz tekrar deneyin.', false);
      return;
    }

    closeDialog();
    showToast('Bildiriminiz alındı. Teşekkürler!');
  });

  dialogEl.querySelector('#soru-bildir-not')?.focus();
}

/**
 * @param {object} a answer record with report fields
 * @param {ReportContext} ctx
 */
export function renderResultQuestionArticle(a) {
  return `
    <article class="result-q ${a.ok ? 'is-ok' : 'is-bad'}">
      <div class="result-q-head">
        <span class="result-q-no">${a.no}</span>
        <span class="result-q-badge">${a.ok ? '✓ Doğru' : '✕ Yanlış'}</span>
        <button type="button" class="result-q-report" aria-label="Soru ${a.no} hatalı bildir">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>
          Hatalı bildir
        </button>
      </div>
      ${a.imageUrl ? `<img class="result-q-img" src="${escapeHtml(a.imageUrl)}" alt="" />` : ''}
      <p class="result-q-prompt">${escapeHtml(a.prompt)}</p>
      <p class="result-q-line"><span>Senin cevabın</span><strong>${escapeHtml(a.userAnswer)}</strong></p>
      ${
        a.ok
          ? ''
          : `<p class="result-q-line ok"><span>Doğru cevap</span><strong>${escapeHtml(a.correctAnswer)}</strong></p>`
      }
    </article>`;
}

/**
 * @param {HTMLElement|null} root
 * @param {ReportContext} ctx
 * @param {object[]} answers
 */
export function bindSoruBildirButtons(root, ctx, answers) {
  if (!root || !answers?.length) return;
  root.querySelectorAll('.result-q').forEach((article, i) => {
    const btn = article.querySelector('.result-q-report');
    const kayit = answers[i];
    if (!btn || !kayit) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSoruBildirDialog(kayit, ctx);
    });
  });
}

/**
 * @param {object[]} answers
 * @param {object[]} questions
 * @param {ReportContext} ctx
 */
export function enrichAnswersForReport(answers, questions, ctx) {
  return answers.map((a, i) => {
    const q = questions[i] || {};
    return {
      ...a,
      soruId: q.id || a.soruId || makeSoruId(ctx, a.no),
      options: q.options || a.options || [],
      correctIndex: q.correctIndex ?? a.correctIndex ?? 0,
      image: q.image ?? a.image ?? null,
      imageUrl: a.imageUrl ?? q.imageUrl ?? null,
      kategori: q.kategori || q.type || a.kategori || '',
      uniteNo: ctx.uniteNo,
      testId: ctx.testId || '',
    };
  });
}
