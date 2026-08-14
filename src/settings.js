const SOUND_KEY = 'ingilizce-sound-on';
const CLASS_GRADE_KEY = 'ingilizce-class-grade';

export function isSoundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== 'off';
}

export function setSoundEnabled(on) {
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
}

export function getClassGrade() {
  const n = Number(localStorage.getItem(CLASS_GRADE_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setClassGrade(grade) {
  if (grade > 0) localStorage.setItem(CLASS_GRADE_KEY, String(grade));
}

export function clearClassGrade() {
  localStorage.removeItem(CLASS_GRADE_KEY);
}
