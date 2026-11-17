import { cleanStudy, hasStudy } from './study-progress.js';

const storageKey = 'game-design-atlas:learning:v1';
const fields = ['draft', 'rationale', 'evidence'];
const slotPattern = /^触发\s*[:：]\s*(.+?)\s*[;；]\s*条件\s*[:：]\s*(.+?)\s*[;；]\s*结果\s*[:：]\s*(.+?)\s*[;；]\s*例外\s*[:：]\s*(.+)$/u;
const unanswered = /(?:待定|未定|未填写|不知道|随便|AI\s*(?:决定|补齐|自行|补全)|尚未确认|TBD|TODO|\[空\]|[?？_]{2,}|…{2,})/iu;

export function cleanRecords(source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const result = {};
  for (let i = 1; i <= 28; i++) {
    const original = source[i];
    if (!original || typeof original !== 'object') continue;
    const record = Object.fromEntries(fields.map((field) => [field, typeof original[field] === 'string' ? original[field].slice(0, 4000) : '']));
    record.locked = original.locked === true && checkpointReady(record);
    record.verification = typeof original.verification === 'string' ? original.verification.slice(0, 4000) : '';
    record.complete = original.complete === true && record.locked && verificationReady(record);
    record.study = cleanStudy(original.study);
    result[i] = record;
  }
  return result;
}

export function readRecords() {
  try { return cleanRecords(JSON.parse(localStorage.getItem(storageKey))); }
  catch { return {}; }
}

export function writeRecords(records) {
  try { localStorage.setItem(storageKey, JSON.stringify(records)); return true; }
  catch { return false; }
}

export function emptyRecord() {
  return { draft: '', rationale: '', evidence: '', locked: false, verification: '', complete: false, study: cleanStudy() };
}

export function mergeWeek(existing, incoming) {
  if (!existing) return incoming;
  const existingProject = existing.draft || existing.rationale || existing.evidence || existing.verification || existing.complete;
  const incomingProject = incoming.draft || incoming.rationale || incoming.evidence || incoming.verification || incoming.complete;
  const existingStudy = hasStudy(existing.study);
  const incomingStudy = hasStudy(incoming.study);
  if ((!incomingProject || existingProject) && (!incomingStudy || existingStudy)) return existing;
  const study = incomingStudy && !existingStudy ? incoming.study : existing.study;
  return { ...(existingProject ? existing : incoming), study };
}

export function checkpointReady(record) {
  return fields.every((field) => meaningful(record[field]));
}

function meaningful(value) {
  return typeof value === 'string' && value.replace(/\s/gu, '').length >= 4 && /[\p{L}\p{N}]/u.test(value);
}

export const verificationReady = (record) => meaningful(record.verification);

export function ruledLines(draft) {
  return [...new Set(draft.split(/\r?\n/u).map((line) => line.trim().slice(0, 1501)).filter((line) => line.length <= 1500 && slotPattern.test(line)))];
}

export function completeRules(lines) {
  return lines.length > 0 && lines.length <= 12 && lines.every((line) => line.match(slotPattern)?.slice(1).every((slot, index) => {
    const value = slot.trim();
    return /[\p{L}\p{N}]/u.test(value) && !unanswered.test(value) && ((index === 1 || index === 3) || !/^(?:无|没有|不适用|N\/?A)$/iu.test(value));
  }));
}

export function downloadFile(value, filename, contentType) {
  const url = URL.createObjectURL(new Blob([value], { type: contentType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
