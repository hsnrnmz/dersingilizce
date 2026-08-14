/** Kelime testi / quiz tamamlama durumu (localStorage). */

function storageKey(grade) {
  return `tahta_tests_${grade}`;
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

function entryKey(type, uniteNo, testId) {
  return `${type}:unite-${uniteNo}:${testId}`;
}

/**
 * @param {number} grade
 * @param {'kelime'|'quiz'} type
 * @param {number} uniteNo
 * @param {string} testId
 * @param {number} dogru
 * @param {number} [yanlis]
 */
export function markTestSolved(grade, type, uniteNo, testId, dogru, yanlis = 0) {
  if (!grade || !type || !uniteNo || !testId) return;
  const map = readAll(grade);
  map[entryKey(type, uniteNo, testId)] = {
    dogru: Number(dogru) || 0,
    yanlis: Number(yanlis) || 0,
    at: Date.now(),
  };
  writeAll(grade, map);
}

/**
 * @param {number} grade
 * @param {'kelime'|'quiz'} type
 * @param {number} uniteNo
 * @param {string} testId
 */
export function isTestSolved(grade, type, uniteNo, testId) {
  const map = readAll(grade);
  return Boolean(map[entryKey(type, uniteNo, testId)]);
}

/**
 * @param {number} grade
 * @param {'kelime'|'quiz'} type
 * @param {number} uniteNo
 * @param {string[]} testIds
 */
export function countSolvedInUnit(grade, type, uniteNo, testIds) {
  return testIds.reduce((n, id) => n + (isTestSolved(grade, type, uniteNo, id) ? 1 : 0), 0);
}
