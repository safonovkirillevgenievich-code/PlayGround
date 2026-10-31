/* Avto-M Driller HDD 2.0 — application, stages and UI */

import {
  CONTRACTS, ROLES, CANDIDATES, MIXES, SOILS, UTILITY_TYPES,
  DIFFICULTY, DIFFICULTY_COLOR, prepareContract, designDepthAt
} from './data.js';
import {
  clamp, lerp, fmtMoney, fmtCompact, fmtNum, fmtClock, fmtDur,
  initials, crewMembers, crewWages, defaultCrew, prepCost, xpLevel,
  xpProgress, esc, seeded
} from './util.js';
import { Renderer } from './render.js';
import { Sound } from './audio.js';

CONTRACTS.forEach(prepareContract);

const SAVE_KEY = 'avto-m-driller-hdd-2';
const STAGES = [
  { id: 'prep', label: 'Подготовка' },
  { id: 'pilot', label: 'Пилот' },
  { id: 'mud', label: 'Раствор' },
  { id: 'ream', label: 'Расширение' },
  { id: 'pull', label: 'Протяжка' }
];
const START_MONEY = 85000;

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.money !== 'number') return null;
    if (!s.crew) s.crew = defaultCrew();
    ROLES.forEach(r => {
      if (!s.crew[r.id] || !CANDIDATES[r.id].some(c => c.id === s.crew[r.id].id)) {
        s.crew[r.id] = { id: CANDIDATES[r.id][0].id, xp: 0 };
      }
    });
    return s;
  } catch { return null; }
}

const state = loadState() || {
  money: START_MONEY,
  shifts: 0,
  bestStars: 0,
  crew: defaultCrew(),
  sound: true,
  history: []
};

function saveState() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const $ = (id) => document.getElementById(id);
const heroRenderer = new Renderer($('hero-canvas'));
heroRenderer.demo = true;
const gameRenderer = new Renderer($('game-canvas'));
const sound = new Sound();
let screen = 'title';
let currentJob = null;
let crewReturn = 'title';
let heroDemo = null;
let heroT = 0;

function showScreen(name) {
  screen = name;
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  const el = $(`screen-${name}`);
  if (el) el.classList.add('active');
  if (name === 'title') {
    updateTitleStats();
    sound.stopEngine();
  }
  if (name === 'contracts') {
    renderContracts();
    sound.stopEngine();
  }
  if (name === 'crew') {
    renderCrew();
    sound.stopEngine();
  }
  if (name !== 'game') sound.stopEngine();
}

function updateMoneyUI() {
  const txt = fmtMoney(state.money);
  ['tm-money', 'contracts-money', 'crew-money'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = txt;
  });
  const wage = crewWages(state.crew);
  ['crew-wage', 'crew-total-wage'].forEach(id => {
    const el = $(id);
    if (el) el.textContent = fmtMoney(wage);
  });
}

function updateTitleStats() {
  updateMoneyUI();
  $('tm-shifts').textContent = state.shifts;
  $('tm-stars').textContent = state.bestStars ? '★'.repeat(state.bestStars) : '—';
}

function roleColor(id) {
  return ROLES.find(r => r.id === id)?.color || '#ffb15c';
}

function miniSvg(c) {
  const W = 200, H = 74, gy = 24;
  const sx = (W - 20) / c.length;
  const sy = 5.2;
  let path = '';
  for (let i = 0; i <= 20; i++) {
    const x = (c.length * i) / 20;
    const px = 10 + x * sx;
    const py = gy + designDepthAt(c, x) * sy;
    path += `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)} `;
  }
  let utils = '';
  c.utilities.forEach(u => {
    const x = 10 + u.x * sx, y = gy + u.depth * sy;
    utils += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${u.color}"/>`;
  });
  const band = Math.max(3, c.length * sx);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="sky${c.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d2230"/><stop offset="1" stop-color="#3d5357"/>
    </linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#sky${c.id})"/>
    <rect y="${gy}" width="${W}" height="${H - gy}" fill="#5b4a37"/>
    <rect y="${gy + 4}" width="${W}" height="9" fill="#6d563f"/>
    <rect y="${gy + 15}" width="${W}" height="13" fill="#8a7453"/>
    <rect y="${gy + 30}" width="${W}" height="20" fill="#4d4136"/>
    <path d="${path}" fill="none" stroke="#5ed6ff" stroke-width="1.4" stroke-dasharray="4 3" opacity=".85"/>
    <path d="${path}" fill="none" stroke="#ff7a1a" stroke-width="2.2" opacity=".9" stroke-dasharray="40 240"/>
    <line x1="10" y1="${gy}" x2="${10 + band}" y2="${gy}" stroke="#4a5a3a" stroke-width="2"/>
    ${utils}
    <rect x="${10 + c.length * sx - 3}" y="${gy - 5}" width="6" height="7" rx="1" fill="#ffb15c"/>
    <rect x="2" y="${gy - 13}" width="16" height="9" rx="1.5" fill="#d95a06"/>
    <rect x="5" y="${gy - 17}" width="5" height="5" rx="1" fill="#ff9a3d"/>
  </svg>`;
}

function renderContracts() {
  updateMoneyUI();
  const list = $('contract-list');
  list.innerHTML = CONTRACTS.map(c => `
    <button class="contract-card" data-contract="${c.id}">
      <div class="contract-main">
        <div class="contract-kicker">
          <span class="difficulty" style="background:${DIFFICULTY_COLOR[c.difficulty]}">${DIFFICULTY[c.difficulty]}</span>
          <span class="contract-code">${c.code}</span>
          <span class="muted">${esc(c.product)}</span>
        </div>
        <h3>${esc(c.title)}</h3>
        <div class="client">Заказчик · ${esc(c.client)}</div>
        <p class="contract-brief">${esc(c.brief)}</p>
        <div class="contract-tags">
          <span class="tag soil">${SOILS[c.soil].name}</span>
          <span class="tag">${c.utilities.length} коммуникации</span>
          <span class="tag">Ø${c.od} мм</span>
          <span class="tag">Проект ${c.length} м</span>
        </div>
      </div>
      <div class="contract-side">
        <div class="contract-visual">${miniSvg(c)}</div>
        <dl class="contract-metrics">
          <div><dt>Длина</dt><dd>${c.length} м</dd></div>
          <div><dt>Глубина</dt><dd>${fmtNum(c.maxDepth)} м</dd></div>
          <div><dt>Выход</dt><dd>${fmtNum(c.exitDepth)} м</dd></div>
          <div><dt>Смета</dt><dd>${fmtMoney(c.payout)}</dd></div>
        </dl>
        <div class="contract-pay"><b>${fmtMoney(c.payout)}</b><span>оплата</span></div>
      </div>
    </button>
  `).join('');
  renderCrewMini();
}

function renderCrewMini() {
  const crew = crewMembers(state.crew);
  const el = $('crew-mini');
  if (!el) return;
  el.innerHTML = ROLES.map(role => {
    const m = crew[role.id];
    return `<div class="crew-mini-row" style="--role-color:${role.color}">
      <div class="avatar" style="--role-color:${role.color}">${initials(m.name)}</div>
      <div class="who"><b>${esc(m.name)}</b><span>${role.short}</span></div>
      <span class="lvl">L${m.level}</span>
    </div>`;
  }).join('');
  $('crew-wage').textContent = fmtMoney(crewWages(state.crew));
  const tip = $('dispatch-tip');
  if (tip) {
    const weak = ROLES.find(r => crew[r.id].level < 2);
    tip.textContent = weak
      ? `${weak.short}: ${crew[weak.id].name.split(' ')[0]} пока без опыта. Первые объекты лучше брать на простом грунте.`
      : 'Сначала изучите архив коммуникаций. Неизвестная линия на трассе — самая дорогая ошибка машиниста.';
  }
}

function renderCrew() {
  updateMoneyUI();
  const crew = crewMembers(state.crew);
  const list = $('crew-list');
  list.innerHTML = ROLES.map(role => {
    const chosen = state.crew[role.id];
    const cards = CANDIDATES[role.id].map(c => {
      const sel = c.id === chosen.id;
      const lvl = xpLevel(chosen.xp || 0);
      const dots = Array.from({ length: 5 }, (_, i) => `<i class="${i < c.skill ? 'on' : ''}"></i>`).join('');
      return `<button class="candidate ${sel ? 'selected' : ''}" style="--role-color:${role.color}" data-role="${role.id}" data-cand="${c.id}">
        <div class="avatar" style="--role-color:${role.color}">${initials(c.name)}</div>
        <div class="who">
          <b>${esc(c.name)}</b>
          <div class="meta"><span>L${lvl}</span>${c.age ? `<span>${c.age} лет</span>` : ''}<span class="skill">${c.skill}/5 <span class="skill-dots">${dots}</span></span></div>
          ${c.character ? `<p class="char">${esc(c.character)}</p>` : ''}
          <p class="perk">${esc(c.perkText)}</p>
          <div class="salary">${fmtMoney(c.salary)} / смена</div>
        </div>
      </button>`;
    }).join('');
    return `<section class="crew-role" style="--role-color:${role.color}">
      <div class="role-head">
        <div class="role-icon">${role.icon}</div>
        <div><h3>${role.name}</h3><p>${role.desc}</p></div>
        <div class="role-desc">${chosen.xp ? `Опыт ${chosen.xp} XP · уровень ${crew[role.id].level}` : 'Новичок в бригаде'}</div>
      </div>
      <div class="candidates">${cards}</div>
    </section>`;
  }).join('');
  const total = ROLES.reduce((s, r) => s + crew[r.id].level, 0);
  $('crew-levels').textContent = total;
  $('crew-total-wage').textContent = fmtMoney(crewWages(state.crew));
  updateMoneyUI();
}

let toastTimer = 0;
function toast(text, type = '') {
  const layer = $('toast-layer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => { el.remove(); }, 3300);
  while (layer.children.length > 3) layer.firstChild.remove();
}

function openHelp() {
  $('help-overlay').classList.remove('hidden');
  sound.click();
}
function closeHelp() {
  $('help-overlay').classList.add('hidden');
}

function openSheet({ kicker, title, sub, options, onPick }) {
  const card = $('sheet-card');
  card.innerHTML = `
    <div class="modal-kicker"><p class="eyebrow">${esc(kicker)}</p>
      <button class="btn btn-icon" data-close style="width:34px;height:34px;min-height:0">×</button></div>
    <h2>${esc(title)}</h2>
    <p class="sub">${esc(sub)}</p>
    <div class="sheet-options">
      ${options.map(o => `<button class="sheet-option ${o.selected ? 'selected' : ''}" data-pick="${o.id}">
        ${o.best ? '<span class="best">рекомендуется</span>' : ''}
        <h4>${esc(o.name)}</h4>
        <div class="price">${o.price ? fmtMoney(o.price) : 'бесплатно'}</div>
        <p>${esc(o.desc)}</p>
      </button>`).join('')}
    </div>`;
  $('sheet-overlay').classList.remove('hidden');
  card.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const opt = options.find(o => o.id === btn.dataset.pick);
      $('sheet-overlay').classList.add('hidden');
      sound.click();
      onPick?.(opt);
    });
  });
  card.querySelector('[data-close]').addEventListener('click', () => {
    $('sheet-overlay').classList.add('hidden');
    sound.click();
  });
}

function closeAllOverlays() {
  ['pause-overlay', 'results-overlay', 'exit-confirm', 'help-overlay'].forEach(id => $(id)?.classList.add('hidden'));
  $('sheet-overlay')?.classList.add('hidden');
}

class Job {
  constructor(contract, crew) {
    this.contract = contract;
    this.crew = crew;
    this.prep = { scan: null, route: null, mud: null, reamer: null, safety: false };
    this.stage = 'prep';
    this.clock = 0;
    this.simT = 0;
    this.paused = false;
    this.drillPause = 0;
    this.head = { x: 0, d: contract.entryDepth, pitch: 0 };
    this.path = [];
    this.design = contract.design;
    this.utilities = contract.utilities.map(u => ({ ...u, revealed: false, detected: false, hit: false }));
    this.input = { up: false, down: false, feed: false, rot: true, auto: false, mudPulse: true };
    this.holds = { up: false, down: false, feed: false };
    this.fx = { scan: 0, frac: 0, fracX: null, shake: 0 };
    this.stageData = {};
    this.pressure = 42;
    this.wear = 0;
    this.fracRisk = 0;
    this.spentPrep = 0;
    this.extra = 0;
    this.penalties = 0;
    this.reamer = null;
    this.exitError = null;
    this.qualified = false;
    this.failed = false;
    this.finishReason = '';
    this.logItems = [];
    this.stats = {
      devMax: 0, devSum: 0, devSamples: 0, strikes: 0, fracOuts: 0, rodEvents: 0,
      mudQuality: 100, reamQuality: 100, pullQuality: 100, pilotQuality: 100,
      utilityQuality: 100, reamEvents: 0, pullEvents: 0, startX: 0
    };
  }

  begin() {
    this.setStage('prep');
    this.addLog('foreman', `Бригада на объекте ${this.contract.code}. Начинаем подготовку.`, '');
    this.addLog('locator', 'Проверяю архив и намечаю точки сканирования.', '');
    setTimeout(() => {
      if (currentJob === this) this.addLog('mud', 'Раствор и расширитель нужно выбрать до пилота.', '');
    }, 1600);
  }

  stageIndex() {
    if (this.stage === 'results') return STAGES.length;
    return STAGES.findIndex(s => s.id === this.stage);
  }

  activeRoles() {
    return {
      prep: ['foreman', 'locator'], pilot: ['operator', 'locator'], mud: ['mud', 'foreman'],
      ream: ['operator', 'mechanic'], pull: ['operator', 'foreman'], results: []
    }[this.stage] || [];
  }

  setStage(stage) {
    this.stage = stage;
    this.paused = false;
    this.drillPause = 0;
    this.input.feed = false;
    this.holds.feed = false;
    this.input.up = false;
    this.holds.up = false;
    this.input.down = false;
    this.holds.down = false;
    $('results-overlay').classList.add('hidden');
    $('pause-overlay').classList.add('hidden');
    this.renderStageTrack();
    this.renderCrewSide();
    this.buildDeck();
    this.buildHud();
    this.buildBars();
    this.updateHud();
    this.soundStage();
  }

  soundStage() {
    if (this.stage === 'pilot') sound.setEngine(0.25);
    else if (this.stage === 'ream' || this.stage === 'pull') sound.setEngine(0.15);
    else sound.stopEngine();
  }

  renderStageTrack() {
    const idx = this.stageIndex();
    $('stage-track').innerHTML = STAGES.map((s, i) =>
      `<div class="stage-chip ${i < idx ? 'done' : ''} ${i === idx ? 'active' : ''}"><i>${i < idx ? '✓' : i + 1}</i><span>${s.label}</span></div>`
    ).join('');
    $('job-title').textContent = this.contract.title;
    $('job-code').textContent = `${this.contract.code} · ${STAGES[idx]?.label || 'сдача'}`;
  }

  renderCrewSide() {
    const active = this.activeRoles();
    const html = ROLES.map(role => {
      const m = this.crew[role.id];
      const on = active.includes(role.id);
      return `<div class="crew-line ${on ? 'active' : ''}" style="--role-color:${role.color}">
        <div class="avatar" style="--role-color:${role.color}">${initials(m.name)}</div>
        <div class="who"><b>${esc(m.name)}</b><span>${role.short} · L${m.level}</span></div>
        <span class="state">${on ? 'работа' : 'готов'}</span>
      </div>`;
    }).join('');
    $('crew-side').innerHTML = html;
    $('mobile-crew').innerHTML = ROLES.map(role => {
      const on = active.includes(role.id);
      return `<span class="mc ${on ? 'active' : ''}" style="--role-color:${role.color}"><i></i>${role.short}</span>`;
    }).join('');
    $('crew-active-label').textContent = active.map(id => ROLES.find(r => r.id === id)?.short).join(' · ') || 'сдача';
  }

  addLog(roleId, text, type = '') {
    const role = ROLES.find(r => r.id === roleId);
    const m = roleId && this.crew[roleId];
    const speaker = m ? m.name.split(' ')[0] + ' ' + (m.name.split(' ')[1]?.[0] || '') + '.' : 'Диспетчер';
    const color = role?.color || '#ffb15c';
    const el = document.createElement('div');
    el.className = `log-item ${type}`;
    el.innerHTML = `<div class="meta"><b style="color:${color}">${esc(speaker)}</b><time>${fmtClock(this.clock)}</time></div>${esc(text)}`;
    const log = $('radio-log');
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 60) log.firstChild.remove();
    this.logItems.push(text);
  }

  update(dt, t) {
    if (this.paused || this.stage === 'results') return;
    this.clock += dt;
    this.simT += dt;
    this.fx.scan = Math.max(0, this.fx.scan - dt);
    this.fx.frac = Math.max(0, this.fx.frac - dt);
    this.fx.shake = Math.max(0, this.fx.shake - dt * 2.2);
    if (this.drillPause > 0) {
      this.drillPause -= dt;
      this.updateHud();
      return;
    }
    switch (this.stage) {
      case 'pilot': this.updatePilot(dt); break;
      case 'mud': this.updateMud(dt); break;
      case 'ream': this.updateReam(dt); break;
      case 'pull': this.updatePull(dt); break;
    }
    this.updateHud();
  }

  buildDeck() {
    const deck = $('deck');
    if (this.stage === 'prep') { this.renderPrepDeck(); return; }
    if (this.stage === 'pilot') { this.renderPilotDeck(); return; }
    if (this.stage === 'mud') { this.renderMudDeck(); return; }
    if (this.stage === 'ream') { this.renderReamDeck(); return; }
    if (this.stage === 'pull') { this.renderPullDeck(); return; }
    deck.innerHTML = `<div class="deck-inner"><div class="prep-head"><div><p class="eyebrow">Смена завершена</p><h2>Объект передан заказчику</h2></div></div></div>`;
  }

  prepStepData() {
    const p = this.prep;
    const mix = p.mud ? MIXES[p.mud] : null;
    return [
      { id: 'scan', icon: '◎', title: 'Коммуникации', done: !!p.scan, warn: p.scan === 'skip',
        value: !p.scan ? 'Не проверено' : p.scan === 'georadar' ? 'Георадар · все сети' : p.scan === 'docs' ? 'Архив · неполно' : 'Пропущено · риск',
        act: p.scan ? 'ИЗМЕНИТЬ' : 'СКАНИРОВАТЬ' },
      { id: 'route', icon: '⌁', title: 'Разметка трассы', done: !!p.route, warn: p.route === 'skip',
        value: !p.route ? 'Проект не нанесён' : p.route === 'laser' ? 'Лазер · допуск 0,4 м' : p.route === 'manual' ? 'Ручная · допуск 1,2 м' : 'Без разметки',
        act: p.route ? 'ИЗМЕНИТЬ' : 'РАЗМЕТИТЬ' },
      { id: 'mud', icon: '◈', title: 'Буровой раствор', done: !!p.mud, warn: p.mud === 'water',
        value: mix ? `${mix.name} · окно +${mix.window}` : 'Не выбран',
        act: p.mud ? 'ИЗМЕНИТЬ' : 'ВЫБРАТЬ' },
      { id: 'reamer', icon: '⌀', title: 'Расширитель', done: !!p.reamer, warn: false,
        value: p.reamer ? `${p.reamer.dia} мм · ${p.reamer.ratio.toFixed(2)}×` : 'Не подобран',
        act: p.reamer ? 'ИЗМЕНИТЬ' : 'ПОДОБРАТЬ' },
      { id: 'safety', icon: '⛨', title: 'Ограждение зоны', done: !!p.safety, warn: false,
        value: p.safety ? 'Зона ограждена' : 'Не ограждена',
        act: p.safety ? 'СНЯТЬ' : 'ОГРАДИТЬ' }
    ];
  }

  renderPrepDeck() {
    const steps = this.prepStepData();
    const ready = this.prep.scan && this.prep.route && this.prep.mud && this.prep.reamer;
    const cost = prepCost(this.prep);
    $('deck').innerHTML = `<div class="deck-inner">
      <div class="prep-head">
        <div><p class="eyebrow">Этап 1 · подготовка</p><h2>Подготовка объекта</h2>
          <div class="sub">${this.contract.code} · ${SOILS[this.contract.soil].name} · смета подготовки ${fmtMoney(cost)}</div></div>
        <button class="btn btn-primary" id="btn-start-pilot" ${ready ? '' : 'disabled'}>Начать пилотное бурение →</button>
      </div>
      <div class="prep-steps">
        ${steps.map((s, i) => `<button class="prep-step ${s.done ? 'done' : ''} ${s.warn ? 'warn' : ''}" data-step="${s.id}">
          <span class="n">${String(i + 1).padStart(2, '0')}</span>
          <span class="ico">${s.icon}</span>
          <span class="ttl">${s.title}</span>
          <span class="val">${s.value}</span>
          <span class="act">${s.act}</span>
        </button>`).join('')}
      </div>
      ${ready ? '' : `<div class="prep-warn">⚠ Для выхода на трассу выберите коммуникации, разметку, раствор и расширитель.</div>`}
    </div>`;

    $('deck').querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.click();
        const id = btn.dataset.step;
        if (id === 'safety') {
          this.prep.safety = !this.prep.safety;
          this.addLog('foreman', this.prep.safety ? 'Зона работ ограждена, посторонние не пройдут.' : 'Ограждение снято. Риск случайного доступа вырос.', this.prep.safety ? 'good' : 'alert');
          this.renderPrepDeck();
          this.updateHud();
          return;
        }
        this.openPrepSheet(id);
      });
    });
    const start = $('btn-start-pilot');
    if (start && ready) {
      start.addEventListener('click', () => this.startPilot());
    }
  }

  openPrepSheet(step) {
    const c = this.contract;
    if (step === 'scan') {
      this.openSheetData({
        kicker: 'Подготовка · сети', title: 'Проверка коммуникаций',
        sub: 'Полное сканирование снижает риск повреждения. Архив дешевле, но часть линий останется неизвестной.',
        options: [
          { id: 'georadar', name: 'Георадар', price: 1800, best: true, selected: this.prep.scan === 'georadar', desc: 'Все коммуникации с глубиной и охранной зоной. Локаторщик видит полную картину.' },
          { id: 'docs', name: 'Архивные схемы', price: 600, selected: this.prep.scan === 'docs', desc: 'Только документально подтверждённые сети. Неизвестные линии локатор найдёт по ходу.' },
          { id: 'skip', name: 'Не проверять', price: 0, selected: this.prep.scan === 'skip', desc: 'Экономия времени. Высокий риск ударить по кабелю или газу.' }
        ],
        onPick: (opt) => {
          this.prep.scan = opt.id;
          this.utilities.forEach(u => {
            u.revealed = opt.id === 'georadar' ? true : opt.id === 'docs' ? !!u.documented : false;
            u.detected = false;
          });
          if (opt.id !== 'skip') {
            this.fx.scan = 2.6;
            this.addLog('locator', opt.id === 'georadar' ? 'Георадар дал полную карту сетей. Глубины совпадают.' : 'Архив загружен. Неподтверждённые линии буду искать по сигналу.', '');
          } else {
            this.addLog('foreman', 'Проверку сетей пропустили. Работаем по факту.', 'alert');
          }
          this.renderPrepDeck();
        }
      });
    } else if (step === 'route') {
      this.openSheetData({
        kicker: 'Подготовка · трасса', title: 'Разметка проектной оси',
        sub: 'Разметка задаёт допуск выхода и отображение проекта в пилоте. Без неё машинист идёт по приборам.',
        options: [
          { id: 'laser', name: 'Лазерная разметка', price: 1200, best: true, selected: this.prep.route === 'laser', desc: 'Точный проект и допуск выхода 0,4 м. Лучший контроль траектории.' },
          { id: 'manual', name: 'Ручная разметка', price: 400, selected: this.prep.route === 'manual', desc: 'Проект нанесён, допуск выхода 1,2 м. Обычный вариант для смены.' },
          { id: 'skip', name: 'Без разметки', price: 0, selected: this.prep.route === 'skip', desc: 'Проект не отображается в пилоте. Работать придётся по глубине и локатору.' }
        ],
        onPick: (opt) => {
          this.prep.route = opt.id;
          this.addLog('foreman', opt.id === 'skip' ? 'Разметку не делаем — идём по локатору.' : opt.id === 'laser' ? 'Трасса выставлена лазером. Допуск минимальный.' : 'Трасса размечена вручную.', opt.id === 'skip' ? 'alert' : '');
          this.renderPrepDeck();
        }
      });
    } else if (step === 'mud') {
      this.openSheetData({
        kicker: 'Подготовка · раствор', title: 'Рецептура бурового раствора',
        sub: 'Раствор выносит шлам и держит стенку. Слишком слабый состав даёт узкое окно давления.',
        options: Object.values(MIXES).map(m => ({
          id: m.id, name: m.name, price: m.cost, selected: this.prep.mud === m.id,
          best: m.id === 'polymer' && (c.soil === 'gravel' || c.soil === 'rock'),
          desc: `${m.note} Окно давления ${m.window > 0 ? '+' : ''}${m.window}, вынос шлама ×${m.clean}.`
        })),
        onPick: (opt) => {
          this.prep.mud = opt.id;
          this.addLog('mud', `Замешиваю ${MIXES[opt.id].name.toLowerCase()}. Контроль давления — по манометру.`, '');
          this.renderPrepDeck();
        }
      });
    } else if (step === 'reamer') {
      this.openSheetData({
        kicker: 'Подготовка · инструмент', title: 'Выбор расширителя',
        sub: `Коммуникация Ø${c.od} мм. Расчётный диаметр — около 1,35× от диаметра трубы, с поправкой на грунт.`,
        options: c.reamers.map(r => ({
          id: r.id, name: `${r.name} · Ø${r.dia} мм`, price: r.cost,
          selected: this.prep.reamer?.id === r.id,
          best: r.ratio === 1.35,
          desc: `${r.hint} Отношение к трубе ${r.ratio.toFixed(2)}×.`
        })),
        onPick: (opt) => {
          this.prep.reamer = c.reamers.find(r => r.id === opt.id);
          this.addLog('mechanic', `Ставлю расширитель Ø${this.prep.reamer.dia} мм. Проверяю резьбу и тягу.`, '');
          this.renderPrepDeck();
        }
      });
    }
  }

  openSheetData(cfg) {
    openSheet(cfg);
  }

  startPilot() {
    const p = this.prep;
    if (!p.scan || !p.route || !p.mud || !p.reamer) return;
    const cost = prepCost(p);
    if (state.money < cost) {
      toast('Недостаточно средств на подготовку объекта', 'bad');
      return;
    }
    state.money -= cost;
    this.spentPrep = cost;
    saveState();
    updateMoneyUI();
    this.reamer = p.reamer;
    this.utilities.forEach(u => { u.hit = false; });
    this.head = { x: 0, d: this.design[0].d, pitch: 0 };
    this.path = [{ x: 0, d: this.head.d }];
    this.pressure = 44;
    this.wear = 0;
    this.fracRisk = 0;
    this.stats = { ...this.stats, devMax: 0, devSum: 0, devSamples: 0, strikes: 0, fracOuts: 0, rodEvents: 0 };
    this.setStage('pilot');
    this.addLog('operator', 'Подача и вращение под контролем. Начинаем пилотную скважину.', '');
    this.addLog('locator', 'Сигнал есть. Веди по проекту, я корректирую глубину.', 'good');
    if (p.route === 'skip') this.addLog('foreman', 'Проект не нанесён — ориентируемся по локатору.', 'alert');
    if (p.scan === 'skip') this.addLog('locator', 'Карты нет. Буду ловить сигнал по ходу.', 'alert');
    sound.ok();
  }

  buildHud() {
    const hud = $('stage-hud');
    this.hudRefs = {};
    if (this.stage === 'prep') {
      const c = this.contract;
      hud.innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip"><span>Объект</span><b>${c.length} <small>м</small></b></div>
          <div class="hud-chip"><span>Грунт</span><b style="font-size:12px">${SOILS[c.soil].short}</b></div>
          <div class="hud-chip"><span>Труба</span><b>Ø${c.od} <small>мм</small></b></div>
        </div>
        <div class="hud-objective"><b>Подготовка</b>Проверьте сети, нанесите проектные точки, выберите раствор и расширитель. Решения повлияют на всю смену.</div>`;
      return;
    }
    if (this.stage === 'pilot') {
      hud.innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip"><span>Глубина</span><b id="hud-depth">—</b></div>
          <div class="hud-chip"><span>Уклон</span><b id="hud-pitch">—</b></div>
          <div class="hud-chip"><span>Отклонение</span><b id="hud-dev">—</b></div>
        </div>
        <div class="hud-objective" id="pilot-objective"><b>Пилот · ${this.contract.length} м</b>Выход в точке ${fmtNum(this.contract.exitDepth)} м. Не заденьте коммуникации — охранная зона показана пунктиром.</div>`;
      this.hudRefs.depth = $('hud-depth');
      this.hudRefs.pitch = $('hud-pitch');
      this.hudRefs.dev = $('hud-dev');
      this.hudRefs.objective = $('pilot-objective');
      return;
    }
    if (this.stage === 'mud') {
      hud.innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip"><span>Давление</span><b id="hud-mpressure">—</b></div>
          <div class="hud-chip"><span>Очистка</span><b id="hud-cleaning">—</b></div>
          <div class="hud-chip"><span>Качество</span><b id="hud-quality">—</b></div>
        </div>
        <div class="hud-objective"><b>Промывка</b>Держите давление в зелёном окне. Верхняя граница — риск выхода раствора на поверхность.</div>`;
      this.hudRefs.pressure = $('hud-mpressure');
      this.hudRefs.cleaning = $('hud-cleaning');
      this.hudRefs.quality = $('hud-quality');
      return;
    }
    if (this.stage === 'ream' || this.stage === 'pull') {
      const isPull = this.stage === 'pull';
      hud.innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip"><span>${isPull ? 'Усилие' : 'Нагрузка'}</span><b id="hud-load">—</b></div>
          <div class="hud-chip"><span>Прогресс</span><b id="hud-progress">—</b></div>
          <div class="hud-chip"><span>Качество</span><b id="hud-quality">—</b></div>
        </div>
        <div class="hud-objective"><b>${isPull ? 'Протяжка трубы' : 'Расширение скважины'}</b>${isPull ? 'Тяните трубу короткими импульсами. Превышение усилия рвёт стенку или повреждает ПЭ-трубу.' : 'Расширитель идёт от выходного котлована к установке. Держите нагрузку ниже красной зоны.'}</div>`;
      this.hudRefs.load = $('hud-load');
      this.hudRefs.progress = $('hud-progress');
      this.hudRefs.quality = $('hud-quality');
    }
  }

  buildBars() {
    const bar = $('bar-stack');
    if (this.stage === 'prep' || this.stage === 'results') { bar.innerHTML = ''; return; }
    if (this.stage === 'pilot') {
      bar.innerHTML = `
        <div class="mini-bar"><div class="lbl"><span>Давление раствора</span><b id="bar-a-value">—</b></div>
          <div class="track pressure"><span class="safe" id="bar-a-safe"></span><i id="bar-a-fill" style="width:0%"></i></div></div>
        <div class="mini-bar"><div class="lbl"><span>Износ штанг</span><b id="bar-b-value">0%</b></div>
          <div class="track"><i id="bar-b-fill" style="width:0%;background:var(--yellow)"></i></div></div>
        <div class="mini-bar"><div class="lbl"><span>Проходка</span><b id="bar-c-value">0%</b></div>
          <div class="track"><i id="bar-c-fill" style="width:0%"></i></div></div>`;
    } else if (this.stage === 'mud') {
      bar.innerHTML = `
        <div class="mini-bar"><div class="lbl"><span>Давление</span><b id="bar-a-value">—</b></div>
          <div class="track pressure"><span class="safe" id="bar-a-safe"></span><i id="bar-a-fill" style="width:0%"></i></div></div>
        <div class="mini-bar"><div class="lbl"><span>Вынос шлама</span><b id="bar-b-value">0%</b></div>
          <div class="track"><i id="bar-b-fill" style="width:0%"></i></div></div>`;
    } else {
      bar.innerHTML = `
        <div class="mini-bar"><div class="lbl"><span>${this.stage === 'pull' ? 'Усилие' : 'Нагрузка'}</span><b id="bar-a-value">—</b></div>
          <div class="track pressure"><span class="safe" id="bar-a-safe"></span><i id="bar-a-fill" style="width:0%"></i></div></div>
        <div class="mini-bar"><div class="lbl"><span>Проход инструмента</span><b id="bar-b-value">0%</b></div>
          <div class="track"><i id="bar-b-fill" style="width:0%"></i></div></div>`;
    }
    this.barRefs = {
      aFill: $('bar-a-fill'), aSafe: $('bar-a-safe'), aValue: $('bar-a-value'),
      bFill: $('bar-b-fill'), bValue: $('bar-b-value'),
      cFill: $('bar-c-fill'), cValue: $('bar-c-value')
    };
  }

  pressureWindow() {
    const mix = MIXES[this.prep.mud] || MIXES.bentonite;
    const mud = this.crew.mud;
    return { low: 36, high: 64 + mix.window + mud.effective * 1.2 + (this.prep.safety ? 1 : 0) };
  }

  mudWindow() {
    const mix = MIXES[this.prep.mud] || MIXES.bentonite;
    const mud = this.crew.mud;
    const add = this.stageData.additive ? 9 : 0;
    return { low: 40, high: 62 + mix.window + mud.effective * 1.3 + add };
  }

  setText(el, txt) {
    if (el && el.textContent !== txt) el.textContent = txt;
  }

  setWarnings(list) {
    const key = list.map(w => w.text + (w.danger ? '!' : '')).join('|');
    if (key === this.lastWarnKey) return;
    this.lastWarnKey = key;
    $('warn-line').innerHTML = list.slice(0, 2).map(w =>
      `<div class="warning ${w.danger ? 'danger' : ''}">▲ ${esc(w.text)}</div>`).join('');
  }

  updateHud() {
    this.setText($('hud-spent'), fmtMoney(this.spentPrep + this.extra));
    this.setText($('hud-clock'), fmtClock(this.clock));
    if (this.stage === 'pilot') this.updatePilotHud();
    else if (this.stage === 'mud') this.updateMudHud();
    else if (this.stage === 'ream' || this.stage === 'pull') this.updateProcessHud();
    else this.setWarnings([]);
  }

  updatePilotHud() {
    const r = this.hudRefs;
    if (!r.depth) return;
    const c = this.contract;
    const loc = this.crew.locator;
    const noise = clamp(0.42 - loc.effective * 0.05, 0.08, 0.65) * (loc.mods.noise || 1);
    const depthRead = this.head.d + Math.sin(this.simT * 1.3) * noise + Math.sin(this.simT * 0.47 + 1.7) * noise * 0.55;
    const pitchRead = this.head.pitch + Math.sin(this.simT * 0.9 + 0.4) * noise * 3.2;
    const dev = this.head.d - designDepthAt(c, this.head.x);
    this.setText(r.depth, `${fmtNum(Math.max(0, depthRead), 1)} м`);
    this.setText(r.pitch, `${pitchRead > 0 ? '+' : ''}${Math.round(pitchRead)}°`);
    this.setText(r.dev, `${dev > 0 ? '+' : ''}${fmtNum(dev, 1)} м`);
    r.dev.parentElement.className = `hud-chip ${Math.abs(dev) > 1.05 ? 'bad' : Math.abs(dev) > 0.55 ? 'warn' : 'good'}`;

    const w = this.pressureWindow();
    const bw = this.barRefs;
    if (bw.aFill) {
      bw.aFill.style.width = `${clamp(this.pressure, 0, 100)}%`;
      bw.aSafe.style.left = `${w.low}%`;
      bw.aSafe.style.width = `${Math.max(4, w.high - w.low)}%`;
      this.setText(bw.aValue, `${Math.round(this.pressure)} бар`);
      this.setText(bw.bValue, `${Math.round(this.wear)}%`);
      bw.bFill.style.width = `${this.wear}%`;
      const prog = clamp(this.head.x / c.length * 100, 0, 100);
      this.setText(bw.cValue, `${Math.round(prog)}%`);
      bw.cFill.style.width = `${prog}%`;
    }

    const warnings = [];
    const ahead = this.utilities
      .filter(u => !u.hit && u.x > this.head.x - 1 && u.x - this.head.x < 12)
      .sort((a, b) => a.x - b.x)[0];
    if (this.input.rot && (this.input.up || this.input.down)) warnings.push({ text: 'Вращение включено — управление уклоном ослаблено' });
    if (Math.abs(dev) > 0.55) warnings.push({ text: `Отклонение от проекта ${fmtNum(Math.abs(dev), 1)} м`, danger: Math.abs(dev) > 1.2 });
    if (this.pressure > w.high) warnings.push({ text: 'Давление выше окна — риск выхода раствора', danger: true });
    if (ahead) {
      if (ahead.revealed || ahead.detected) {
        warnings.push({ text: `Через ${Math.max(0, Math.round(ahead.x - this.head.x))} м — ${ahead.label}, глубина ${fmtNum(ahead.depth, 1)} м`, danger: ahead.x - this.head.x < 5 });
      }
    }
    if (this.wear > 72) warnings.push({ text: `Износ штанг ${Math.round(this.wear)}% — снизьте подачу`, danger: this.wear > 90 });
    if (this.head.d < 1.0 && this.head.x > 6) warnings.push({ text: 'Опасно малая глубина: риск выхода на поверхность', danger: true });
    this.setWarnings(warnings);
  }

  updateMudHud() {
    const sd = this.stageData;
    const w = this.mudWindow();
    this.setText(this.hudRefs.pressure, `${Math.round(sd.pressure)} бар`);
    this.setText(this.hudRefs.cleaning, `${Math.round(sd.cleaning)}%`);
    this.setText(this.hudRefs.quality, `${Math.round(sd.quality)}%`);
    const bw = this.barRefs;
    if (bw.aFill) {
      bw.aFill.style.width = `${clamp(sd.pressure, 0, 100)}%`;
      bw.aSafe.style.left = `${w.low}%`;
      bw.aSafe.style.width = `${Math.max(4, w.high - w.low)}%`;
      this.setText(bw.aValue, `${Math.round(sd.pressure)} бар`);
      this.setText(bw.bValue, `${Math.round(sd.cleaning)}%`);
      bw.bFill.style.width = `${clamp(sd.cleaning, 0, 100)}%`;
    }
    const warnings = [];
    if (sd.pressure > w.high) warnings.push({ text: 'Давление выше окна — возможен выход раствора', danger: true });
    if (sd.pressure < w.low) warnings.push({ text: 'Давление ниже окна — шлам не выносится' });
    if (sd.cleaning >= 85) warnings.push({ text: 'Скважина промыта — можно переходить к расширению' });
    this.setWarnings(warnings);
  }

  updateProcessHud() {
    const sd = this.stageData;
    const isPull = this.stage === 'pull';
    const val = isPull ? sd.force : sd.load;
    this.setText(this.hudRefs.load, `${Math.round(val)}/100`);
    this.setText(this.hudRefs.progress, `${Math.round(sd.progress)}%`);
    this.setText(this.hudRefs.quality, `${Math.round(sd.quality)}%`);
    const bw = this.barRefs;
    if (bw.aFill) {
      bw.aFill.style.width = `${clamp(val, 0, 120) / 1.2}%`;
      bw.aFill.style.background = val > 100 ? 'var(--red)' : val > 88 ? 'var(--yellow)' : 'var(--green)';
      bw.aSafe.style.left = '66%';
      bw.aSafe.style.width = '17%';
      this.setText(bw.aValue, `${Math.round(val)} / 100`);
      this.setText(bw.bValue, `${Math.round(sd.progress)}%`);
      bw.bFill.style.width = `${clamp(sd.progress, 0, 100)}%`;
    }
    const warnings = [];
    if (val > 100) warnings.push({ text: isPull ? 'Усилие выше предела — риск повреждения трубы' : 'Перегрузка расширителя — остановите тягу', danger: true });
    else if (val > 90) warnings.push({ text: 'Нагрузка близка к пределу' });
    if (!sd.mud) warnings.push({ text: 'Промывка выключена — нагрузка растёт' });
    this.setWarnings(warnings);
  }

  renderPilotDeck() {
    this.ventCd = 0;
    $('deck').innerHTML = `<div class="deck-inner controls pilot-controls">
      <div class="ctrl-group">
        <div class="ctrl-label"><span>Траектория</span><b>СКОЛЬЖЕНИЕ / ВРАЩЕНИЕ</b></div>
        <div class="steer-pad">
          <button class="hold-btn" data-hold="up">▲ ВВЕРХ<small>поднять головку</small></button>
          <button class="hold-btn" data-hold="down">▼ ВНИЗ<small>заглубить</small></button>
        </div>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-label"><span>Подача</span><b id="feed-read">0%</b></div>
        <button class="hold-btn big" id="feed-btn">ПОДАЧА<small>удерживать</small></button>
        <label class="auto-row"><input type="checkbox" id="auto-feed"> Автоподача 55%</label>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-label"><span>Вращение</span><b id="rot-read">ВКЛ</b></div>
        <button class="toggle-btn green on" id="rot-btn">ВРАЩЕНИЕ ВКЛ</button>
        <p class="hint">Выключите вращение, чтобы точнее менять уклон.</p>
      </div>
      <div class="ctrl-group">
        <div class="ctrl-label"><span>Раствор</span><b id="vent-hint">окно давления</b></div>
        <div class="mini-gauge"><b id="pilot-pressure-mini">48</b><span>бар</span></div>
        <div class="pressure-bar"><span class="band" id="pilot-band"></span><span class="needle" id="pilot-needle" style="left:48%"></span></div>
        <button class="btn btn-sm" id="vent-btn" style="margin-top:8px;width:100%">Сбросить давление</button>
      </div>
    </div>`;

    this.bindHold($('feed-btn'), 'feed');
    this.bindHold($('[data-hold="up"]'), 'up');
    this.bindHold($('[data-hold="down"]'), 'down');
    $('auto-feed').addEventListener('change', (e) => {
      this.input.auto = e.target.checked;
      sound.click();
    });
    const rot = $('rot-btn');
    const setRot = (on) => {
      this.input.rot = on;
      rot.classList.toggle('on', on);
      rot.textContent = `ВРАЩЕНИЕ ${on ? 'ВКЛ' : 'ВЫКЛ'}`;
      $('rot-read').textContent = on ? 'ВКЛ' : 'ВЫКЛ';
    };
    rot.addEventListener('click', () => { setRot(!this.input.rot); sound.click(); });
    this.rotBtn = rot;

    this.ventBtn = $('vent-btn');
    this.ventBtn.addEventListener('click', () => {
      if (this.ventCd > 0) return;
      this.ventCd = 5;
      this.pressure = Math.max(20, this.pressure - 17);
      this.fracRisk = Math.max(0, this.fracRisk - 9);
      this.stats.mudQuality = clamp(this.stats.mudQuality - 1.2, 0, 100);
      this.ventBtn.disabled = true;
      this.ventBtn.textContent = 'Сброс через 5 с';
      this.addLog('mud', 'Сбрасываю давление, чтобы не продавить раствор на поверхность.', 'good');
      sound.warn();
    });
  }

  bindHold(btn, key) {
    if (!btn) return;
    const on = (e) => {
      e.preventDefault();
      this.holds[key] = true;
      btn.classList.add('on');
      sound.init();
      try { btn.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const off = () => {
      this.holds[key] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', on);
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('pointerleave', off);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  }

  updatePilot(dt) {
    const c = this.contract;
    const prevX = this.head.x;
    const thrust = (this.holds.feed ? 1 : this.input.auto ? 0.55 : 0);
    const steer = (this.holds.up ? 1 : 0) - (this.holds.down ? 1 : 0);
    const op = this.crew.operator;
    const locatorAssist = op.mods.locatorAssist
      ? 0.86 + this.crew.locator.effective * 0.045
      : 1;
    const steerFactor = (0.76 + op.effective * 0.055) * (op.mods.steer || 1) * locatorAssist;
    const steerEffect = this.input.rot ? 0.19 : 1;
    const pitchRate = 31 * steerFactor * steerEffect;

    this.head.pitch = clamp(this.head.pitch + steer * pitchRate * dt, -34, 34);
    const layer = c.layers.find(l => this.head.d >= l.top && this.head.d < l.bottom);
    const hardness = layer?.hardness || 1;
    const speed = thrust * 2.35 * (SOILS[c.soil].speed / hardness) * (0.84 + op.effective * 0.045);
    const rad = this.head.pitch * Math.PI / 180;
    this.head.x += Math.cos(rad) * speed * dt;
    this.head.d += Math.sin(rad) * speed * dt;
    this.head.d = clamp(this.head.d, 0.55, 9.6);
    if (this.head.x < 0) this.head.x = 0;
    if (this.head.d <= 0.56 && this.head.pitch < 0) this.head.pitch = 0;

    if (this.head.x - (this.path[this.path.length - 1]?.x || 0) > 0.35) {
      this.path.push({ x: this.head.x, d: this.head.d });
    }

    // sonde detection of unknown utilities
    const loc = this.crew.locator;
    const range = 5 + loc.effective * 2.7 * (loc.mods.detect || 1);
    for (const u of this.utilities) {
      if (!u.revealed && !u.detected && Math.abs(u.x - this.head.x) < range) {
        u.detected = true;
        this.addLog('locator', `Неизвестная сеть впереди, ${Math.round(u.x - this.head.x)} м. Иду по сигналу — снизь подачу.`, 'alert');
        toast('Локатор: неизвестная коммуникация на трассе', 'warn');
        sound.warn();
      }
    }

    // utility crossing
    for (const u of this.utilities) {
      if (u.hit) continue;
      if (prevX < u.x && this.head.x >= u.x) {
        if (Math.abs(this.head.d - u.depth) < u.clearance) this.strike(u);
      }
    }

    // deviation accounting
    const dev = this.head.d - designDepthAt(c, this.head.x);
    this.stats.devSum += Math.abs(dev) * Math.max(0.01, this.head.x - prevX);
    this.stats.devSamples += Math.max(0.01, this.head.x - prevX);
    this.stats.devMax = Math.max(this.stats.devMax, Math.abs(dev));

    // pressure
    const mix = MIXES[this.prep.mud] || MIXES.bentonite;
    const win = this.pressureWindow();
    const target = 24 + this.head.d * 3.6 + thrust * 26 + SOILS[c.soil].mud * 0.5;
    this.pressure = lerp(this.pressure, target, 1 - Math.exp(-dt * 2.1));
    if (this.pressure > win.high) {
      const severity = (this.pressure - win.high) / 12;
      this.fracRisk += dt * severity * (this.head.d < 3.2 ? 15 : 4.5);
      this.stats.mudQuality = clamp(this.stats.mudQuality - dt * severity * 0.5, 0, 100);
    } else {
      this.fracRisk = Math.max(0, this.fracRisk - dt * 4);
    }
    if (this.fracRisk >= 100) this.fracOut();

    // rod wear
    if (thrust > 0.72 && this.input.rot) {
      const wearFactor = (op.mods.wear || 1) * (this.crew.mechanic.mods.wear || 1) * (1.18 - this.crew.mechanic.effective * 0.035);
      this.wear += dt * 2.0 * wearFactor * (1 + Math.abs(dev) * 0.18);
      if (this.wear >= 100) this.replaceRod();
    }

    // vent cooldown
    if (this.ventCd > 0) {
      this.ventCd -= dt;
      if (this.ventCd <= 0 && this.ventBtn) {
        this.ventBtn.disabled = false;
        this.ventBtn.textContent = 'Сбросить давление';
      } else if (this.ventBtn) {
        this.ventBtn.textContent = `Сброс через ${Math.ceil(this.ventCd)} с`;
      }
    }

    // live deck readouts
    const feedVal = Math.round(thrust * 100);
    this.setText($('feed-read'), `${feedVal}%`);
    const mini = $('pilot-pressure-mini');
    this.setText(mini, `${Math.round(this.pressure)}`);
    const needle = $('pilot-needle');
    if (needle) needle.style.left = `${clamp(this.pressure, 0, 100)}%`;
    const band = $('pilot-band');
    if (band) {
      band.style.left = `${win.low}%`;
      band.style.width = `${Math.max(4, win.high - win.low)}%`;
    }
    sound.setEngine(thrust > 0.05 ? 0.18 + thrust * 0.18 : 0.06);

    if (this.head.x >= c.length) {
      this.head.x = c.length;
      this.path.push({ x: c.length, d: this.head.d });
      this.finishPilot();
    }
  }

  strike(u) {
    u.hit = true;
    this.stats.strikes++;
    this.extra += 5500;
    this.penalties += 5500;
    this.stats.mudQuality = clamp(this.stats.mudQuality - 6, 0, 100);
    this.fx.shake = 1;
    this.drillPause = 2.2;
    this.pressure = Math.max(25, this.pressure - 8);
    this.head.d = clamp(u.depth + (this.head.d >= u.depth ? 1.35 : -1.35), 0.6, 9.4);
    this.head.pitch = 0;
    this.addLog('locator', `Удар по ${u.label} на ${u.x} м! Глубина ${fmtNum(u.depth, 1)} м.`, 'danger');
    this.addLog('foreman', 'Останавливаем проходку. Оцениваем повреждение и уведомляем владельца сети.', 'danger');
    toast(`ПОВРЕЖДЕНИЕ КОММУНИКАЦИИ · −${fmtMoney(5500)}`, 'bad');
    sound.alarm();
    if (this.stats.strikes >= 2) {
      this.finishJob(false, 'Повреждены две коммуникации. Работы остановлены, заказ не принят.');
    }
  }

  fracOut() {
    this.stats.fracOuts++;
    this.extra += 3800;
    this.penalties += 3800;
    this.stats.mudQuality = clamp(this.stats.mudQuality - 14, 0, 100);
    this.fx.frac = 4.5;
    this.fx.fracX = this.head.x;
    this.fx.shake = 0.9;
    this.drillPause = 2;
    this.pressure = Math.max(28, this.pressure - 20);
    this.fracRisk = 26;
    this.addLog('mud', 'Раствор вышел на поверхность! Снижаю подачу, глушу насос.', 'danger');
    toast(`ВЫХОД РАСТВОРА НА ПОВЕРХНОСТЬ · −${fmtMoney(3800)}`, 'bad');
    sound.alarm();
    if (this.stats.fracOuts >= 2) {
      this.finishJob(false, 'Два выхода раствора. Участок остановлен до пересогласования рецептуры.');
    }
  }

  replaceRod() {
    const mech = this.crew.mechanic;
    const cost = Math.round(2200 * (mech.mods.repairCost || 1));
    this.extra += cost;
    this.penalties += cost;
    this.stats.rodEvents++;
    this.wear = 30;
    this.drillPause = 3.4 * (mech.mods.repair || 1);
    this.fx.shake = 0.4;
    this.addLog('mechanic', `Износ штанги критический. Меняю за ${Math.round(this.drillPause)} с, простой в смете.`, 'alert');
    toast(`ЗАМЕНА ШТАНГИ · −${fmtMoney(cost)}`, 'warn');
    sound.warn();
  }

  finishPilot() {
    const c = this.contract;
    const exitErr = Math.abs(this.head.d - c.exitDepth);
    this.exitError = exitErr;
    const routeBonus = this.prep.route === 'laser' ? 0 : this.prep.route === 'manual' ? 3 : 10;
    const traj = clamp(100 - this.stats.devMax * 19 - exitErr * 13 - routeBonus - this.stats.rodEvents * 2, 0, 100);
    const util = clamp(100 - this.stats.strikes * 48 - this.stats.fracOuts * 8, 0, 100);
    this.stats.trajectoryQuality = traj;
    this.stats.utilityQuality = util;
    this.stats.pilotQuality = traj * 0.65 + util * 0.35;
    if (exitErr > (this.prep.route === 'laser' ? 0.7 : 1.6)) {
      this.extra += 1500;
      this.penalties += 1500;
      this.addLog('foreman', `Выход с отклонением ${fmtNum(exitErr, 1)} м. Нужна доработка котлована, штраф по смете.`, 'alert');
    } else {
      this.addLog('locator', `Выход в допуске: ${fmtNum(exitErr, 1)} м от проектной глубины.`, 'good');
    }
    this.addLog('operator', 'Пилотная скважина пройдена. Переходим к промывке.', '');
    sound.stopEngine();
    this.initMud();
    this.setStage('mud');
    toast('Пилот завершён · переходим к промывке', 'good');
    sound.ok();
  }

  initMud() {
    this.stageData = {
      flow: 52, pressure: 48, cleaning: 0, quality: 100, risk: 0,
      additive: false, time: 0, pumping: true, bandTime: 0
    };
  }

  renderMudDeck() {
    const sd = this.stageData;
    $('deck').innerHTML = `<div class="deck-inner process-grid">
      <div class="process-card">
        <div class="ctrl-label"><span>Подача насоса</span><b id="mud-flow-val">${sd.flow}%</b></div>
        <input class="flow-slider" id="mud-flow" type="range" min="10" max="100" value="${sd.flow}" step="1" aria-label="Подача насоса">
        <div class="hint">Давление растёт с подачей и глубиной. Держите стрелку в зелёном окне, пока шлам не выйдет.</div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Давление в скважине</span><b id="mud-window-label">—</b></div>
        <div class="big-read"><span id="mud-pressure">${Math.round(sd.pressure)}</span><small> бар</small></div>
        <div class="process-meter"><span class="safe-zone" id="mud-safe"></span><i id="mud-fill" style="width:${sd.pressure}%"></i></div>
        <div class="quality-line"><span>ниже — шлам не идёт</span><span>выше — frac-out</span></div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Вынос шлама</span><b id="mud-clean">0%</b></div>
        <div class="process-meter" style="height:10px"><i id="mud-clean-fill" style="width:0%"></i></div>
        <div class="quality-line"><span>Качество промывки</span><b id="mud-q">100%</b></div>
        <div class="split" style="margin-top:8px">
          <button class="btn btn-sm" id="mud-additive">Полимерная добавка · ${fmtMoney(900)}</button>
          <button class="btn btn-primary btn-sm" id="mud-finish" disabled>Завершить промывку</button>
        </div>
        <div class="hint">Добавка расширяет окно давления и снижает риск выхода раствора.</div>
      </div>
    </div>`;

    this.mudRefs = {
      flow: $('mud-flow'), flowVal: $('mud-flow-val'), pressure: $('mud-pressure'),
      fill: $('mud-fill'), safe: $('mud-safe'), winLabel: $('mud-window-label'),
      clean: $('mud-clean'), cleanFill: $('mud-clean-fill'), quality: $('mud-q'),
      additive: $('mud-additive'), finish: $('mud-finish')
    };
    this.mudRefs.flow.addEventListener('input', (e) => {
      this.stageData.flow = Number(e.target.value);
      this.mudRefs.flowVal.textContent = `${this.stageData.flow}%`;
    });
    this.mudRefs.additive.addEventListener('click', () => {
      if (this.stageData.additive) return;
      const mud = this.crew.mud;
      const cost = Math.round(900 * (mud.mods.save || 1));
      this.stageData.additive = true;
      this.extra += cost;
      this.stageData.quality = clamp(this.stageData.quality + 3, 0, 100);
      this.mudRefs.additive.disabled = true;
      this.mudRefs.additive.textContent = 'Добавка введена';
      this.addLog('mud', 'Ввожу полимерную добавку. Окно давления расширено, стенка стабилизирована.', 'good');
      toast(`ДОБАВКА В РАСТВОР · −${fmtMoney(cost)}`, '');
      sound.ok();
      this.updateMudHud();
    });
    this.mudRefs.finish.addEventListener('click', () => this.finishMud());
  }

  updateMud(dt) {
    const sd = this.stageData;
    const mix = MIXES[this.prep.mud] || MIXES.bentonite;
    const w = this.mudWindow();
    sd.time += dt;
    sd.pumping = sd.flow > 8;
    const wobble = Math.sin(this.simT * 1.35 + 1) * 2.6 + Math.sin(this.simT * 3.3) * 1.1;
    const target = 12 + sd.flow * 0.62 + this.contract.maxDepth * 2.3 + SOILS[this.contract.soil].mud * 0.35 + wobble;
    sd.pressure = lerp(sd.pressure, target, 1 - Math.exp(-dt * 1.7));

    if (sd.pressure >= w.low && sd.pressure <= w.high) {
      sd.cleaning += dt * 6.1 * mix.clean;
      sd.bandTime += dt;
      sd.risk = Math.max(0, sd.risk - dt * 8);
      sd.quality = clamp(sd.quality + dt * 0.12, 0, 100);
    } else if (sd.pressure > w.high) {
      const over = sd.pressure - w.high;
      sd.risk += dt * over * 1.15;
      sd.cleaning += dt * 0.7;
      sd.quality = clamp(sd.quality - dt * (0.25 + over * 0.06), 0, 100);
      if (sd.risk >= 100) this.mudFrac();
    } else {
      sd.cleaning += dt * 0.85;
      sd.quality = clamp(sd.quality - dt * 0.08, 0, 100);
      sd.risk = Math.max(0, sd.risk - dt * 2.5);
    }
    sd.cleaning = clamp(sd.cleaning, 0, 100);

    const r = this.mudRefs;
    if (r?.fill) {
      r.fill.style.width = `${clamp(sd.pressure, 0, 100)}%`;
      r.safe.style.left = `${w.low}%`;
      r.safe.style.width = `${Math.max(4, w.high - w.low)}%`;
      this.setText(r.pressure, `${Math.round(sd.pressure)}`);
      this.setText(r.winLabel, `${Math.round(w.low)}–${Math.round(w.high)}`);
      this.setText(r.clean, `${Math.round(sd.cleaning)}%`);
      r.cleanFill.style.width = `${sd.cleaning}%`;
      this.setText(r.quality, `${Math.round(sd.quality)}%`);
      const canFinish = sd.cleaning >= 85;
      if (r.finish.disabled === canFinish) {
        r.finish.disabled = !canFinish;
        r.finish.textContent = canFinish ? 'Завершить промывку →' : 'Завершить промывку';
      }
    }
    sound.setEngine(sd.pumping ? 0.12 : 0);
    if (sd.cleaning >= 100) {
      // keep the finish button prominent, no auto transition
    }
  }

  mudFrac() {
    const sd = this.stageData;
    sd.risk = 22;
    sd.cleaning = Math.max(0, sd.cleaning - 7);
    sd.quality = clamp(sd.quality - 11, 0, 100);
    this.extra += 1800;
    this.penalties += 1800;
    this.fx.frac = 3.5;
    this.fx.fracX = this.contract.length;
    this.fx.shake = 0.7;
    this.addLog('mud', 'Раствор пошёл на поверхность у выходного котлована. Снижаю подачу!', 'danger');
    toast(`ПОТЕРЯ РАСТВОРА · −${fmtMoney(1800)}`, 'bad');
    sound.alarm();
  }

  finishMud() {
    if (this.stageData.cleaning < 85) return;
    this.stats.mudQuality = clamp(0.42 * this.stats.mudQuality + 0.58 * this.stageData.quality, 0, 100);
    this.addLog('mud', `Промывка завершена. Вынос шлама ${Math.round(this.stageData.cleaning)}%, окно давления удержано.`, 'good');
    this.addLog('operator', 'Скважина промыта. Начинаем расширение.', '');
    this.initReam();
    this.setStage('ream');
    toast('Промывка завершена · расширение скважины', 'good');
    sound.ok();
  }

  initReam() {
    const ratio = this.reamer?.ratio || 1.35;
    this.reamBase = (18 + 26 * ratio) * SOILS[this.contract.soil].ream;
    this.stageData = {
      progress: 0, load: 28, quality: 100, damage: 0, events: 0,
      mud: true, time: 0, avgLoad: 0, samples: 0
    };
    this.input.mudPulse = true;
  }

  renderReamDeck() {
    const sd = this.stageData;
    const r = this.reamer || { dia: 150, ratio: 1.35 };
    $('deck').innerHTML = `<div class="deck-inner process-grid">
      <div class="process-card">
        <div class="ctrl-label"><span>Инструмент</span><b>${r.ratio.toFixed(2)}×</b></div>
        <div class="big-read">Ø${r.dia}<small> мм</small></div>
        <div class="quality-line"><span>Расчётная нагрузка</span><b>${Math.round(this.reamBase)}</b></div>
        <div class="hint">Расширитель идёт от выходного котлована к установке. Нагрузка растёт с диаметром и плотностью грунта.</div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Тяга</span><b id="proc-load-label">${Math.round(sd.load)} / 100</b></div>
        <button class="hold-btn big" id="process-pull">ТЯГА<small>удерживать</small></button>
        <div class="split" style="margin-top:7px">
          <button class="toggle-btn green on" id="proc-mud">ПРОМЫВКА ВКЛ</button>
          <div class="mini-gauge" style="justify-content:center"><b id="proc-progress">0</b><span>%</span></div>
        </div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Состояние</span><b id="proc-quality">100%</b></div>
        <div class="process-meter"><i id="proc-quality-fill" style="width:100%;background:linear-gradient(90deg,#ff7a1a,#7dd3a7)"></i></div>
        <div class="quality-line"><span>Перегрузки</span><b id="proc-events">0</b></div>
        <div class="hint">Красная зона — выше 100. Отпускайте тягу, чтобы нагрузка успела упасть. Промывка снижает трение.</div>
      </div>
    </div>`;
    this.bindProcessControls();
  }

  renderPullDeck() {
    const sd = this.stageData;
    const c = this.contract;
    $('deck').innerHTML = `<div class="deck-inner process-grid">
      <div class="process-card">
        <div class="ctrl-label"><span>Коммуникация</span><b>${c.od} мм</b></div>
        <div class="big-read" style="font-size:20px">ПЭ100<small> SDR</small></div>
        <div class="quality-line"><span>Расчётное усилие</span><b>${Math.round(this.pullBase)}</b></div>
        <div class="hint">Вертлюг закреплён, труба заведена в скважину. Тянуть нужно импульсами, чтобы не превысить предел.</div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Протяжка</span><b id="proc-load-label">${Math.round(sd.force)} / 100</b></div>
        <button class="hold-btn big" id="process-pull">ПРОТЯЖКА<small>удерживать</small></button>
        <div class="split" style="margin-top:7px">
          <button class="toggle-btn green on" id="proc-mud">ПРОМЫВКА ВКЛ</button>
          <div class="mini-gauge" style="justify-content:center"><b id="proc-progress">0</b><span>%</span></div>
        </div>
      </div>
      <div class="process-card">
        <div class="ctrl-label"><span>Состояние трубы</span><b id="proc-quality">100%</b></div>
        <div class="process-meter"><i id="proc-quality-fill" style="width:100%;background:linear-gradient(90deg,#ff7a1a,#7dd3a7)"></i></div>
        <div class="quality-line"><span>Перегрузки</span><b id="proc-events">0</b></div>
        <div class="hint">Если усилие держится выше 100 — растёт риск повреждения ПЭ-трубы и стенки скважины.</div>
      </div>
    </div>`;
    this.bindProcessControls();
  }

  bindProcessControls() {
    this.bindHold($('process-pull'), 'feed');
    const mud = $('proc-mud');
    const paint = () => {
      const on = this.input.mudPulse;
      mud.classList.toggle('on', on);
      mud.textContent = on ? 'ПРОМЫВКА ВКЛ' : 'ПРОМЫВКА ВЫКЛ';
      this.stageData.mud = on;
    };
    paint();
    mud.addEventListener('click', () => {
      this.input.mudPulse = !this.input.mudPulse;
      paint();
      sound.click();
    });
    this.procRefs = {
      load: $('proc-load-label'), quality: $('proc-quality'),
      qualityFill: $('proc-quality-fill'), events: $('proc-events'),
      progress: $('proc-progress'), mud
    };
  }

  updateReam(dt) {
    const sd = this.stageData;
    const pulling = this.holds.feed;
    sd.time += dt;
    const wobble = Math.sin(this.simT * 1.4) * 2.8 + Math.sin(this.simT * 3.7 + 1) * 1.4;
    const target = this.reamBase + (pulling ? 20 : 0) - (sd.mud ? 14 : 0) + (sd.progress / 100) * 8 + wobble;
    sd.load = lerp(sd.load, target, 1 - Math.exp(-dt * 3.1));
    if (pulling) {
      const penalty = clamp((sd.load - 100) / 55, 0, 0.7);
      sd.progress += dt * 4.0 * (1 - penalty);
    }
    if (sd.load > 100) {
      sd.damage += dt;
      sd.quality = clamp(sd.quality - dt * 3.1, 0, 100);
      if (sd.damage > 1.35) this.processOverload('ream');
    } else {
      sd.damage = Math.max(0, sd.damage - dt * 0.6);
      if (sd.load > 64 && sd.load < 96) sd.quality = clamp(sd.quality + dt * 0.035, 0, 100);
    }
    sd.avgLoad += sd.load * dt;
    sd.samples += dt;
    sd.progress = clamp(sd.progress, 0, 100);
    this.updateProcessDeck();
    sound.setEngine(0.08 + (pulling ? 0.14 : 0));
    if (sd.progress >= 100) this.finishReam();
  }

  finishReam() {
    this.stats.reamQuality = clamp(this.stageData.quality, 0, 100);
    this.stats.reamEvents = this.stageData.events;
    this.addLog('mechanic', `Расширение закончено. Перегрузок: ${this.stageData.events}. Инструмент цел.`, this.stageData.events ? 'alert' : 'good');
    this.addLog('foreman', 'Готовим трубу к протяжке. Проверить вертлюг и ограждение.', '');
    this.initPull();
    this.setStage('pull');
    toast('Расширение завершено · протяжка коммуникации', 'good');
    sound.ok();
  }

  initPull() {
    const ratio = this.reamer?.ratio || 1.35;
    const factor = ratio < 1.2 ? 1.3 : ratio > 1.55 ? 1.12 : 1;
    this.pullBase = (30 + 15 * ratio) * SOILS[this.contract.soil].ream * factor;
    this.stageData = {
      progress: 0, force: 30, quality: 100, damage: 0, events: 0,
      mud: true, time: 0, avgForce: 0, samples: 0
    };
    this.input.mudPulse = true;
  }

  updatePull(dt) {
    const sd = this.stageData;
    const pulling = this.holds.feed;
    sd.time += dt;
    const wobble = Math.sin(this.simT * 1.2 + 2) * 2.2 + Math.sin(this.simT * 3.1) * 1.1;
    const target = this.pullBase + (pulling ? 18 : 0) - (sd.mud ? 16 : 0) + (sd.progress / 100) * 16 + wobble;
    sd.force = lerp(sd.force, target, 1 - Math.exp(-dt * 2.7));
    if (pulling) {
      const penalty = clamp((sd.force - 100) / 55, 0, 0.7);
      sd.progress += dt * 3.55 * (1 - penalty);
    }
    if (sd.force > 100) {
      sd.damage += dt;
      sd.quality = clamp(sd.quality - dt * 3.4, 0, 100);
      if (sd.damage > 1.35) this.processOverload('pull');
    } else {
      sd.damage = Math.max(0, sd.damage - dt * 0.6);
      if (sd.force > 62 && sd.force < 96) sd.quality = clamp(sd.quality + dt * 0.035, 0, 100);
    }
    sd.avgForce += sd.force * dt;
    sd.samples += dt;
    sd.progress = clamp(sd.progress, 0, 100);
    this.updateProcessDeck();
    sound.setEngine(0.08 + (pulling ? 0.14 : 0));
    if (sd.progress >= 100) this.finishPull();
  }

  updateProcessDeck() {
    const sd = this.stageData;
    const r = this.procRefs;
    if (!r) return;
    const val = this.stage === 'pull' ? sd.force : sd.load;
    this.setText(r.load, `${Math.round(val)} / 100`);
    this.setText(r.quality, `${Math.round(sd.quality)}%`);
    r.qualityFill.style.width = `${clamp(sd.quality, 0, 100)}%`;
    this.setText(r.events, String(sd.events));
    this.setText(r.progress, String(Math.round(sd.progress)));
  }

  processOverload(kind) {
    const sd = this.stageData;
    sd.events++;
    sd.damage = 0;
    sd.quality = clamp(sd.quality - 13, 0, 100);
    sd.progress = Math.max(0, sd.progress - 3);
    this.extra += kind === 'pull' ? 5000 : 4500;
    this.penalties += kind === 'pull' ? 5000 : 4500;
    this.fx.shake = 0.9;
    this.drillPause = 1.4;
    if (kind === 'ream') {
      this.addLog('operator', 'Перегрузка расширителя! Сбрасываю тягу, промываю скважину.', 'danger');
      toast(`ПЕРЕГРУЗКА РАСШИРИТЕЛЯ · −${fmtMoney(4500)}`, 'bad');
    } else {
      this.addLog('operator', 'Усилие выше предела! Стоп протяжки, риск повреждения трубы.', 'danger');
      toast(`ПЕРЕГРУЗ ТРУБЫ · −${fmtMoney(5000)}`, 'bad');
    }
    sound.alarm();
    if (sd.events >= 2) {
      this.finishJob(false, kind === 'pull'
        ? 'Труба повреждена перегрузкой. Протяжка остановлена.'
        : 'Расширитель заклинило. Скважина требует повторной проходки.');
    }
  }

  finishPull() {
    this.stats.pullQuality = clamp(this.stageData.quality, 0, 100);
    this.stats.pullEvents = this.stageData.events;
    this.addLog('operator', 'Труба вышла на входном котловане. Протяжка завершена.', 'good');
    this.addLog('foreman', 'Осматриваем коммуникацию, проверяем глубину и сдаём объект.', '');
    this.finishJob(true);
  }

  finishJob(success, reason = '') {
    if (this.finished) return;
    this.finished = true;
    this.failed = !success;
    this.finishReason = reason || '';
    this.paused = false;
    this.input.feed = false;
    this.holds.feed = false;
    sound.stopEngine();
    if (!success) {
      this.addLog('foreman', reason || 'Работы остановлены. Объект не сдан.', 'danger');
      sound.alarm();
    } else {
      this.addLog('foreman', 'Объект готов. Считаем смету и премию за качество.', 'good');
      sound.coin();
    }

    const c = this.contract;
    const idx = STAGES.findIndex(s => s.id === this.stage);
    const startedPilot = idx >= 1 || this.stage === 'results';
    const traj = this.stats.trajectoryQuality ?? (startedPilot ? 55 : 0);
    const util = this.stats.utilityQuality ?? (startedPilot ? clamp(100 - this.stats.strikes * 48, 0, 100) : 0);
    const mud = idx >= 2 ? this.stats.mudQuality : 0;
    const ream = idx >= 3 ? this.stats.reamQuality : 0;
    const pull = idx >= 4 ? this.stats.pullQuality : 0;
    const overall = clamp(traj * 0.25 + util * 0.2 + mud * 0.2 + ream * 0.15 + pull * 0.2, 0, 100);
    this.quality = { traj, util, mud, ream, pull, overall };

    let stars = 0;
    if (success) {
      stars = overall >= 82 ? 3 : overall >= 64 ? 2 : overall >= 45 ? 1 : 0;
    }
    this.stars = stars;

    const basePay = c.payout;
    const foremanMod = this.crew.foreman.mods.bonus || 1;
    const qualityMult = 0.85 + (overall / 100) * 0.3;
    const qualityBonus = success ? basePay * (qualityMult - 1) : 0;
    const foremanBonus = success ? (basePay + qualityBonus) * (foremanMod - 1) : 0;
    const payout = success ? basePay + qualityBonus + foremanBonus : basePay * 0.12;
    const wages = crewWages(state.crew);
    const costs = this.spentPrep + wages + this.extra;
    const profit = payout - costs;

    state.money = Math.max(0, state.money + payout - wages - this.extra);
    if (success) {
      state.shifts++;
      state.bestStars = Math.max(state.bestStars, stars);
    }
    const xpGain = success ? 16 + stars * 5 : 6;
    const xpResults = ROLES.map(role => {
      const before = state.crew[role.id].xp || 0;
      const beforeLvl = xpLevel(before);
      state.crew[role.id].xp = before + xpGain;
      return { role, name: this.crew[role.id].name, beforeLvl, afterLvl: xpLevel(state.crew[role.id].xp), gained: xpGain };
    });
    state.history = state.history || [];
    state.history.unshift({ code: c.code, title: c.title, stars, profit, date: Date.now() });
    state.history = state.history.slice(0, 20);
    saveState();
    updateMoneyUI();

    this.result = {
      success, stars, overall, payout, basePay, qualityBonus, foremanBonus,
      wages, prep: this.spentPrep, extra: this.extra, costs, profit, xpGain, xpResults,
      reason
    };

    this.stage = 'results';
    this.renderStageTrack();
    this.renderCrewSide();
    this.buildDeck();
    this.buildHud();
    this.buildBars();
    this.setWarnings([]);
    $('deck').innerHTML = `<div class="deck-inner" style="display:flex;justify-content:space-between;gap:14px;align-items:center;flex-wrap:wrap">
      <div><p class="eyebrow">${success ? 'Объект сдан' : 'Смена остановлена'}</p><b style="font-size:14px">${esc(c.title)}</b></div>
      <div style="font-family:var(--mono);font-size:13px;color:${profit >= 0 ? 'var(--green)' : 'var(--red)'}">${profit >= 0 ? '+' : ''}${fmtMoney(profit)}</div>
    </div>`;
    this.renderResults();
    $('results-overlay').classList.remove('hidden');
    this.soundStage();
  }

  renderResults() {
    const r = this.result;
    const c = this.contract;
    const qualityRows = [
      ['Траектория', r.quality.traj],
      ['Коммуникации', r.quality.util],
      ['Раствор', r.quality.mud],
      ['Расширение', r.quality.ream],
      ['Протяжка', r.quality.pull]
    ];
    const stars = [1, 2, 3].map(i => `<i class="${i <= r.stars ? 'on' : ''}">★</i>`).join('');
    const xp = r.xpResults.map(x => {
      const up = x.afterLvl > x.beforeLvl;
      return `<div class="xp-item">
        <b style="color:${x.role.color}">${x.role.short}</b>
        ${esc(x.name.split(' ')[0])} · L${x.afterLvl}${up ? ' ↑' : ''}
        <div class="xpbar"><i style="width:${xpProgress(state.crew[x.role.id].xp) * 100}%"></i></div>
      </div>`;
    }).join('');

    $('results-card').innerHTML = `
      <div class="modal-kicker">
        <p class="eyebrow">${r.success ? 'Приёмка работ' : 'Аварийная остановка'}</p>
        <span class="status-chip ${r.success ? 'ok' : 'fail'}">${r.success ? '● Объект сдан' : '● Заказ не принят'}</span>
      </div>
      <h2>${r.success ? 'Скважина готова' : 'Работы остановлены'}</h2>
      <p class="sub">${esc(c.title)} · ${esc(c.client)} · ${esc(c.product)}</p>
      ${r.reason ? `<p class="sub" style="margin-top:8px;color:#ffb3b3">${esc(r.reason)}</p>` : ''}
      <div class="stars">${stars}</div>
      <div class="quality-list">
        ${qualityRows.map(([label, val]) => `<div class="q-row"><span>${label}</span>
          <div class="q-track"><i style="width:${clamp(val, 0, 100)}%"></i></div><b>${Math.round(val)}</b></div>`).join('')}
      </div>
      <div class="fin-table">
        <div class="fin-row"><span>По договору</span><b>${fmtMoney(r.basePay)}</b></div>
        ${r.qualityBonus ? `<div class="fin-row"><span>Премия за качество</span><b>+${fmtMoney(r.qualityBonus)}</b></div>` : ''}
        ${r.foremanBonus ? `<div class="fin-row"><span>Бонус бригадира</span><b>+${fmtMoney(r.foremanBonus)}</b></div>` : ''}
        ${!r.success ? `<div class="fin-row"><span>Оплата при остановке (12%)</span><b>${fmtMoney(r.payout)}</b></div>` : ''}
        <div class="fin-row neg"><span>Подготовка и материалы</span><b>−${fmtMoney(r.prep)}</b></div>
        <div class="fin-row neg"><span>Зарплата бригады</span><b>−${fmtMoney(r.wages)}</b></div>
        <div class="fin-row neg"><span>Аварии, ремонт, простои</span><b>−${fmtMoney(r.extra)}</b></div>
        <div class="fin-row total"><span>Финансовый результат</span><b>${r.profit >= 0 ? '+' : ''}${fmtMoney(r.profit)}</b></div>
      </div>
      <div class="xp-block">
        <div class="aside-title">Опыт бригады · +${r.xpGain} XP каждому</div>
        <div class="xp-grid">${xp}</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary" data-res="next">К новым заказам →</button>
        <button class="btn" data-res="retry">Повторить объект</button>
        <button class="btn btn-ghost" data-res="base">На базу</button>
      </div>`;

    $('results-card').querySelectorAll('[data-res]').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.click();
        if (btn.dataset.res === 'next') {
          currentJob = null;
          showScreen('contracts');
        } else if (btn.dataset.res === 'retry') {
          if (state.money < 3000) {
            toast('Недостаточно средств для мобилизации', 'bad');
            return;
          }
          const contract = this.contract;
          currentJob = null;
          startJob(contract);
        } else {
          currentJob = null;
          showScreen('title');
        }
      });
    });
  }

  togglePause(force) {
    if (this.stage === 'results') return;
    const next = typeof force === 'boolean' ? force : !this.paused;
    this.paused = next;
    $('pause-overlay').classList.toggle('hidden', !next);
    if (next) {
      this.holds.feed = false;
      sound.stopEngine();
    } else {
      this.soundStage();
    }
  }

  abandon() {
    state.money = Math.max(0, state.money - 2500);
    saveState();
    updateMoneyUI();
    currentJob = null;
    closeAllOverlays();
    showScreen('contracts');
    sound.stopEngine();
  }

}

function startJob(contract) {
  if (!contract) return;
  closeAllOverlays();
  $('radio-log').innerHTML = '';
  $('toast-layer').innerHTML = '';
  const crew = crewMembers(state.crew);
  currentJob = new Job(contract, crew);
  showScreen('game');
  gameRenderer.setContract(contract);
  currentJob.begin();
}

function makeDemo() {
  const c = prepareContract(CONTRACTS[0]);
  const head = { x: 26, d: designDepthAt(c, 26), pitch: -8 };
  return {
    contract: c,
    design: c.design,
    utilities: c.utilities.map(u => ({ ...u, revealed: true, detected: false, hit: false })),
    head,
    path: c.design.filter(p => p.x <= 26).concat([{ ...head }]),
    stage: 'pilot',
    prep: { route: 'laser' },
    crew: crewMembers(defaultCrew()),
    fx: {},
    stageData: {}
  };
}

function updateDemo(dt) {
  heroT += dt;
  const c = heroDemo.contract;
  const x = 25 + Math.sin(heroT * 0.17) * 9;
  const d = designDepthAt(c, x);
  const d2 = designDepthAt(c, Math.min(c.length, x + 1));
  heroDemo.head.x = x;
  heroDemo.head.d = d;
  heroDemo.head.pitch = Math.atan2(d2 - d, 1) * 180 / Math.PI;
  heroDemo.path = c.design.filter(p => p.x <= x);
  heroDemo.path.push({ x, d });
  const chip = $('hero-depth');
  if (chip) chip.textContent = `−${fmtNum(d, 1)} м · уклон ${heroDemo.head.pitch > 0 ? '+' : ''}${Math.round(heroDemo.head.pitch)}°`;
}

let lastFrame = 0;
function frame(ts) {
  const dt = Math.min(0.05, lastFrame ? (ts - lastFrame) / 1000 : 0.016);
  lastFrame = ts;
  const t = ts / 1000;
  requestAnimationFrame(frame);
  if (screen === 'title') {
    if (!heroDemo) heroDemo = makeDemo();
    updateDemo(dt);
    heroRenderer.draw(heroDemo, t);
  } else if (screen === 'game' && currentJob) {
    currentJob.update(dt, t);
    gameRenderer.draw(currentJob, t);
  }
}

function bindUI() {
  $('btn-new-shift').addEventListener('click', () => { sound.init(); sound.click(); showScreen('contracts'); });
  $('btn-title-crew').addEventListener('click', () => { sound.click(); crewReturn = 'title'; showScreen('crew'); });
  $('btn-title-help').addEventListener('click', openHelp);
  $('btn-contracts-back').addEventListener('click', () => { sound.click(); showScreen('title'); });
  $('btn-contracts-crew').addEventListener('click', () => { sound.click(); crewReturn = 'contracts'; showScreen('crew'); });
  $('btn-crew-back').addEventListener('click', () => { saveState(); showScreen(crewReturn); });
  $('btn-crew-confirm').addEventListener('click', () => {
    saveState();
    sound.ok();
    showScreen(crewReturn);
  });
  $('btn-crew-reset').addEventListener('click', () => {
    state.crew = defaultCrew();
    renderCrew();
    saveState();
  });

  $('contract-list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-contract]');
    if (!card) return;
    const c = CONTRACTS.find(x => x.id === card.dataset.contract);
    if (!c) return;
    sound.init(); sound.ok();
    startJob(c);
  });

  $('crew-list').addEventListener('click', (e) => {
    const cand = e.target.closest('[data-cand]');
    if (!cand) return;
    const role = cand.dataset.role;
    state.crew[role].id = cand.dataset.cand;
    sound.click();
    renderCrew();
    saveState();
  });

  $('btn-help-close').addEventListener('click', closeHelp);
  $('btn-help-ok').addEventListener('click', closeHelp);
  $('btn-reset-progress').addEventListener('click', () => {
    if (window.confirm('Сбросить весь прогресс: деньги, опыт бригады и историю объектов?')) {
      try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
      location.reload();
    }
  });

  $('btn-game-exit').addEventListener('click', () => {
    if (!currentJob) return;
    sound.click();
    if (currentJob.stage === 'results') {
      currentJob = null;
      showScreen('contracts');
    } else {
      $('exit-confirm').classList.remove('hidden');
    }
  });
  $('btn-exit-cancel').addEventListener('click', () => { $('exit-confirm').classList.add('hidden'); sound.click(); });
  $('btn-exit-confirm').addEventListener('click', () => {
    $('exit-confirm').classList.add('hidden');
    currentJob?.abandon();
  });
  $('btn-pause').addEventListener('click', () => { sound.click(); currentJob?.togglePause(); });
  $('btn-resume').addEventListener('click', () => { sound.click(); currentJob?.togglePause(false); });
  $('btn-abandon').addEventListener('click', () => { currentJob?.abandon(); });

  $('btn-sound').addEventListener('click', () => {
    sound.init();
    state.sound = sound.toggle();
    $('btn-sound').textContent = state.sound ? '♪' : '×';
    $('btn-sound').title = state.sound ? 'Звук включён' : 'Звук выключен';
    saveState();
    if (state.sound) sound.click();
  });

  if (!state.sound) {
    sound.enabled = false;
    $('btn-sound').textContent = '×';
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape') {
      if (!$('help-overlay').classList.contains('hidden')) { closeHelp(); return; }
      if (!$('sheet-overlay').classList.contains('hidden')) { $('sheet-overlay').classList.add('hidden'); return; }
      if (!$('exit-confirm').classList.contains('hidden')) { $('exit-confirm').classList.add('hidden'); return; }
    }
    if (screen !== 'game' || !currentJob) return;
    const job = currentJob;
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      e.preventDefault();
      job.togglePause();
      return;
    }
    if (job.paused || job.stage === 'results') return;
    if (e.code === 'Space' && (job.stage === 'pilot' || job.stage === 'ream' || job.stage === 'pull')) {
      e.preventDefault();
      job.holds.feed = true;
      return;
    }
    if (job.stage === 'pilot') {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        job.holds.up = true;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        job.holds.down = true;
      } else if (e.key === 'r' || e.key === 'R') {
        job.rotBtn?.click();
      }
    }
    if (e.key === ' ' && job.stage === 'pilot') e.preventDefault();
  });

  document.addEventListener('keyup', (e) => {
    if (!currentJob) return;
    if (e.code === 'Space') currentJob.holds.feed = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') currentJob.holds.up = false;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') currentJob.holds.down = false;
  });

  window.addEventListener('blur', () => {
    if (!currentJob) return;
    currentJob.holds.feed = false;
    currentJob.holds.up = false;
    currentJob.holds.down = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentJob && !currentJob.paused && currentJob.stage !== 'results') {
      currentJob.togglePause(true);
    }
    if (document.hidden) sound.stopEngine();
  });

  $('sheet-overlay').addEventListener('pointerdown', (e) => {
    if (e.target === $('sheet-overlay')) $('sheet-overlay').classList.add('hidden');
  });
  $('help-overlay').addEventListener('pointerdown', (e) => {
    if (e.target === $('help-overlay')) closeHelp();
  });
}

bindUI();
updateTitleStats();
requestAnimationFrame(frame);









