/* Canvas renderer: site, underground cross-section, rig, crew and tools */

import { ROLES, UTILITY_TYPES } from './data.js';
import { clamp, lerp, seeded } from './util.js';

const TAU = Math.PI * 2;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0; this.h = 0; this.dpr = 1;
    this.texture = null;
    this.contractId = null;
    this.demo = false;
  }

  setContract(contract) {
    if (!contract || this.contractId === contract.id) return;
    this.contractId = contract.id;
    const rnd = seeded(contract.id.charCodeAt(1) * 9173 + contract.length * 31);
    const dots = [];
    for (let i = 0; i < 380; i++) {
      dots.push({
        x: -8 + rnd() * (contract.length + 20),
        d: 0.4 + rnd() * (contract.maxDepth + 3.5),
        r: 0.6 + rnd() * 2.2,
        a: 0.06 + rnd() * 0.16,
        light: rnd() > 0.45
      });
    }
    const grass = [];
    for (let i = 0; i < 120; i++) {
      grass.push({ x: -12 + rnd() * (contract.length + 26), h: 3 + rnd() * 7, lean: (rnd() - 0.5) * 4 });
    }
    this.texture = { dots, grass };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.w !== r.width || this.h !== r.height || this.dpr !== dpr) {
      this.w = r.width; this.h = r.height; this.dpr = dpr;
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
    }
    return true;
  }

  view(game) {
    const c = game.contract;
    const narrow = this.w < 620;
    const full = this.demo || game.stage === 'prep' || game.stage === 'mud' || game.stage === 'results';
    let x0, x1;
    if (full) {
      x0 = narrow ? -13 : -24;
      x1 = c.length + (narrow ? 13 : 21);
    } else {
      let focus = game.head ? game.head.x : 0;
      if (game.stage === 'ream' || game.stage === 'pull') {
        const p = game.stageData?.progress || 0;
        focus = c.length * (1 - p / 100);
      }
      const vw = narrow ? 33 : 58;
      const maxX0 = Math.max(-24, c.length + 13 - vw);
      x0 = clamp(focus - vw * 0.42, -24, maxX0);
      x1 = x0 + vw;
    }
    const groundY = this.h * (full ? (narrow ? 0.285 : 0.305) : 0.325);
    const depth = full ? c.maxDepth + 3.4 : (narrow ? 10 : 9.4);
    const sy = (this.h - groundY - 14) / depth;
    const sx = this.w / (x1 - x0);
    return { x0, x1, groundY, sx, sy, full, narrow, depth };
  }

  draw(game, time) {
    if (!this.resize()) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const view = this.view(game);
    this.v = view;
    this.setContract(game.contract);

    const shake = game.fx?.shake || 0;
    ctx.save();
    if (shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * shake * 9, (Math.random() - 0.5) * shake * 7);
    }

    this.drawSky(ctx, view, time, game);
    this.drawGroundLayers(ctx, view, game);
    this.drawGrid(ctx, view, game);
    this.drawPits(ctx, view, game);
    this.drawUtilities(ctx, view, game, time);
    this.drawDesign(ctx, view, game);
    this.drawBore(ctx, view, game, time);
    this.drawEquipment(ctx, view, game, time);
    this.drawTools(ctx, view, game, time);
    this.drawCrew(ctx, view, game, time);
    this.drawFx(ctx, view, game, time);
    this.drawUtilityLabels(ctx, view, game);
    ctx.restore();
  }

  X(x) { return (x - this.v.x0) * this.v.sx; }
  Y(d) { return this.v.groundY + d * this.v.sy; }

  rr(ctx, x, y, w, h, r) {
    const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + k, y);
    ctx.arcTo(x + w, y, x + w, y + h, k);
    ctx.arcTo(x + w, y + h, x, y + h, k);
    ctx.arcTo(x, y + h, x, y, k);
    ctx.arcTo(x, y, x + w, y, k);
    ctx.closePath();
  }

  drawSky(ctx, v, t, game) {
    const g = ctx.createLinearGradient(0, 0, 0, v.groundY);
    g.addColorStop(0, '#08151f');
    g.addColorStop(0.4, '#173444');
    g.addColorStop(0.72, '#3f5c63');
    g.addColorStop(0.92, '#a47a52');
    g.addColorStop(1, '#c3945f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, v.groundY + 2);

    const sunX = this.w * 0.79, sunY = v.groundY * 0.35;
    const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, this.w * 0.22);
    sun.addColorStop(0, 'rgba(255,214,160,.55)');
    sun.addColorStop(0.35, 'rgba(255,180,110,.14)');
    sun.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, this.w, v.groundY);

    ctx.fillStyle = 'rgba(255,236,205,.55)';
    ctx.beginPath(); ctx.arc(sunX, sunY, Math.max(12, this.w * 0.018), 0, TAU); ctx.fill();

    // distant hills
    const hill = (base, amp, freq, color) => {
      ctx.beginPath();
      ctx.moveTo(0, v.groundY);
      for (let x = 0; x <= this.w + 20; x += 24) {
        ctx.lineTo(x, base - Math.sin(x * freq + 1.4) * amp - Math.sin(x * freq * 2.3) * amp * 0.3);
      }
      ctx.lineTo(this.w, v.groundY); ctx.closePath();
      ctx.fillStyle = color; ctx.fill();
    };
    hill(v.groundY - 2, 9, 0.007, '#193642');
    hill(v.groundY + 1, 5, 0.012, '#1c3b3e');

    // clouds
    ctx.fillStyle = 'rgba(220,230,225,.09)';
    [[0.16, 0.18, 70], [0.38, 0.1, 48], [0.62, 0.22, 62], [0.9, 0.14, 40]].forEach(([px, py, s]) => {
      const cx = px * this.w, cy = py * v.groundY;
      ctx.beginPath();
      ctx.ellipse(cx, cy, s, s * 0.22, 0, 0, TAU);
      ctx.ellipse(cx + s * 0.5, cy - s * 0.08, s * 0.5, s * 0.18, 0, 0, TAU);
      ctx.fill();
    });

    // horizon haze
    const haze = ctx.createLinearGradient(0, v.groundY - 40, 0, v.groundY);
    haze.addColorStop(0, 'rgba(255,190,130,0)');
    haze.addColorStop(1, 'rgba(255,190,130,.12)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, v.groundY - 40, this.w, 40);
  }

  drawGroundLayers(ctx, v, game) {
    const c = game.contract;
    const bottom = this.h + 20;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, v.groundY, this.w, this.h - v.groundY);
    ctx.clip();

    ctx.fillStyle = '#241d17';
    ctx.fillRect(0, v.groundY, this.w, bottom - v.groundY);

    for (const layer of c.layers) {
      const y0 = this.Y(layer.top);
      const y1 = this.Y(layer.bottom);
      if (y1 < v.groundY - 10) continue;
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, layer.color);
      grad.addColorStop(1, this.shade(layer.color, -12));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let x = 0; x <= this.w + 30; x += 30) {
        const wx = v.x0 + x / v.sx;
        ctx.lineTo(x, y0 + Math.sin(wx * 0.13 + layer.top * 3) * Math.min(2.5, v.sy * 0.07));
      }
      ctx.lineTo(this.w, y1 + 30);
      ctx.lineTo(0, y1 + 30);
      ctx.closePath();
      ctx.fill();
      // boundary line
      ctx.strokeStyle = 'rgba(255,225,190,.075)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= this.w + 30; x += 30) {
        const wx = v.x0 + x / v.sx;
        const y = y0 + Math.sin(wx * 0.13 + layer.top * 3) * Math.min(2.5, v.sy * 0.07);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (this.texture) {
      for (const p of this.texture.dots) {
        const x = this.X(p.x), y = this.Y(p.d);
        if (x < -10 || x > this.w + 10 || y < v.groundY || y > this.h + 10) continue;
        ctx.fillStyle = p.light ? `rgba(255,230,195,${p.a})` : `rgba(20,12,8,${p.a * 1.4})`;
        ctx.beginPath();
        ctx.ellipse(x, y, p.r, p.r * 0.62, p.r, 0, TAU);
        ctx.fill();
      }
    }

    // grass strip
    ctx.fillStyle = '#3b4a2f';
    ctx.fillRect(0, v.groundY - 3, this.w, 4);
    ctx.fillStyle = 'rgba(146,164,102,.5)';
    ctx.fillRect(0, v.groundY - 3, this.w, 1.5);
    if (this.texture) {
      ctx.strokeStyle = 'rgba(118,140,82,.5)';
      ctx.lineWidth = 1;
      for (const g of this.texture.grass) {
        const x = this.X(g.x);
        if (x < -4 || x > this.w + 4) continue;
        ctx.beginPath();
        ctx.moveTo(x, v.groundY - 2);
        ctx.lineTo(x + g.lean, v.groundY - 2 - g.h);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  drawGrid(ctx, v, game) {
    const c = game.contract;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const step = v.narrow ? 20 : 20;
    const first = Math.ceil(v.x0 / step) * step;
    for (let x = first; x <= v.x1; x += step) {
      const sx = this.X(x);
      ctx.strokeStyle = 'rgba(160,195,215,.055)';
      ctx.beginPath(); ctx.moveTo(sx, v.groundY); ctx.lineTo(sx, this.h); ctx.stroke();
      ctx.fillStyle = 'rgba(182,208,220,.38)';
      ctx.fillText(`${x} м`, sx + 4, v.groundY + 12);
    }
    const dStep = 2;
    for (let d = 2; d <= v.depth; d += dStep) {
      const sy = this.Y(d);
      if (sy > this.h - 4) break;
      ctx.strokeStyle = 'rgba(160,195,215,.045)';
      ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(this.w, sy); ctx.stroke();
      ctx.fillStyle = 'rgba(182,208,220,.32)';
      ctx.fillText(`−${d}`, 6, sy - 4);
    }
    ctx.restore();
  }

  drawUtilities(ctx, v, game, t) {
    const utils = game.utilities || [];
    for (const u of utils) {
      const x = this.X(u.x);
      if (x < -60 || x > this.w + 60) continue;
      const y = this.Y(u.depth);
      if (y > this.h + 20) continue;
      const known = u.revealed !== false;
      if (!known && !u.detected) continue;
      const col = u.color || UTILITY_TYPES[u.type]?.color || '#5ed6ff';
      const r = Math.max(5.5, (u.size || 0.15) * v.sy * 0.9);
      const hz = Math.max(13, u.clearance * v.sx);
      const pulse = 0.5 + Math.sin(t * 3 + u.x) * 0.5;

      // hazard column
      ctx.save();
      const band = ctx.createLinearGradient(0, v.groundY, 0, y + r * 2);
      band.addColorStop(0, known ? 'rgba(255,120,90,.02)' : 'rgba(255,90,90,.02)');
      band.addColorStop(1, known ? 'rgba(255,120,90,.12)' : 'rgba(255,90,90,.16)');
      ctx.fillStyle = band;
      ctx.fillRect(x - hz, v.groundY, hz * 2, Math.max(8, y + r * 2 - v.groundY));
      ctx.strokeStyle = known ? `rgba(255,170,120,${0.16 + pulse * 0.1})` : `rgba(255,90,90,${0.25 + pulse * 0.2})`;
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, v.groundY); ctx.lineTo(x, y + r * 2.2); ctx.stroke();
      ctx.setLineDash([]);

      // clearance ring
      ctx.strokeStyle = known ? 'rgba(255,150,110,.28)' : 'rgba(255,90,90,.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(r * 2.1, hz * 0.9), Math.max(r * 2.1, (u.clearance || 0.6) * v.sy), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);

      // pipe / cable
      ctx.fillStyle = 'rgba(8,12,14,.9)';
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.fill();
      const pg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r + 1);
      pg.addColorStop(0, this.lighten(col, 40));
      pg.addColorStop(1, col);
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.stroke();

      if (!known) {
        ctx.fillStyle = 'rgba(255,120,100,.95)';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('?', x, y - r - 8);
      } else {
        // surface marker
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x, v.groundY - 12);
        ctx.lineTo(x + 4, v.groundY - 5);
        ctx.lineTo(x - 4, v.groundY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(7,16,23,.85)';
        ctx.beginPath(); ctx.arc(x, v.groundY - 4, 3.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    // active sonde proximity warn
    if (game.stage === 'pilot' && game.head) {
      for (const u of utils) {
        if (u.revealed === false) continue;
        if (u.hit) continue;
        const dx = u.x - game.head.x;
        if (dx > -2 && dx < 14) {
          const x = this.X(u.x), y = this.Y(u.depth);
          ctx.strokeStyle = `rgba(255,100,90,${0.18 + (0.5 + Math.sin(t * 3) * 0.5) * 0.16})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 6]);
          ctx.beginPath(); ctx.arc(x, y, Math.max(16, u.clearance * v.sy), 0, TAU); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }

  lighten(hex, amt) {
    if (!hex || hex[0] !== '#') return hex;
    return this.shade(hex, amt);
  }

  drawDesign(ctx, v, game) {
    const c = game.contract;
    if (game.stage !== 'prep' && game.prep?.route === 'skip') return;
    const pts = game.design || c.design;
    ctx.save();
    ctx.strokeStyle = 'rgba(94,214,255,.72)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = this.X(p.x), y = this.Y(p.d);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    // direction arrows
    ctx.fillStyle = 'rgba(94,214,255,.8)';
    for (let i = 14; i < pts.length; i += 22) {
      const p = pts[i];
      const n = pts[Math.min(pts.length - 1, i + 2)];
      const x = this.X(p.x), y = this.Y(p.d);
      const ang = Math.atan2(this.Y(n.d) - y, this.X(n.x) - x);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  drawBore(ctx, v, game, t) {
    const path = game.path;
    if (!path || path.length < 2) return;
    const screen = path.map(p => ({ x: this.X(p.x), y: this.Y(p.d), d: p.d, wx: p.x }));
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // outer
    ctx.strokeStyle = 'rgba(5,8,10,.92)';
    ctx.lineWidth = Math.max(9, v.sy * 0.35);
    ctx.beginPath();
    screen.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    // inner shadow
    ctx.strokeStyle = '#2a1e15';
    ctx.lineWidth = Math.max(6, v.sy * 0.24);
    ctx.stroke();
    // bore glow
    ctx.shadowColor = 'rgba(255,122,26,.5)';
    ctx.shadowBlur = 9;
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // rod joints
    const jointEvery = 3;
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const len = Math.hypot(b.x - a.x, b.d - a.d);
      acc += len;
      if (acc >= jointEvery) {
        acc = 0;
        const x = this.X(b.x), y = this.Y(b.d);
        const dx = this.X(b.x) - this.X(a.x), dy = this.Y(b.d) - this.Y(a.d);
        const ang = Math.atan2(dy, dx) + Math.PI / 2;
        ctx.strokeStyle = 'rgba(255,200,140,.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(ang) * 3, y - Math.sin(ang) * 3);
        ctx.lineTo(x + Math.cos(ang) * 3, y + Math.sin(ang) * 3);
        ctx.stroke();
      }
    }

    // moving mud specks inside bore
    if (game.stage === 'pilot' || game.stage === 'mud' || game.stage === 'ream' || game.stage === 'pull') {
      const n = Math.min(40, Math.max(8, Math.floor(path.length / 2)));
      for (let i = 0; i < n; i++) {
        const idx = (i * 3 + Math.floor(t * 5)) % path.length;
        const p = screen[idx];
        ctx.fillStyle = `rgba(255,210,150,${0.18 + 0.12 * Math.sin(t * 4 + i)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, TAU); ctx.fill();
      }
    }

    // sonde pulses
    if (game.stage === 'pilot' && game.head) {
      const hx = this.X(game.head.x), hy = this.Y(game.head.d);
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i / 3) % 1;
        ctx.strokeStyle = `rgba(94,214,255,${(1 - ph) * 0.25})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(hx, hy, 8 + ph * 30, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawPits(ctx, v, game) {
    const c = game.contract;
    const drawPit = (x, label, isExit) => {
      const sx = this.X(x);
      if (sx < -80 || sx > this.w + 80) return;
      const half = Math.max(13, (isExit ? 1.6 : 2.2) * v.sx);
      const pitDepth = isExit ? c.exitDepth + 0.45 : 1.25;
      const depth = Math.min(pitDepth * v.sy, this.h - v.groundY - 10);
      ctx.save();
      // excavation
      const pg = ctx.createLinearGradient(0, v.groundY, 0, v.groundY + depth);
      pg.addColorStop(0, '#241a12');
      pg.addColorStop(0.5, '#171009');
      pg.addColorStop(1, '#0a0705');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(sx - half * 1.18, v.groundY - 2);
      ctx.lineTo(sx + half * 1.18, v.groundY - 2);
      ctx.lineTo(sx + half, v.groundY + depth);
      ctx.lineTo(sx - half, v.groundY + depth);
      ctx.closePath(); ctx.fill();
      // soil rim
      ctx.strokeStyle = 'rgba(180,140,95,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - half, v.groundY + depth); ctx.lineTo(sx + half, v.groundY + depth); ctx.stroke();
      // shoring / walls
      ctx.strokeStyle = 'rgba(190,150,100,.32)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx - half * 1.08, v.groundY); ctx.lineTo(sx - half, v.groundY + depth);
      ctx.moveTo(sx + half * 1.08, v.groundY); ctx.lineTo(sx + half, v.groundY + depth);
      ctx.stroke();
      for (let d = 0.6; d < depth / v.sy; d += 0.9) {
        const yy = v.groundY + d * v.sy;
        ctx.strokeStyle = 'rgba(180,145,100,.18)';
        ctx.beginPath(); ctx.moveTo(sx - half * 1.02, yy); ctx.lineTo(sx + half * 1.02, yy); ctx.stroke();
      }
      // ladder in exit shaft
      if (isExit && depth > 40) {
        ctx.strokeStyle = 'rgba(200,205,200,.28)';
        ctx.lineWidth = 1;
        const lx = sx + half * 0.55;
        ctx.beginPath(); ctx.moveTo(lx, v.groundY + 4); ctx.lineTo(lx, v.groundY + depth - 4); ctx.stroke();
        for (let yy = v.groundY + 10; yy < v.groundY + depth - 6; yy += 9) {
          ctx.beginPath(); ctx.moveTo(lx - 3, yy); ctx.lineTo(lx + 3, yy); ctx.stroke();
        }
      }
      // target at exit
      if (isExit) {
        const ty = this.Y(c.exitDepth);
        ctx.strokeStyle = 'rgba(94,214,255,.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, ty, 9, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, ty, 3, 0, TAU); ctx.stroke();
      }
      // label
      ctx.fillStyle = 'rgba(7,16,23,.86)';
      ctx.strokeStyle = isExit ? 'rgba(94,214,255,.5)' : 'rgba(255,177,92,.45)';
      ctx.lineWidth = 1;
      const tw = 44, th = 15;
      const ly = Math.min(v.groundY + depth + 6, this.h - 22);
      this.rr(ctx, sx - tw / 2, ly, tw, th, 4);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = isExit ? '#9fe6ff' : '#ffc27a';
      ctx.font = 'bold 7px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label, sx, ly + 10);
      ctx.restore();
    };
    drawPit(0, 'ВХОД', false);
    drawPit(c.length, 'ВЫХОД', true);
  }

  drawEquipment(ctx, v, game, t) {
    const gy = v.groundY;
    const s = v.narrow ? 0.72 : 1;
    const entry = this.X(0);
    const exit = this.X(game.contract.length);
    ctx.save();

    // gravel pad
    if (game.stage === 'prep') {
      const padL = this.X(v.narrow ? -12 : -17), padR = this.X(6);
      ctx.fillStyle = 'rgba(104,99,88,.42)';
      ctx.fillRect(padL, gy - 1, Math.max(0, padR - padL), 6);
    }

    // fence behind
    this.drawFence(ctx, v, game, s);

    // trailer + truck (wide only)
    if (!v.narrow) {
      this.drawTrailer(ctx, this.X(-23), gy, s);
      this.drawTruck(ctx, this.X(-18.5), gy, s);
    }

    // water tank + mud tank
    if (!v.narrow) this.drawWaterTank(ctx, this.X(-14.5), gy, s);
    this.drawMudTank(ctx, this.X(v.narrow ? -10.6 : -11.3), gy, s, t);

    // rod rack
    this.drawRodRack(ctx, this.X(v.narrow ? -7.4 : -7.8), gy, s);

    // spoil pile
    this.drawSpoil(ctx, this.X(4.4), gy, s);

    // rig
    this.drawRig(ctx, this.X(v.narrow ? -5.1 : -5.2), entry, gy, s, t, game);

    // exit equipment
    if (!v.narrow && exit < this.w + 90) {
      this.drawExcavator(ctx, exit + 30 * s, gy, s * 0.8);
    }
    this.cone(ctx, exit - 10 * s, gy, s);
    this.cone(ctx, exit + 10 * s, gy, s);
    this.cone(ctx, entry - 16 * s, gy, s);
    this.cone(ctx, entry + 15 * s, gy, s);
    ctx.restore();
  }

  drawFence(ctx, v, game, s) {
    const gy = v.groundY;
    const x0 = Math.max(-10, v.x0), x1 = Math.min(game.contract.length + 3, v.x1);
    if (x1 <= x0) return;
    const step = 3.2;
    ctx.save();
    ctx.strokeStyle = 'rgba(180,195,200,.18)';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(x0 / step) * step; x < x1; x += step) {
      const sx = this.X(x);
      ctx.beginPath(); ctx.moveTo(sx, gy - 17 * s); ctx.lineTo(sx, gy - 1); ctx.stroke();
    }
    const a = this.X(Math.ceil(x0 / step) * step), b = this.X(x1);
    ctx.strokeStyle = 'rgba(180,195,200,.11)';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.moveTo(a, gy - (5 + k * 5) * s); ctx.lineTo(b, gy - (5 + k * 5) * s); ctx.stroke();
    }
    ctx.restore();
  }

  drawTrailer(ctx, x, gy, s) {
    ctx.save();
    ctx.fillStyle = '#c9d2d3';
    this.rr(ctx, x - 34 * s, gy - 44 * s, 68 * s, 40 * s, 3 * s); ctx.fill();
    ctx.fillStyle = '#8f9b9e';
    ctx.fillRect(x - 34 * s, gy - 50 * s, 68 * s, 7 * s);
    ctx.fillStyle = '#33434c';
    this.rr(ctx, x - 24 * s, gy - 34 * s, 18 * s, 18 * s, 2 * s); ctx.fill();
    this.rr(ctx, x + 4 * s, gy - 34 * s, 16 * s, 25 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#b9c2c3';
    ctx.fillRect(x - 28 * s, gy - 4 * s, 56 * s, 4 * s);
    ctx.fillStyle = '#1a2226';
    ctx.beginPath(); ctx.arc(x - 20 * s, gy, 4 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 20 * s, gy, 4 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,122,26,.9)';
    ctx.fillRect(x - 34 * s, gy - 26 * s, 2 * s, 20 * s);
    ctx.restore();
  }

  drawTruck(ctx, x, gy, s) {
    ctx.save();
    // flatbed
    ctx.fillStyle = '#263137';
    this.rr(ctx, x - 42 * s, gy - 18 * s, 78 * s, 12 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#39464d';
    ctx.fillRect(x - 40 * s, gy - 16 * s, 74 * s, 2 * s);
    // cab
    const g = ctx.createLinearGradient(0, gy - 46 * s, 0, gy - 14 * s);
    g.addColorStop(0, '#e7ecec'); g.addColorStop(1, '#b7c1c2');
    ctx.fillStyle = g;
    this.rr(ctx, x + 32 * s, gy - 40 * s, 30 * s, 26 * s, 3 * s); ctx.fill();
    ctx.fillStyle = '#34464f';
    this.rr(ctx, x + 38 * s, gy - 36 * s, 18 * s, 12 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#21292c';
    ctx.beginPath(); ctx.arc(x - 28 * s, gy, 5 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 14 * s, gy, 5 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 46 * s, gy, 5 * s, 0, TAU); ctx.fill();
    // pipe load
    ctx.fillStyle = '#2c2e2f';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x - 38 * s, gy - (22 + i * 3) * s, 64 * s, 2.4 * s);
      ctx.fillStyle = i === 0 ? '#315c74' : '#2c2e2f';
    }
    ctx.fillStyle = 'rgba(255,122,26,.85)';
    ctx.fillRect(x + 32 * s, gy - 30 * s, 2 * s, 16 * s);
    ctx.restore();
  }

  drawWaterTank(ctx, x, gy, s) {
    ctx.save();
    ctx.fillStyle = '#9fb3b7';
    this.rr(ctx, x - 26 * s, gy - 25 * s, 52 * s, 21 * s, 10 * s); ctx.fill();
    ctx.fillStyle = '#c8d5d7';
    this.rr(ctx, x - 24 * s, gy - 24 * s, 48 * s, 5 * s, 3 * s); ctx.fill();
    ctx.fillStyle = 'rgba(30,45,50,.5)';
    ctx.font = `bold ${7 * s}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('WATER', x, gy - 11 * s);
    ctx.strokeStyle = 'rgba(190,210,215,.4)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(x + 26 * s, gy - 8 * s); ctx.quadraticCurveTo(x + 44 * s, gy - 8 * s, x + 40 * s, gy - 2 * s); ctx.stroke();
    ctx.restore();
  }

  drawMudTank(ctx, x, gy, s, t) {
    ctx.save();
    // frame
    ctx.fillStyle = '#202b31';
    this.rr(ctx, x - 30 * s, gy - 28 * s, 62 * s, 24 * s, 4 * s); ctx.fill();
    const g = ctx.createLinearGradient(0, gy - 28 * s, 0, gy - 5 * s);
    g.addColorStop(0, '#2d6e88'); g.addColorStop(1, '#1a4458');
    ctx.fillStyle = g;
    this.rr(ctx, x - 27 * s, gy - 26 * s, 50 * s, 16 * s, 6 * s); ctx.fill();
    ctx.fillStyle = 'rgba(125,211,167,.85)';
    ctx.fillRect(x - 24 * s, gy - 24 * s, 44 * s, 2 * s);
    ctx.fillStyle = 'rgba(220,245,250,.8)';
    ctx.font = `bold ${6.5 * s}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('MUD', x - 2 * s, gy - 14 * s);
    // pump
    ctx.fillStyle = '#3a4a51';
    this.rr(ctx, x + 25 * s, gy - 19 * s, 16 * s, 15 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath(); ctx.arc(x + 33 * s, gy - 11 * s, 4 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#15190f';
    ctx.beginPath(); ctx.arc(x + 33 * s, gy - 11 * s, 1.6 * s, 0, TAU); ctx.fill();
    // hose
    ctx.strokeStyle = 'rgba(23,30,32,.9)';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(x + 40 * s, gy - 9 * s);
    ctx.bezierCurveTo(x + 68 * s, gy - 2 * s, x + 78 * s, gy - 26 * s, x + 96 * s, gy - 20 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(125,211,167,.25)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    // level bubbles
    for (let i = 0; i < 3; i++) {
      const bx = x - 20 * s + ((t * 8 + i * 13) % 38) * s;
      ctx.fillStyle = 'rgba(160,230,235,.35)';
      ctx.beginPath(); ctx.arc(bx, gy - 20 * s + Math.sin(t * 3 + i) * 1.5, 1.4 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawRodRack(ctx, x, gy, s) {
    ctx.save();
    ctx.fillStyle = '#3b3630';
    this.rr(ctx, x - 24 * s, gy - 8 * s, 52 * s, 5 * s, 2 * s); ctx.fill();
    ctx.strokeStyle = '#6e5c37';
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#b58a37' : '#c79a3f';
      this.rr(ctx, x - 26 * s, gy - (12 + i * 4.6) * s, 54 * s, 3.4 * s, 2 * s); ctx.fill();
    }
    ctx.fillStyle = 'rgba(20,25,28,.9)';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x - 26 * s, gy - (10.3 + i * 4.6) * s, 1.7 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  drawSpoil(ctx, x, gy, s) {
    ctx.save();
    const g = ctx.createLinearGradient(0, gy - 22 * s, 0, gy);
    g.addColorStop(0, '#6b553d'); g.addColorStop(1, '#463726');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, gy);
    ctx.quadraticCurveTo(x - 12 * s, gy - 18 * s, x, gy - 21 * s);
    ctx.quadraticCurveTo(x + 13 * s, gy - 18 * s, x + 20 * s, gy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,180,.16)';
    ctx.beginPath(); ctx.arc(x - 4 * s, gy - 12 * s, 2 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 7 * s, gy - 7 * s, 1.4 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  cone(ctx, x, gy, s) {
    ctx.save();
    ctx.fillStyle = '#e2621e';
    ctx.beginPath(); ctx.moveTo(x, gy - 12 * s); ctx.lineTo(x + 4.5 * s, gy); ctx.lineTo(x - 4.5 * s, gy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2f2ea';
    ctx.fillRect(x - 2.5 * s, gy - 6 * s, 5 * s, 1.8 * s);
    ctx.fillStyle = '#33251a';
    ctx.fillRect(x - 5 * s, gy - 1 * s, 10 * s, 1.5 * s);
    ctx.restore();
  }

  drawExcavator(ctx, x, gy, s) {
    ctx.save();
    ctx.fillStyle = '#2b3033';
    this.rr(ctx, x - 18 * s, gy - 11 * s, 38 * s, 10 * s, 4 * s); ctx.fill();
    ctx.fillStyle = '#e07a20';
    this.rr(ctx, x - 14 * s, gy - 25 * s, 26 * s, 15 * s, 3 * s); ctx.fill();
    ctx.fillStyle = '#2e3d44';
    this.rr(ctx, x - 2 * s, gy - 23 * s, 11 * s, 9 * s, 2 * s); ctx.fill();
    ctx.strokeStyle = '#c96a18';
    ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(x + 8 * s, gy - 21 * s); ctx.lineTo(x + 28 * s, gy - 30 * s); ctx.lineTo(x + 32 * s, gy - 8 * s); ctx.stroke();
    ctx.fillStyle = '#4a4a45';
    ctx.beginPath(); ctx.arc(x + 32 * s, gy - 7 * s, 5 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  drawRig(ctx, x, entry, gy, s, t, game) {
    ctx.save();
    const bob = Math.sin(t * 1.4) * 0.5 * s;
    const orange = ctx.createLinearGradient(0, gy - 60 * s, 0, gy - 20 * s);
    orange.addColorStop(0, '#ff9a3d');
    orange.addColorStop(1, '#d95a06');

    // tracks
    ctx.fillStyle = '#151b1e';
    this.rr(ctx, x - 72 * s, gy - 21 * s + bob, 118 * s, 21 * s, 9 * s); ctx.fill();
    ctx.strokeStyle = '#313b40';
    ctx.lineWidth = 1.2 * s;
    this.rr(ctx, x - 72 * s, gy - 21 * s + bob, 118 * s, 21 * s, 9 * s); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#283237';
      ctx.beginPath(); ctx.arc(x - 59 * s + i * 23 * s, gy - 10 * s + bob, 6 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#46525a';
      ctx.beginPath(); ctx.arc(x - 59 * s + i * 23 * s, gy - 10 * s + bob, 2.4 * s, 0, TAU); ctx.fill();
    }

    // body
    ctx.fillStyle = orange;
    this.rr(ctx, x - 64 * s, gy - 60 * s + bob, 102 * s, 40 * s, 6 * s); ctx.fill();
    ctx.fillStyle = 'rgba(30,18,8,.85)';
    ctx.fillRect(x - 64 * s, gy - 28 * s + bob, 102 * s, 5 * s);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(x - 60 * s, gy - 57 * s + bob, 94 * s, 2 * s);
    // vents
    ctx.fillStyle = 'rgba(30,20,12,.55)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 44 * s + i * 6 * s, gy - 51 * s + bob, 3 * s, 14 * s);
    // brand
    ctx.fillStyle = 'rgba(25,14,6,.9)';
    ctx.font = `900 ${10 * s}px system-ui`;
    ctx.textAlign = 'left';
    ctx.fillText('AVTO-M', x - 29 * s, gy - 35 * s + bob);
    ctx.fillStyle = 'rgba(25,14,6,.55)';
    ctx.font = `700 ${6 * s}px system-ui`;
    ctx.fillText('D24', x + 12 * s, gy - 35 * s + bob);

    // cab
    ctx.fillStyle = '#20282c';
    this.rr(ctx, x + 20 * s, gy - 94 * s + bob, 34 * s, 38 * s, 5 * s); ctx.fill();
    const glass = ctx.createLinearGradient(x + 24 * s, gy - 90 * s, x + 50 * s, gy - 60 * s);
    glass.addColorStop(0, 'rgba(120,210,235,.8)');
    glass.addColorStop(1, 'rgba(30,80,100,.8)');
    ctx.fillStyle = glass;
    this.rr(ctx, x + 24 * s, gy - 90 * s + bob, 26 * s, 22 * s, 3 * s); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.moveTo(x + 27 * s, gy - 88 * s + bob); ctx.lineTo(x + 34 * s, gy - 88 * s + bob); ctx.lineTo(x + 27 * s, gy - 74 * s + bob); ctx.closePath(); ctx.fill();

    // mast pivot -> entry
    const pivX = x - 18 * s, pivY = gy - 58 * s + bob;
    const tipX = entry + 7 * s, tipY = gy - 8 * s;
    const ang = Math.atan2(tipY - pivY, tipX - pivX);
    const len = Math.hypot(tipX - pivX, tipY - pivY);
    ctx.save();
    ctx.translate(pivX, pivY);
    ctx.rotate(ang);
    // mast body
    ctx.fillStyle = '#262e32';
    ctx.fillRect(-6 * s, -13 * s, len + 10 * s, 12 * s);
    ctx.fillStyle = '#39464c';
    ctx.fillRect(-4 * s, -11 * s, len + 6 * s, 3 * s);
    ctx.fillStyle = '#ff7a1a';
    ctx.fillRect(-4 * s, -4 * s, len + 6 * s, 2.2 * s);
    // rails
    ctx.fillStyle = '#545f64';
    ctx.fillRect(-5 * s, -16 * s, len + 8 * s, 2 * s);
    // carriage
    const cp = game.stage === 'prep' ? 0.45 : 0.62;
    const cx = len * cp;
    ctx.fillStyle = '#d95f08';
    this.rr(ctx, cx - 7 * s, -18 * s, 18 * s, 16 * s, 2 * s); ctx.fill();
    ctx.fillStyle = '#8f9599';
    ctx.beginPath(); ctx.arc(cx + 2 * s, -9 * s, 4 * s, 0, TAU); ctx.fill();
    // hydraulic cylinder
    ctx.fillStyle = '#7b8588';
    ctx.fillRect(len * 0.22, 2 * s, len * 0.38, 3.4 * s);
    ctx.fillStyle = '#c7ced0';
    ctx.fillRect(len * 0.22, 2.8 * s, len * 0.38, 1.1 * s);
    ctx.restore();

    // drill string into pit
    ctx.strokeStyle = '#8b9599';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(entry + 3 * s, gy + 3 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,200,120,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // beacon
    const blink = 0.55 + Math.sin(t * 5) * 0.45;
    ctx.fillStyle = `rgba(255,170,60,${blink})`;
    ctx.shadowColor = '#ff9a3d';
    ctx.shadowBlur = 12 * blink;
    ctx.beginPath(); ctx.arc(x + 50 * s, gy - 96 * s + bob, 3 * s, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;

    // exhaust
    ctx.fillStyle = '#2b3438';
    ctx.fillRect(x - 60 * s, gy - 72 * s + bob, 4 * s, 13 * s);
    ctx.fillStyle = 'rgba(190,200,200,.12)';
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.4 + i * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(x - 58 * s + ph * 16 * s, gy - 74 * s - ph * 18 * s, (3 + ph * 6) * s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  crewLayout(game, v) {
    const c = game.contract;
    const positions = {
      operator: { x: this.X(-1.6) },
      locator: { x: this.X(c.length * 0.44) },
      mud: { x: this.X(v.narrow ? -9.4 : -10.3) },
      mechanic: { x: this.X(v.narrow ? -6.6 : -7.1) },
      foreman: { x: this.X(8.5) }
    };
    if (game.stage === 'pilot' && game.head) {
      positions.locator.x = this.X(Math.min(c.length, game.head.x + 1.6));
    }
    if (game.stage === 'mud') {
      positions.locator.x = this.X(c.length * 0.66);
      positions.foreman.x = this.X(c.length - 2.4);
    }
    if (game.stage === 'ream') {
      positions.foreman.x = this.X(c.length - 2.6);
      positions.mechanic.x = this.X(-3.4);
      positions.locator.x = this.X(c.length * 0.55);
    }
    if (game.stage === 'pull') {
      positions.foreman.x = this.X(2.2);
      positions.locator.x = this.X(c.length * 0.5);
      positions.mud.x = this.X(v.narrow ? -9.4 : -10.3);
    }
    return positions;
  }

  drawCrew(ctx, v, game, t) {
    if (!game.crew) return;
    const active = {
      prep: ['foreman'], pilot: ['operator', 'locator'], mud: ['mud', 'foreman'],
      ream: ['operator', 'mechanic'], pull: ['operator', 'foreman'], results: []
    }[game.stage] || [];
    const pos = this.crewLayout(game, v);
    const s = v.narrow ? 0.6 : 0.82;
    const order = ['mud', 'mechanic', 'foreman', 'operator', 'locator'];
    for (const id of order) {
      const m = game.crew[id];
      if (!m) continue;
      const role = ROLES.find(r => r.id === id);
      const p = pos[id];
      if (!p || p.x < -60 || p.x > this.w + 60) continue;
      const isActive = active.includes(id);
      this.drawWorker(ctx, p.x, v.groundY, s, {
        role, name: m.name, active: isActive, t,
        pose: this.poseFor(id, game, t),
        label: !this.demo && isActive,
        moving: id === 'locator' && game.stage === 'pilot'
      });
    }

    // sonde link locator -> head
    if (game.stage === 'pilot' && game.head) {
      const lp = pos.locator;
      const hx = this.X(game.head.x), hy = this.Y(game.head.d);
      ctx.save();
      ctx.strokeStyle = 'rgba(94,214,255,.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(lp.x, v.groundY - 30 * s);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.setLineDash([]);
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      ctx.fillStyle = `rgba(94,214,255,${0.35 + pulse * 0.4})`;
      ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  poseFor(id, game, t) {
    if (id === 'locator') return game.stage === 'pilot' ? 'wand' : 'idle';
    if (id === 'mud') return game.stage === 'mud' ? 'hose' : 'idle';
    if (id === 'mechanic') return game.stage === 'ream' ? 'wrench' : 'idle';
    if (id === 'operator') return 'console';
    if (id === 'foreman') return 'tablet';
    return 'idle';
  }

  drawWorker(ctx, x, gy, s, o) {
    const t = o.t || 0;
    const walk = o.moving ? Math.sin(t * 8) : 0;
    const bob = Math.sin(t * 2.1 + x * 0.02) * 0.8 * s;
    const col = o.role?.color || '#ffb15c';
    ctx.save();

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(x, gy + 1, 13 * s, 3.4 * s, 0, 0, TAU); ctx.fill();

    if (o.active) {
      const p = 0.5 + Math.sin(t * 3) * 0.5;
      ctx.strokeStyle = `rgba(255,177,92,${0.25 + p * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, gy, 15 * s, 4 * s, 0, 0, TAU); ctx.stroke();
    }

    const hip = gy - 20 * s + bob;
    const shoulder = gy - 36 * s + bob;
    ctx.lineCap = 'round';

    // legs
    ctx.strokeStyle = '#232d33';
    ctx.lineWidth = 4.6 * s;
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, hip); ctx.lineTo(x - 4 * s + walk * 4 * s, gy - 1);
    ctx.moveTo(x + 3 * s, hip); ctx.lineTo(x + 5 * s - walk * 4 * s, gy - 1);
    ctx.stroke();
    // boots
    ctx.fillStyle = '#171c1f';
    ctx.fillRect(x - 7 * s + walk * 4 * s, gy - 2 * s, 6.5 * s, 2.4 * s);
    ctx.fillRect(x + 2.4 * s - walk * 4 * s, gy - 2 * s, 6.5 * s, 2.4 * s);

    // torso / hi-vis vest
    ctx.fillStyle = '#2f3a40';
    this.rr(ctx, x - 7 * s, shoulder, 14 * s, 17 * s, 3 * s); ctx.fill();
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.82;
    this.rr(ctx, x - 6.5 * s, shoulder + 1 * s, 13 * s, 14 * s, 2.5 * s); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(240,245,235,.72)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, shoulder + 8 * s); ctx.lineTo(x + 6 * s, shoulder + 8 * s);
    ctx.moveTo(x, shoulder + 2 * s); ctx.lineTo(x, shoulder + 14 * s);
    ctx.stroke();

    // head
    ctx.fillStyle = '#c99873';
    ctx.beginPath(); ctx.arc(x, shoulder - 8 * s, 5.4 * s, 0, TAU); ctx.fill();
    // helmet
    ctx.fillStyle = o.active ? '#ffd36b' : '#e8e3cf';
    ctx.beginPath();
    ctx.arc(x, shoulder - 9.5 * s, 6.2 * s, Math.PI * 1.03, Math.PI * 1.97);
    ctx.lineTo(x + 6.2 * s, shoulder - 8 * s);
    ctx.lineTo(x - 6.2 * s, shoulder - 8 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x - 6.4 * s, shoulder - 8.6 * s, 12.8 * s, 1.4 * s);

    // arms by pose
    ctx.strokeStyle = col;
    ctx.lineWidth = 3.2 * s;
    const armY = shoulder + 3 * s;
    if (o.pose === 'tablet') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 9 * s, armY + 7 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 9 * s, armY + 6 * s);
      ctx.stroke();
      ctx.fillStyle = '#1a252b';
      this.rr(ctx, x - 10 * s, armY + 6 * s, 20 * s, 8 * s, 1.5 * s); ctx.fill();
      ctx.fillStyle = 'rgba(94,214,255,.5)';
      ctx.fillRect(x - 8 * s, armY + 7 * s, 15 * s, 5 * s);
    } else if (o.pose === 'wand') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 8 * s, armY + 8 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 13 * s, armY - 1 * s);
      ctx.stroke();
      ctx.strokeStyle = '#9fb6c0';
      ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(x + 13 * s, armY - 2 * s); ctx.lineTo(x + 15 * s, armY + 8 * s); ctx.stroke();
      ctx.fillStyle = 'rgba(94,214,255,.8)';
      ctx.beginPath(); ctx.arc(x + 15 * s, armY + 8 * s, 2 * s, 0, TAU); ctx.fill();
    } else if (o.pose === 'hose') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 10 * s, armY + 9 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 11 * s, armY + 6 * s);
      ctx.stroke();
      ctx.strokeStyle = '#1b2326';
      ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(x + 11 * s, armY + 6 * s); ctx.quadraticCurveTo(x + 18 * s, armY + 10 * s, x + 20 * s, gy - 4 * s); ctx.stroke();
    } else if (o.pose === 'wrench') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 9 * s, armY + 8 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 10 * s, armY + 7 * s);
      ctx.stroke();
      ctx.strokeStyle = '#c7d0d3';
      ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(x + 10 * s, armY + 7 * s); ctx.lineTo(x + 15 * s, armY + 10 * s); ctx.stroke();
    } else if (o.pose === 'console') {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 10 * s, armY + 6 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 10 * s, armY + 5 * s);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, armY); ctx.lineTo(x - 8 * s, armY + 9 * s);
      ctx.moveTo(x + 5 * s, armY); ctx.lineTo(x + 8 * s, armY + 9 * s);
      ctx.stroke();
    }

    // label
    if (o.label) {
      const txt = o.name || o.role?.short || '';
      ctx.font = `700 ${vFont(s)}px system-ui`;
      const w = ctx.measureText(txt).width + 15 * s;
      const lx = x - w / 2, ly = shoulder - 27 * s;
      ctx.fillStyle = o.active ? 'rgba(10,20,27,.92)' : 'rgba(10,20,27,.66)';
      ctx.strokeStyle = o.active ? 'rgba(255,177,92,.55)' : 'rgba(164,195,214,.18)';
      ctx.lineWidth = 1;
      this.rr(ctx, lx, ly, w, 13 * s, 4 * s); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.active ? '#ffc27a' : 'rgba(200,215,225,.72)';
      ctx.textAlign = 'center';
      ctx.fillText(txt, x, ly + 9 * s);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(lx + 5 * s, ly + 6.5 * s, 1.8 * s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  pointAtX(path, x) {
    if (!path || !path.length) return { x, d: 0 };
    if (x <= path[0].x) return path[0];
    for (let i = 1; i < path.length; i++) {
      if (path[i].x >= x) {
        const a = path[i - 1], b = path[i];
        const t = (x - a.x) / Math.max(0.0001, b.x - a.x);
        return { x, d: lerp(a.d, b.d, t) };
      }
    }
    return path[path.length - 1];
  }

  toolAngle(v, pitchDeg) {
    const r = pitchDeg * Math.PI / 180;
    return Math.atan2(Math.sin(r) * v.sy, Math.cos(r) * v.sx);
  }

  drawTools(ctx, v, game, t) {
    const c = game.contract;
    if (game.stage === 'pilot' && game.head) {
      const x = this.X(game.head.x), y = this.Y(game.head.d);
      const ang = this.toolAngle(v, game.head.pitch || 0);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      const scale = clamp(v.sy / 26, 0.85, 1.5);
      // body
      ctx.fillStyle = '#2f3a3f';
      this.rr(ctx, -20 * scale, -5 * scale, 20 * scale, 10 * scale, 3 * scale); ctx.fill();
      ctx.fillStyle = '#58656a';
      this.rr(ctx, -20 * scale, -4 * scale, 18 * scale, 3 * scale, 1.5 * scale); ctx.fill();
      // orange band
      ctx.fillStyle = '#ff7a1a';
      ctx.fillRect(-13 * scale, -5 * scale, 3 * scale, 10 * scale);
      // nose
      ctx.fillStyle = '#aab4b6';
      ctx.beginPath();
      ctx.moveTo(0, -5 * scale);
      ctx.lineTo(9 * scale, 0);
      ctx.lineTo(0, 5 * scale);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3c464a';
      ctx.beginPath();
      ctx.moveTo(2 * scale, -2.6 * scale);
      ctx.lineTo(7 * scale, 0);
      ctx.lineTo(2 * scale, 2.6 * scale);
      ctx.closePath(); ctx.fill();
      // sonde
      ctx.fillStyle = `rgba(94,214,255,${0.65 + Math.sin(t * 5) * 0.3})`;
      ctx.shadowColor = '#5ed6ff';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(-9 * scale, 0, 2 * scale, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    if (game.stage === 'ream') {
      const p = clamp(game.stageData?.progress || 0, 0, 100);
      const leadX = c.length * (1 - p / 100);
      const pt = this.pointAtX(game.path, leadX);
      const x = this.X(pt.x), y = this.Y(pt.d);
      const ratio = game.reamer?.ratio || 1.35;
      const r = clamp(9 + ratio * 10, 13, 30);
      // cuttings cloud
      for (let i = 0; i < 9; i++) {
        const a = t * 2 + i * 0.7;
        ctx.fillStyle = `rgba(150,120,85,${0.15 + 0.12 * Math.sin(a)})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 5), 2 + (i % 3), 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3);
      ctx.fillStyle = '#323c41';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff8a2b';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, TAU); ctx.fill();
      ctx.fillStyle = '#20282c';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.36, 0, TAU); ctx.fill();
      // teeth
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        ctx.fillStyle = i % 2 ? '#c7d0d2' : '#8d999d';
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(r * 0.9, -2.6); ctx.lineTo(r + 5, 0); ctx.lineTo(r * 0.9, 2.6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // rods behind tool to entry
      ctx.strokeStyle = 'rgba(120,132,138,.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(this.X(0), this.Y(game.path[0]?.d || 0)); ctx.lineTo(x, y); ctx.stroke();
      ctx.setLineDash([]);
    }

    if (game.stage === 'pull') {
      const p = clamp(game.stageData?.progress || 0, 0, 100);
      const leadX = c.length * (1 - p / 100);
      const pts = game.path.filter(pt => pt.x >= leadX);
      if (pts.length > 1) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0a0d0f';
        ctx.lineWidth = 7;
        ctx.beginPath();
        pts.forEach((pt, i) => {
          const px = this.X(pt.x), py = this.Y(pt.d);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        });
        ctx.stroke();
        ctx.strokeStyle = '#2b4d63';
        ctx.lineWidth = 4.2;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(94,214,255,.65)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }
      const pt = this.pointAtX(game.path, leadX);
      const x = this.X(pt.x), y = this.Y(pt.d);
      // swivel
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = '#c6a13e';
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a3134';
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }

  drawFx(ctx, v, game, t) {
    const fx = game.fx || {};
    const c = game.contract;
    // scan sweep
    if (fx.scan > 0) {
      const p = 1 - clamp(fx.scan / 2.6, 0, 1);
      const x = this.X(c.length * p);
      ctx.save();
      const g = ctx.createLinearGradient(x - 40, 0, x + 10, 0);
      g.addColorStop(0, 'rgba(94,214,255,0)');
      g.addColorStop(1, 'rgba(94,214,255,.4)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 40, v.groundY, 50, this.h - v.groundY);
      ctx.strokeStyle = 'rgba(94,214,255,.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, v.groundY); ctx.lineTo(x, this.h); ctx.stroke();
      ctx.strokeStyle = 'rgba(94,214,255,.18)';
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.ellipse(x, this.Y(1.3 * i), 20 + i * 12, 8 + i * 4, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }

    // frac-out fountain
    if (fx.frac > 0) {
      const fxp = fx.fracX != null ? this.X(fx.fracX) : this.X(c.length);
      ctx.save();
      for (let i = 0; i < 22; i++) {
        const ph = (t * 1.2 + i * 0.13) % 1;
        const spread = (i % 2 ? 1 : -1) * ph * 26;
        ctx.fillStyle = `rgba(150,160,120,${(1 - ph) * 0.55})`;
        ctx.beginPath();
        ctx.arc(fxp + spread, v.groundY - Math.sin(ph * Math.PI) * (18 + (i % 4) * 7), 2 + ph * 3, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(150,160,120,.25)';
      ctx.beginPath(); ctx.ellipse(fxp, v.groundY + 2, 30, 7, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // mud returns at exit during circulation
    if (game.stage === 'mud' && game.stageData?.pumping) {
      const ex = this.X(c.length);
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const ph = (t * 1.6 + i * 0.29) % 1;
        ctx.fillStyle = `rgba(125,211,167,${(1 - ph) * 0.5})`;
        ctx.beginPath();
        ctx.arc(ex + Math.sin(ph * 7 + i) * 8, v.groundY - 3 - Math.sin(ph * Math.PI) * 17, 1.6 + ph * 2.4, 0, TAU);
        ctx.fill();
      }
      const lvl = clamp((game.stageData?.pressure || 0) / 100, 0, 1);
      ctx.fillStyle = 'rgba(125,211,167,.18)';
      ctx.fillRect(ex + 12, v.groundY - 6 - lvl * 20, 4, lvl * 20);
      ctx.restore();
    }

    // dust near reamer
    if (game.stage === 'ream' || game.stage === 'pull') {
      const p = clamp(game.stageData?.progress || 0, 0, 100);
      const leadX = c.length * (1 - p / 100);
      const pt = this.pointAtX(game.path, leadX);
      const x = this.X(pt.x), y = this.Y(pt.d);
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const ph = (t * 0.7 + i * 0.2) % 1;
        ctx.fillStyle = `rgba(180,150,110,${(1 - ph) * 0.14})`;
        ctx.beginPath(); ctx.arc(x + Math.sin(i * 2 + t) * 12 + ph * 10, y - ph * 14, 2 + ph * 5, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }

  drawUtilityLabels(ctx, v, game) {
    const utils = game.utilities || [];
    ctx.save();
    for (const u of utils) {
      if (u.revealed === false || u.detected) continue;
      const x = this.X(u.x);
      if (x < -50 || x > this.w + 50) continue;
      const y = this.Y(u.depth);
      if (y > this.h - 10) continue;
      const depth = fmtDepth(u.depth);
      const txt = v.narrow ? `${UTILITY_TYPES[u.type]?.short || 'СЕТЬ'} ${depth}` : `${u.label} · ${depth} м`;
      ctx.font = '600 8px system-ui';
      const w = ctx.measureText(txt).width + 16;
      const lx = clamp(x - w / 2, 4, this.w - w - 4);
      let ly = y - 26;
      if (ly < v.groundY + 8) ly = y + 20;
      ctx.fillStyle = 'rgba(7,16,23,.88)';
      ctx.strokeStyle = u.color + '';
      ctx.globalAlpha = 0.9;
      this.rr(ctx, lx, ly, w, 14, 4); ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = u.color;
      ctx.beginPath(); ctx.arc(lx + 6, ly + 7, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d7e3ea';
      ctx.textAlign = 'left';
      ctx.fillText(txt, lx + 11, ly + 9.6);
    }
    ctx.restore();
  }
}

function fmtDepth(d) {
  return Number(d).toFixed(1).replace('.', ',');
}

function vFont(s) {
  return Math.max(6.5, 8.2 * s);
}

