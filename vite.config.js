import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ADSENSE_CLIENT, GOOGLE_SITE_VERIFICATION } from './src/site-config.js';

const pages = [
  'index',
  'sinif',
  'unite',
  'test',
  'etkinlik',
  'yolculuk',
  'yarismalar',
  'yaris',
  'turnuva',
  'kaynaklar',
  'mobil',
  'rehber',
  'rehber-2',
  'rehber-3',
  'rehber-4',
  'rehber-5',
  'rehber-6',
  'rehber-7',
  'rehber-8',
  'hakkinda',
  'iletisim',
  'gizlilik',
];

export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  plugins: [
    {
      name: 'inject-theme-init',
      transformIndexHtml(html) {
        let out = html;
        if (!out.includes('theme-init.js')) {
          out = out.replace('<head>', '<head>\n    <script src="/theme-init.js"></script>');
        }
        if (
          ADSENSE_CLIENT &&
          !ADSENSE_CLIENT.includes('XXXX') &&
          !out.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')
        ) {
          out = out.replace(
            '<head>',
            `<head>\n    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`,
          );
        }
        if (GOOGLE_SITE_VERIFICATION && !out.includes('google-site-verification')) {
          out = out.replace(
            '<meta charset="UTF-8" />',
            `<meta charset="UTF-8" />\n    <meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />`,
          );
        }
        return out;
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'sounds/**/*.mp3', 'theme-init.js'],
      manifest: {
        name: 'Ders İngilizce — Sınıf Tahtası',
        short_name: 'Ders İngilizce',
        description: '2–8. sınıf İngilizce: test, quiz, oyun, yarışma ve turnuva.',
        theme_color: '#4c1d95',
        background_color: '#140832',
        display: 'standalone',
        lang: 'tr',
        start_url: '/',
        icons: [
          {
            src: '/logo-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,mp3,json,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /\/data\/\d+\/.+\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'unit-data',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((name) => [name, resolve(__dirname, `${name}.html`)])),
    },
  },
});
