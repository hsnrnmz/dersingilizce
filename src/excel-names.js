import * as XLSX from 'xlsx';

const HEADER_HINTS =
  /^(\s*(no|numara|num|sıra|sira|#|isim|ad|adı|adi|soyad|name|öğrenci|ogrenci|student|students)\s*)$/i;

function cellText(cell) {
  if (cell == null || cell === '') return '';
  return String(cell).trim();
}

function looksLikeHeader(text) {
  return HEADER_HINTS.test(text);
}

/** @param {unknown[][]} rows */
function namesFromRows(rows) {
  if (!rows.length) return [];

  let startRow = 0;
  const headerCells = (rows[0] || []).map(cellText).filter(Boolean);
  if (headerCells.some(looksLikeHeader)) startRow = 1;

  const colCount = Math.max(0, ...rows.map((row) => (Array.isArray(row) ? row.length : 0)));
  let nameCol = 0;
  let bestScore = -1;

  for (let col = 0; col < colCount; col += 1) {
    let score = 0;
    for (let row = startRow; row < rows.length; row += 1) {
      const text = cellText(rows[row]?.[col]);
      if (!text || /^\d+$/.test(text)) continue;
      if (looksLikeHeader(text)) continue;
      score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      nameCol = col;
    }
  }

  const names = [];
  for (let row = startRow; row < rows.length; row += 1) {
    const text = cellText(rows[row]?.[nameCol]);
    if (!text || /^\d+$/.test(text)) continue;
    if (looksLikeHeader(text)) continue;
    names.push(text.slice(0, 24));
  }

  return names;
}

/** @param {ArrayBuffer} buffer */
export function namesFromExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = /** @type {unknown[][]} */ (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }));
  return namesFromRows(rows);
}
