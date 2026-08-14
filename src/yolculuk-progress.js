/** Öğrenme yolculuğu — uygulama ile aynı adımlar, ilerleme localStorage'da. */

export const GECME_BARAJI = 5;

export const ADIM = {
  calismaKagidi: 'test-1',
  dersVideo: 'ders-video',
  bilgiKartlari: 'bilgi-kartlari',
  kelimeEslestirme: 'kelime-eslestirme',
  hafiza: 'hafiza-karti',
  ucanBalon: 'ucan-balon',
  dogruYanlis: 'dogru-yanlis-kelime',
  hizliDokun: 'hizli-dokun',
  dusen: 'dusen-kelimeler',
  kelimeTesti: 'kelime-testi',
  quiz: 'quiz',
};

const OYUN_ADIMLARI = [
  ADIM.hafiza,
  ADIM.ucanBalon,
  ADIM.dogruYanlis,
  ADIM.hizliDokun,
  ADIM.dusen,
];

/** Yolculuk adım id → web etkinlik mode / URL türü */
export const ADIM_META = {
  [ADIM.calismaKagidi]: {
    title: 'Çalışma Kağıdı',
    kind: 'manual',
    icon: 'doc',
    resource: 'calisma',
    hint: 'PDF’yi incele, bitince tamamla.',
  },
  [ADIM.dersVideo]: {
    title: 'Ders Videosu',
    kind: 'manual',
    icon: 'video',
    resource: 'video',
    hint: 'Videoyu izle, bitince tamamla.',
  },
  [ADIM.bilgiKartlari]: {
    title: 'Bilgi Kartları',
    kind: 'etkinlik',
    mode: 'bilgi',
    icon: 'cards',
  },
  [ADIM.kelimeEslestirme]: {
    title: 'Kelime Eşleştirme',
    kind: 'etkinlik',
    mode: 'eslestirme',
    icon: 'match',
  },
  [ADIM.hafiza]: {
    title: 'Hafıza Kartı',
    kind: 'etkinlik',
    mode: 'hafiza',
    icon: 'brain',
  },
  [ADIM.ucanBalon]: {
    title: 'Uçan Balon',
    kind: 'etkinlik',
    mode: 'ucan-balon',
    icon: 'balloon',
  },
  [ADIM.dogruYanlis]: {
    title: 'Doğru mu Yanlış mı?',
    kind: 'etkinlik',
    mode: 'dogru-yanlis',
    icon: 'flash',
  },
  [ADIM.hizliDokun]: {
    title: 'Hızlı Dokun',
    kind: 'etkinlik',
    mode: 'hizli-dokun',
    icon: 'tap',
  },
  [ADIM.dusen]: {
    title: 'Düşen Kelimeler',
    kind: 'etkinlik',
    mode: 'dusen',
    icon: 'fall',
  },
  [ADIM.kelimeTesti]: {
    title: 'Kelime Testi',
    kind: 'test',
    type: 'kelime',
    icon: 'spell',
  },
  [ADIM.quiz]: {
    title: 'Quiz',
    kind: 'test',
    type: 'quiz',
    icon: 'quiz',
  },
};

export function yolculukAdimIdleri() {
  return [
    ADIM.calismaKagidi,
    ADIM.dersVideo,
    ADIM.bilgiKartlari,
    ADIM.kelimeEslestirme,
    ...OYUN_ADIMLARI,
    ADIM.kelimeTesti,
    ADIM.quiz,
  ];
}

export function adimAdi(testId) {
  return ADIM_META[testId]?.title || 'Adım';
}

export function oncekiAdimAdi(testId, adimlar) {
  const index = adimlar.findIndex((a) => a.testId === testId);
  if (index <= 0) return '';
  return adimAdi(adimlar[index - 1].testId);
}

export function kilitMesaji(testId, adimlar) {
  const onceki = oncekiAdimAdi(testId, adimlar);
  if (!onceki) return 'Bu adım şu an kilitli.';
  if (OYUN_ADIMLARI.includes(adimlar[adimlar.findIndex((a) => a.testId === testId) - 1]?.testId)) {
    return `Önce ${onceki} oyununu tamamlayın.`;
  }
  return `Önce ${onceki}'yi tamamlayın.`;
}

function storageKey(grade) {
  return `yolculuk_progress_${grade}`;
}

function readAll(grade) {
  try {
    const raw = localStorage.getItem(storageKey(grade));
    if (!raw) return {};
    const decoded = JSON.parse(raw);
    return decoded && typeof decoded === 'object' ? decoded : {};
  } catch {
    return {};
  }
}

function writeAll(grade, map) {
  localStorage.setItem(storageKey(grade), JSON.stringify(map));
}

export function uniteSonuclariGetir(grade, uniteNo) {
  const map = readAll(grade);
  const unite = map[`unite-${uniteNo}`];
  if (!unite || typeof unite !== 'object') return {};
  const out = {};
  for (const [testId, v] of Object.entries(unite)) {
    if (!v || typeof v !== 'object') continue;
    out[testId] = {
      dogru: Number(v.dogru) || 0,
      yanlis: Number(v.yanlis) || 0,
    };
  }
  return out;
}

export function testGectiMi(sonuc) {
  return Boolean(sonuc && sonuc.dogru >= GECME_BARAJI);
}

export function testTamamlandiIsaretle(grade, uniteNo, testId, dogru, yanlis = 0) {
  const map = readAll(grade);
  const key = `unite-${uniteNo}`;
  const unite = { ...(map[key] && typeof map[key] === 'object' ? map[key] : {}) };
  unite[testId] = { dogru: Number(dogru) || 0, yanlis: Number(yanlis) || 0 };
  map[key] = unite;
  writeAll(grade, map);
}

export function adimiGec(grade, uniteNo, testId) {
  testTamamlandiIsaretle(grade, uniteNo, testId, GECME_BARAJI, 0);
}

/** @typedef {'kilitli'|'aktif'|'tamamlandi'|'basarisiz'} YolculukDurum */

/**
 * @param {number} grade
 * @param {{ no:number, name:string }[]} uniteler
 */
export function yolculukVerisiOlustur(grade, uniteler) {
  const adimIds = yolculukAdimIdleri();
  let globalNo = 0;
  let toplamTamamlanan = 0;
  let toplam = 0;
  let aktifTest = null;

  const unitelerOut = uniteler.map((u) => {
    const sonuclar = uniteSonuclariGetir(grade, u.no);
    const baslangic = globalNo + 1;
    const testler = [];
    let uniteTamamlanan = 0;

    for (let i = 0; i < adimIds.length; i += 1) {
      globalNo += 1;
      const testId = adimIds[i];
      const sonuc = sonuclar[testId];
      const gecti = testGectiMi(sonuc);
      const denendi = Boolean(sonuc);
      const acik = true;

      /** @type {YolculukDurum} */
      let durum = 'aktif';
      if (gecti) {
        durum = 'tamamlandi';
        uniteTamamlanan += 1;
      } else if (denendi) durum = 'basarisiz';
      else durum = 'aktif';

      const test = {
        uniteNo: u.no,
        testId,
        testNo: i + 1,
        globalNo,
        durum,
        acik,
      };
      testler.push(test);
      if (!aktifTest && durum !== 'tamamlandi') aktifTest = test;
    }

    toplamTamamlanan += uniteTamamlanan;
    toplam += adimIds.length;

    return {
      uniteNo: u.no,
      uniteAdi: u.name,
      testler,
      tamamlanan: uniteTamamlanan,
      toplam: adimIds.length,
      baslangicBolumNo: baslangic,
      bitisBolumNo: globalNo,
    };
  });

  return {
    uniteler: unitelerOut,
    tamamlanan: toplamTamamlanan,
    toplam,
    aktifTest,
  };
}

export function yolculukHref(grade, uniteNo) {
  return `/yolculuk.html?g=${grade}&unite=${uniteNo}`;
}

export function adimHref(grade, uniteNo, testId) {
  const meta = ADIM_META[testId];
  if (!meta) return yolculukHref(grade, uniteNo);
  if (meta.kind === 'manual') {
    return `${yolculukHref(grade, uniteNo)}&adim=${encodeURIComponent(testId)}`;
  }
  if (meta.kind === 'etkinlik') {
    return `/etkinlik.html?g=${grade}&mode=${encodeURIComponent(meta.mode)}&unite=${uniteNo}&yolculuk=1&adim=${encodeURIComponent(testId)}`;
  }
  if (meta.kind === 'test') {
    return `/test.html?g=${grade}&type=${meta.type}&unite=${uniteNo}&yolculuk=1&adim=${encodeURIComponent(testId)}&n=10`;
  }
  return yolculukHref(grade, uniteNo);
}
