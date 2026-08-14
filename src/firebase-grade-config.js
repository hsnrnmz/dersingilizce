/** @typedef {{ kod: string, etiket: string }} SoruBildirimKategori */

/** @type {SoruBildirimKategori[]} */
export const SORU_BILDIRIM_KATEGORILER = [
  { kod: 'soru_metni', etiket: 'Soru metni hatalı / anlaşılmaz' },
  { kod: 'dogru_cevap', etiket: 'Doğru cevap yanlış işaretlenmiş' },
  { kod: 'secenekler', etiket: 'Seçenekler hatalı' },
  { kod: 'gorsel', etiket: 'Görsel / resim sorunu' },
  { kod: 'diger', etiket: 'Diğer' },
];

/** @type {Record<number, { rtdbUrl: string, uygulama: string }>} */
export const GRADE_FIREBASE = {
  2: { rtdbUrl: 'https://words-915f8-default-rtdb.firebaseio.com', uygulama: 'ingilizce2' },
  3: { rtdbUrl: 'https://ingilizce3-44188-default-rtdb.firebaseio.com', uygulama: 'ingilizce3' },
  4: { rtdbUrl: 'https://ingilizce-4-63b87-default-rtdb.firebaseio.com', uygulama: 'ingilizce4' },
  5: { rtdbUrl: 'https://ingilizce5-f47b4-default-rtdb.firebaseio.com', uygulama: 'ingilizce5' },
  6: { rtdbUrl: 'https://englishwordwall-8f5e2-default-rtdb.firebaseio.com', uygulama: 'ingilizce6' },
  7: { rtdbUrl: 'https://ehliyetpro-bd1ce-default-rtdb.firebaseio.com', uygulama: 'ingilizce7' },
  8: { rtdbUrl: 'https://english-8-61c65-default-rtdb.firebaseio.com', uygulama: 'ingilizce8' },
};

/**
 * @param {object} ctx
 * @param {number} ctx.grade
 * @param {number} ctx.uniteNo
 * @param {string} [ctx.testId]
 * @param {string} [ctx.etkinlik]
 * @param {number} [ctx.contentIndex]
 */
export function makeSoruId(ctx, soruNo) {
  const { grade, uniteNo, testId, etkinlik, contentIndex } = ctx;
  if (etkinlik === 'dinleme') {
    return `web-g${grade}-u${uniteNo}-dinleme-${contentIndex ?? 0}-q${soruNo}`;
  }
  const tid = testId || 'hizli';
  return `web-g${grade}-u${uniteNo}-${tid}-q${soruNo}`;
}

/**
 * @param {ReturnType<typeof buildAnswerRecord>} kayit
 * @param {string} kategoriKod
 * @param {string} [kullaniciNotu]
 * @param {{ grade: number }} ctx
 */
export function buildFirebasePayload(kayit, kategoriKod, kullaniciNotu, ctx) {
  const fb = GRADE_FIREBASE[ctx.grade];
  const payload = {
    soruId: kayit.soruId,
    soruMetni: kayit.prompt,
    secenekler: kayit.options || [],
    dogruIndex: kayit.correctIndex ?? 0,
    dogruCevap: kayit.correctAnswer,
    kullaniciCevabi: kayit.userAnswer,
    dogruMu: kayit.ok,
    bildirimTipi: kategoriKod,
    kullaniciNotu: (kullaniciNotu || '').trim(),
    userId: null,
    misafir: true,
    uygulama: fb?.uygulama ? `${fb.uygulama}-web` : 'ingilizce-web',
    platform: 'web',
    olusturma: new Date().toISOString(),
  };
  if (kayit.uniteNo != null) payload.uniteNo = kayit.uniteNo;
  if (kayit.testId) payload.testId = kayit.testId;
  if (kayit.image) payload.image = kayit.image;
  if (kayit.imageUrl) payload.gorselAssetYolu = kayit.imageUrl;
  if (kayit.kategori) payload.soruKategori = kayit.kategori;
  return payload;
}

/**
 * @param {number} grade
 * @param {object} payload
 */
export async function submitSoruBildirim(grade, payload) {
  const fb = GRADE_FIREBASE[grade];
  if (!fb?.rtdbUrl) return false;
  try {
    const res = await fetch(`${fb.rtdbUrl}/soruBildirimleri.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {object} q normalized question or partial
 * @param {object} ctx
 */
export function buildAnswerRecord(q, answer, ctx) {
  return {
    no: answer.no,
    soruId: q.id || makeSoruId(ctx, answer.no),
    prompt: answer.prompt,
    imageUrl: answer.imageUrl ?? q.imageUrl ?? null,
    image: q.image ?? null,
    userAnswer: answer.userAnswer,
    correctAnswer: answer.correctAnswer,
    ok: answer.ok,
    options: q.options || [],
    correctIndex: q.correctIndex ?? 0,
    kategori: q.kategori || q.type || '',
    uniteNo: ctx.uniteNo,
    testId: ctx.testId || '',
  };
}

export function mailtoFallback(kayit, kategoriKod, ctx) {
  const kat = SORU_BILDIRIM_KATEGORILER.find((k) => k.kod === kategoriKod)?.etiket || kategoriKod;
  const subject = encodeURIComponent(
    `Hatalı soru · ${ctx.grade}. sınıf · Ünite ${ctx.uniteNo}`,
  );
  const body = encodeURIComponent(
    `Sorun türü: ${kat}\nSınıf: ${ctx.grade}\nÜnite: ${ctx.uniteNo}\nTest: ${ctx.testId || '—'}\nSoru no: ${kayit.no}\nSoru: ${kayit.prompt}\nDoğru cevap: ${kayit.correctAnswer}\nKullanıcı cevabı: ${kayit.userAnswer}\n\nNot:\n`,
  );
  return `mailto:kozmosoft01@gmail.com?subject=${subject}&body=${body}`;
}
