/**
 * Firebase Remote Config → public/data/{grade}/calisma-kagitlari.json + ders-videolari.json
 *
 * Kullanım:
 *   npm run sync:remote -- 2
 *   npm run sync:remote -- 3
 *   npm run sync:remote -- 4
 *   npm run sync:remote -- 5
 *   npm run sync:remote -- 6
 *   npm run sync:remote -- 7
 *   npm run sync:remote -- 8
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PROJECTS = {
  2: {
    projectNumber: '608022042439',
    apiKey: 'AIzaSyCFmr0C8pFiEHibB7zUwitt5H8E_Y1a1vA',
    appId: '1:608022042439:android:5d3c528ca943743b291e62',
    packageName: 'com.kozmosoft.ingilizce2',
  },
  3: {
    projectNumber: '377659550973',
    apiKey: 'AIzaSyDZpUKr0RtaxoqdYWsHNo3vc9RS859yMgw',
    appId: '1:377659550973:android:6e92417a43227cadc4e294',
    packageName: 'com.kozmosoft.ingilizce3',
  },
  4: {
    projectNumber: '145819808779',
    apiKey: 'AIzaSyAQJgFokIdjY0EleGhcqspv49Q1CXjc7sg',
    appId: '1:145819808779:android:f1092dfd50b1263010830e',
    packageName: 'com.kozmosoft.ingilizce4',
  },
  5: {
    projectNumber: '269744862056',
    apiKey: 'AIzaSyAe-RHjI8tGgA9DAIbEAXTDs_PQz9QHU6E',
    appId: '1:269744862056:android:c14c9bea71b3cae60edcdd',
    packageName: 'meb.words',
  },
  6: {
    projectNumber: '16359900706',
    apiKey: 'AIzaSyCot5ClfeB5xCUiThl_WnLmA5k2HpgiyQI',
    appId: '1:16359900706:android:1501c1f30a0e8c1f02ec7b',
    packageName: 'com.meb.english_wordwall6',
  },
  7: {
    projectNumber: '848360545793',
    apiKey: 'AIzaSyAhEBziF0Bxt8bypVKD0DIw7he-1kyA-Ug',
    appId: '1:848360545793:android:134536ffda9091e940aa00',
    packageName: 'com.kozmosoft.ingilizce7',
  },
  8: {
    projectNumber: '982161661375',
    apiKey: 'AIzaSyBWB-Sbxn38_c_t7QI8wSuoeVXG2UnRVOc',
    appId: '1:982161661375:android:966585dadf172b98e6950a',
    packageName: 'meb.english_8',
  },
};

function parseMap(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    let decoded = JSON.parse(raw);
    if (typeof decoded === 'string') decoded = JSON.parse(decoded);
    if (!decoded || typeof decoded !== 'object') return {};
    const out = {};
    for (const [key, value] of Object.entries(decoded)) {
      const no = String(key).replace(/^unite-/i, '').trim();
      const url = String(value ?? '').trim();
      if (/^\d+$/.test(no) && url) out[no] = url;
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchRemoteConfig(cfg) {
  const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${cfg.projectNumber}/namespaces/firebase:fetch?key=${cfg.apiKey}`;
  const body = {
    appId: cfg.appId,
    appInstanceId: `tahta-sync-${Date.now().toString(36)}`,
    languageCode: 'tr',
    platformVersion: '33',
    timeZone: 'Europe/Istanbul',
    appVersion: '1.0.0',
    packageName: cfg.packageName,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Remote Config HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const grade = Number(process.argv[2] || 5);
  const cfg = PROJECTS[grade];
  if (!cfg) {
    console.error(`Desteklenmeyen sınıf: ${grade}. Kullanım: npm run sync:remote -- 2|3|4|5|6|7|8`);
    process.exit(1);
  }

  const outDir = join(ROOT, 'public', 'data', String(grade));
  const data = await fetchRemoteConfig(cfg);
  const entries = data.entries || {};
  const calisma = parseMap(entries.calisma_kagitlari);
  const videolar = parseMap(entries.ders_videolari);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'calisma-kagitlari.json'), `${JSON.stringify(calisma, null, 2)}\n`, 'utf8');
  await writeFile(join(outDir, 'ders-videolari.json'), `${JSON.stringify(videolar, null, 2)}\n`, 'utf8');

  console.log(`[${grade}. sınıf] Çalışma kağıdı: ${Object.keys(calisma).length} ünite`);
  console.log(`[${grade}. sınıf] Ders videosu: ${Object.keys(videolar).length} ünite`);
  console.log(`Yazıldı → public/data/${grade}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
