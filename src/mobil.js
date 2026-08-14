import { bootSite } from './site-boot.js';
import { renderMobileAppsSection } from './mobile-apps.js';

bootSite();
const main = document.getElementById('mobil-main');
if (main) {
  main.innerHTML = renderMobileAppsSection({
    title: 'Mobil uygulamalarımız',
    lead: 'Her sınıf için ayrı uygulama — kelime, test, dinleme, oyun ve ilerleme takibi. Site ile aynı müfredat içeriği.',
    showDeveloperLink: true,
  });
}
