import { initNav } from './nav.js';
import { mountPageAdLayout } from './ad-layout.js';
import { initAdsense, mountAdSlot } from './adsense.js';

/**
 * Ortak site başlatıcı: menü, çerez banner, (izin varsa) reklam.
 * @param {{ adsTarget?: HTMLElement|null, adSlot?: string }} [opts]
 */
export function bootSite(opts = {}) {
  initNav();
  mountPageAdLayout();
  initAdsense();
  if (opts.adsTarget) {
    mountAdSlot(opts.adsTarget, { slot: opts.adSlot || '' });
  }
}
