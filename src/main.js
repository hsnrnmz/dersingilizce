import { bootSite } from './site-boot.js';
import { isGradeReady } from './content.js';
import { getClassGrade, setClassGrade, clearClassGrade } from './settings.js';
import { renderMobileAppsSection } from './mobile-apps.js';

bootSite();

const savedGrade = getClassGrade();
if (savedGrade && isGradeReady(savedGrade)) {
  const main = document.querySelector('.home-shell main');
  if (main) {
    const banner = document.createElement('section');
    banner.className = 'class-mode-banner';
    banner.innerHTML = `
      <div class="class-mode-banner-inner">
        <p><strong>Sınıf modu:</strong> ${savedGrade}. sınıf seçili</p>
        <div class="class-mode-banner-actions">
          <a class="hizli-start-btn class-mode-go" href="/sinif.html?g=${savedGrade}">Derse devam et</a>
          <button type="button" class="home-cta-secondary" id="clear-class-mode">Sıfırla</button>
        </div>
      </div>`;
    main.prepend(banner);
    document.getElementById('clear-class-mode')?.addEventListener('click', () => {
      clearClassGrade();
      banner.remove();
    });
  }
}

const featuresSection = document.querySelector('.home-features');
if (featuresSection) {
  featuresSection.insertAdjacentHTML(
    'beforebegin',
    renderMobileAppsSection({
      lead: 'Evde tekrar için aynı içerikler — Google Play\'den ücretsiz indirin.',
    }),
  );
}

document.querySelectorAll('.grade-card').forEach((card) => {
  card.addEventListener('click', () => {
    const grade = Number(card.dataset.grade);
    if (isGradeReady(grade)) {
      setClassGrade(grade);
    }
  });
});
