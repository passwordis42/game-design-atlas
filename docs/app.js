import { phases, weeks, prerequisites } from './data/curriculum.js';
import { buildGraph, phaseColors, weekLabel } from './graph.js';
import { cleanRecords, downloadFile, emptyRecord, readRecords, verificationReady, writeRecords } from './records.js';
import { mountCoach } from './coach.js';

const el = (id) => document.getElementById(id);
const esc = (value) => String(value).replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let records = readRecords();
let selected = 1;
let activeView = '';
let zoom = 100;
let announcementTimer;

function showNotice(message) {
  clearTimeout(announcementTimer);
  const announcement = el('announcement');
  announcement.textContent = message;
  announcement.hidden = false;
  announcementTimer = setTimeout(() => { announcement.hidden = true; }, 4500);
}

function syncProgress() {
  const completed = new Set(weeks.filter(({ id }) => records[id]?.complete).map(({ id }) => id));
  el('progress-count').textContent = `${completed.size} / ${weeks.length}`;
  el('progress-fill').style.width = `${completed.size / weeks.length * 100}%`;
  updateGraph(selected, completed);
}

function saveWeek(id, record) {
  records[id] = record;
  if (!writeRecords(records)) showNotice('浏览器无法保存。可在页脚导出本次记录。');
  syncProgress();
}

function select(view, id = selected) {
  const target = `#${view}/${weekLabel(id)}`;
  if (location.hash === target) return;
  location.hash = target;
}

const updateGraph = buildGraph(el('graph-canvas'), (id) => select('graph', id));

function section(label, text, style) {
  return `<div class="${style}"><h3>${label}</h3><p>${esc(text)}</p></div>`;
}

function relationsFor(week, view) {
  const incoming = prerequisites.filter(([, to]) => to === week.id).map(([from]) => from);
  const outgoing = prerequisites.filter(([from]) => from === week.id).map(([, to]) => to);
  if (!incoming.length && !outgoing.length) return '';
  function links(ids, label) {
    if (!ids.length) return '';
    const count = view === 'graph' ? 4 : ids.length;
    return `<div class="relations" aria-label="${label}">${ids.slice(0, count).map((id) => `<a class="relation" href="#${view}/${weekLabel(id)}" title="${esc(weeks[id - 1].title)}">${label} ${weekLabel(id)}</a>`).join('')}${ids.length > count ? `<a class="relation" href="#plan/${weekLabel(week.id)}">另 ${ids.length - count} 项</a>` : ''}</div>`;
  }
  return `${links(incoming, '先修')}${links(outgoing, '后续')}`;
}

function renderPreview(week) {
  el('preview').innerHTML = `
    <span class="week-stamp">周 ${weekLabel(week.id)}</span>
    <h2>${esc(week.title)}</h2>
    ${section('学习要点', week.concept, 'preview-block')}
    ${section('动手练习', week.exercise, 'preview-block')}
    ${section('验收标准', week.acceptance, 'preview-block')}
    ${relationsFor(week, 'graph')}
    <div class="preview-bottom"></div>
    <a class="primary-button" href="#plan/${weekLabel(week.id)}">${records[week.id]?.complete ? '回看课程' : '开始学习'} <span aria-hidden="true">↗</span></a>`;
}

function renderIndex() {
  const filter = el('search-weeks').value.trim().toLowerCase();
  const matches = weeks.filter((week) => [week.id, weekLabel(week.id), week.title, week.concept, week.exercise].some((value) => String(value).toLowerCase().includes(filter)));
  el('week-list').innerHTML = phases.map((phase) => {
    const group = matches.filter((week) => week.phase === phase.id);
    if (!group.length) return '';
    return `<div class="index-phase"><h3>${esc(phase.title)}</h3>${group.map((week) => `<a class="index-week" ${week.id === selected ? 'aria-current="page"' : ''} href="#plan/${weekLabel(week.id)}"><small>${weekLabel(week.id)}</small>${esc(week.title)}${records[week.id]?.complete ? '<span class="completed-mark" aria-label="已完成">✓</span>' : ''}</a>`).join('')}</div>`;
  }).join('') || '<p class="quiet index-phase">找不到匹配的课程。</p>';
}

function renderLesson(week) {
  const progress = records[week.id] ?? emptyRecord();
  const previous = weeks[week.id - 2];
  const next = weeks[week.id];
  el('lesson').innerHTML = `
    <span class="week-stamp">周 ${weekLabel(week.id)}</span>
    <h2 tabindex="-1">${esc(week.title)}</h2>
    ${section('学习要点', week.concept, 'lesson-block')}
    ${section('动手练习', week.exercise, 'lesson-block')}
    ${section('验收标准', week.acceptance, 'lesson-block')}
    ${section('本周证据', week.evidence, 'lesson-block')}
    <div class="lesson-block"><h3>学习资料</h3><ul class="resource-list">${week.resources.map(({ title, url }) => `<li><a href="${esc(url)}" rel="noopener noreferrer" target="_blank">${esc(title)} ↗</a></li>`).join('')}</ul></div>
    <div class="lesson-block"><h3>图谱关系</h3>${relationsFor(week, 'plan')}</div>
    <div class="lesson-actions"><a class="primary-button" href="#coach/${weekLabel(week.id)}">${progress.locked ? '查看设计检查点' : '记录自己的设计与证据'}</a><button type="button" class="outline-button" id="finish-week">${progress.complete ? '✓ 已完成 · 取消' : '标记本周完成'}</button></div>
    <div class="prev-next">${previous ? `<a href="#plan/${weekLabel(previous.id)}">← ${esc(previous.title)}</a>` : '<span></span>'}${next ? `<a href="#plan/${weekLabel(next.id)}">${esc(next.title)} →</a>` : '<a href="#graph">返回图谱 ↗</a>'}</div>`;
  el('finish-week').addEventListener('click', () => {
    if (!progress.locked || !verificationReady(progress)) {
      select('coach', week.id);
      showNotice('先保存设计检查点，再记录你亲自完成的验收。');
      return;
    }
    saveWeek(week.id, { ...progress, complete: !progress.complete });
    renderIndex();
    renderLesson(week);
    el('finish-week').focus();
    showNotice(!progress.complete ? '本周已标记完成。' : '本周已改为进行中。');
  });
}

function renderRoute() {
  el('map-legend').innerHTML = phases.map((phase, i) => `<span style="--stage-color:${phaseColors[i]}"><i aria-hidden="true"></i>${esc(phase.title)}</span>`).join('');
  el('phase-route').innerHTML = phases.map((phase) => {
    const matching = weeks.filter((week) => week.phase === phase.id);
    const first = weekLabel(matching[0].id);
    const last = weekLabel(matching.at(-1).id);
    return `<a class="route-row" href="#plan/${first}"><span class="route-time">周 ${first}–${last}</span><strong>${esc(phase.title)}</strong><span class="route-subtitle">${esc(phase.description)}</span><span aria-hidden="true">→</span></a>`;
  }).join('');
}

function navigate() {
  const [path, id] = location.hash.slice(1).split('/');
  if (path === 'main') return;
  const view = ['graph', 'plan', 'coach'].includes(path) ? path : 'graph';
  const week = weeks.find((item) => item.id === Number(id)) ?? weeks[selected - 1];
  const changedView = view !== activeView;
  activeView = view;
  selected = week.id;

  for (const name of ['graph', 'plan', 'coach']) {
    el(`${name}-view`).hidden = name !== view;
    const link = document.querySelector(`[data-nav="${name}"]`);
    if (name === view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  syncProgress();
  if (view === 'graph') renderPreview(week);
  if (view === 'plan') { renderIndex(); renderLesson(week); }
  if (view === 'coach') {
    mountCoach(el('coach-content'), week, records[week.id] ?? emptyRecord(), {
      save: (record) => saveWeek(week.id, record),
      notice: showNotice,
      selectWeek: (newWeek) => select('coach', newWeek),
      esc
    });
  }
  if (changedView) window.scrollTo(0, 0);
  if (!changedView && view === 'plan' && document.activeElement?.closest('#week-list, .prev-next')) {
    el('lesson').querySelector('h2').focus();
  }
}

function setZoom(value) {
  zoom = Math.max(75, Math.min(175, value));
  const graph = el('graph-canvas');
  graph.style.width = `${zoom}%`;
  graph.style.minWidth = `${805 * zoom / 100}px`;
  el('zoom-reset').textContent = `${zoom}%`;
  el('zoom-out').disabled = zoom === 75;
  el('zoom-in').disabled = zoom === 175;
}

renderRoute();
el('zoom-in').addEventListener('click', () => setZoom(zoom + 25));
el('zoom-out').addEventListener('click', () => setZoom(zoom - 25));
el('zoom-reset').addEventListener('click', () => { setZoom(100); el('graph-scroll').scrollTo(0, 0); });
el('search-weeks').addEventListener('input', renderIndex);
el('export-progress').addEventListener('click', () => downloadFile(JSON.stringify({ version: 1, records }, null, 2), 'game-design-progress.json', 'application/json'));
el('import-progress').addEventListener('click', () => el('progress-file').click());
el('progress-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 500000) throw new Error();
    const parsed = JSON.parse(await file.text());
    if (parsed?.version !== 1 || !parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)) throw new Error();
    const incoming = cleanRecords(parsed.records);
    let added = 0;
    for (const [id, record] of Object.entries(incoming)) {
      const existing = records[id];
      if (existing && (existing.draft || existing.rationale || existing.evidence || existing.complete)) continue;
      records[id] = record;
      added++;
    }
    const saved = writeRecords(records);
    navigate();
    showNotice(saved ? `导入 ${added} 周记录。已有记录已保留。` : '已读入本次会话。浏览器无法保存，请导出备份。');
  } catch { showNotice('无法读取此文件。请使用本网站导出的进度文件。'); }
});
window.addEventListener('hashchange', navigate);
navigate();
