/* Small shared helpers and crew math */

import { CANDIDATES, ROLES, MIXES } from './data.js';

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const now = () => performance.now();

const USD = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const fmtMoney = (n) => `$${USD.format(Math.round(n))}`;
export const fmtCompact = (n) => n >= 1000000
  ? `$${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}M`
  : `$${USD.format(Math.round(n))}`;
export const fmtNum = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');
export const fmtClock = (minutes) => {
  const total = 8 * 60 + Math.floor(minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
export const fmtDur = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${m} мин`;
};
export const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

export function xpLevel(xp) {
  return Math.min(5, 1 + Math.floor(xp / 100));
}
export function xpProgress(xp) {
  return xpLevel(xp) >= 5 ? 1 : (xp % 100) / 100;
}

export function defaultCrew() {
  const out = {};
  ROLES.forEach((role, i) => {
    const list = CANDIDATES[role.id];
    out[role.id] = { id: list[i === 0 ? 1 : 0].id, xp: 0 };
  });
  return out;
}

export function crewMembers(crewState) {
  const out = {};
  ROLES.forEach(role => {
    const chosen = crewState[role.id] || { id: CANDIDATES[role.id][0].id, xp: 0 };
    const cand = CANDIDATES[role.id].find(c => c.id === chosen.id) || CANDIDATES[role.id][0];
    const level = xpLevel(chosen.xp || 0);
    out[role.id] = {
      ...cand, level, xp: chosen.xp || 0,
      effective: Math.min(6, cand.skill + (level - 1) * 0.35)
    };
  });
  return out;
}

export function crewWages(crewState) {
  const m = crewMembers(crewState);
  return ROLES.reduce((sum, role) => sum + (m[role.id]?.salary || 0), 0);
}

export function prepCost(prep) {
  let sum = 0;
  if (prep.scan === 'georadar') sum += 1800;
  if (prep.scan === 'docs') sum += 600;
  if (prep.route === 'laser') sum += 1200;
  if (prep.route === 'manual') sum += 400;
  if (prep.mud) sum += MIXES[prep.mud]?.cost || 0;
  if (prep.reamer) sum += prep.reamer.cost || 0;
  if (prep.safety) sum += 900;
  return sum;
}

export function mixById(id) {
  return MIXES[id] || MIXES.bentonite;
}

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
