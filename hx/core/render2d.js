import { area, fmt, doorRect, doorGeom, slideRect } from './geometry.js';
import { furnSVG } from '../data/furniture.js';
import { MATS } from '../data/materials.js';
import { ROOM_DEF } from '../data/rooms.js';
import { nm, tr } from '../data/i18n.js';
import { state, ui, view } from '../main.js';

const $ = s => document.querySelector(s);
const svg = $('#plan');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export function buildDefs(){
  const plank = (id,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="1800" height="360"><rect width="1800" height="360" fill="${base}"/><path d="M0 0H1800M0 180H1800M1200 0V180M600 180V360" stroke="${line}" stroke-width="10"/></pattern>`;
  const tile = (id,size,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${base}"/><path d="M0 0H${size}M0 0V${size}" stroke="${line}" stroke-width="10"/></pattern>`;
  $('#defs').innerHTML = plank('wood','#dcc09a','#bf9d70') + plank('walnut','#a57c56','#80593a') +
    tile('tile800',800,'#ece7de','#d3cabb') + tile('tile600',600,'#e2e6e3','#c4cbc6') + tile('antislip',300,'#d6dbd7','#b3bab4') +
    `<pattern id="m-marble" patternUnits="userSpaceOnUse" width="1200" height="1200"><rect width="1200" height="1200" fill="#f3f0ea"/><path d="M0 0H1200M0 0V1200" stroke="#dcd5c8" stroke-width="10"/></pattern>
     <pattern id="m-terrazzo" patternUnits="userSpaceOnUse" width="500" height="500"><rect width="500" height="500" fill="#e8e1d5"/></pattern>
     <pattern id="m-carpet" patternUnits="userSpaceOnUse" width="120" height="120"><rect width="120" height="120" fill="#c9c3d3"/></pattern>
     <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000"><path d="M500 0V1000M0 500H1000" stroke="#e5dfd3" stroke-width="8"/></pattern>`;
}

export function renderRooms(){
  let s = '';
  Object.entries(state.rooms).forEach(([id, r]) => {
    if (!r?.poly?.length) return;
    s += `<polygon class="room" data-room="${id}" points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="url(#m-${r.mat})"/>`;
  });
  const sill = ([a,b,c,d]) => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="#e2dacb" stroke="#b9b0a0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  state.doors.forEach(d => { const r = doorRect(state, d); if (r) s += sill([r.x0, r.y0, r.x1, r.y1]); });
  state.slides.forEach(d => { const r = slideRect(state, d); if (r) s += sill([r.x0, r.y0, r.x1, r.y1]); });
  $('#gRooms').innerHTML = s;
}

export function renderFurn(){
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  g.innerHTML = state.furniture.map(f => {
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = Math.min(f.w,f.d) >= 380 && !['plant','floorlamp','sidetable','barstool','beanbag'].includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="#4a443c" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>` : '';
    return `<g class="furn" data-fid="${f.id}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type,f.w,f.d,f.color)}${label}</g>`;
  }).join('');
}

export function renderWalls(){
  $('#gWalls').innerHTML = state.walls.map(w => {
    const dem = state.demolished.includes(w.id), T = w.type;
    let fill = T==='b' ? (ui.layers.bearing ? '#b8412c' : '#26241f') : T==='low' ? '#e9e3d8' : T==='e' ? '#8f897d' : '#a7a195';
    let ex = T==='low' ? 'stroke="#8f897d" stroke-width="1" vector-effect="non-scaling-stroke"' : '';
    if (dem){ fill = 'rgba(198,91,58,.12)'; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    const x = Math.min(w.x0, w.x1), y = Math.min(w.y0, w.y1), ww = Math.abs(w.x1-w.x0), hh = Math.abs(w.y1-w.y0);
    return `<rect class="wall" data-wall="${w.id}" x="${x}" y="${y}" width="${ww}" height="${hh}" fill="${fill}" ${ex}/>`;
  }).join('');
}

export function renderOpenings(){
  const WS = 'stroke="#4f7394" stroke-width="1" vector-effect="non-scaling-stroke"';
  let s = '';
  state.wins.forEach(({x0,y0,x1,y1}) => {
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f7fbfd" ${WS}/>`;
    if (w >= h) [1/3,2/3].forEach(t => s += `<line x1="${x0}" y1="${y0+h*t}" x2="${x1}" y2="${y0+h*t}" ${WS}/>`);
    else [1/3,2/3].forEach(t => s += `<line x1="${x0+w*t}" y1="${y0}" x2="${x0+w*t}" y2="${y1}" ${WS}/>`);
  });
  const DS = 'stroke="#3d3a34" stroke-width="1" vector-effect="non-scaling-stroke"';
  state.doors.forEach(d => {
    const g = doorGeom(state, d); if (!g) return;
    const [hx,hy] = g.h, L = g.len, T = 40;
    const ox = hx + g.o[0]*L, oy = hy + g.o[1]*L, cx = hx + g.c[0]*L, cy = hy + g.c[1]*L;
    const sweep = g.o[0]*g.c[1] - g.o[1]*g.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#b5653a' : '#3d3a34';
    s += `<polygon points="${hx},${hy} ${ox},${oy} ${ox+g.c[0]*T},${oy+g.c[1]*T} ${hx+g.c[0]*T},${hy+g.c[1]*T}" fill="#fff" stroke="${col}" stroke-width="${d.entry?1.8:1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  state.slides.forEach(d => {
    const r = slideRect(state, d); if (!r) return;
    const {x0,y0,x1,y1,vertical:v} = r;
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += `<rect x="${m-45}" y="${y0}" width="40" height="${L*.55}" fill="#fff" ${DS}/><rect x="${m+5}" y="${y1-L*.55}" width="40" height="${L*.55}" fill="#fff" ${DS}/>`; }
    else { const L = x1-x0, m = (y0+y1)/2; s += `<rect x="${x0}" y="${m-45}" width="${L*.55}" height="40" fill="#fff" ${DS}/><rect x="${x1-L*.55}" y="${m+5}" width="${L*.55}" height="40" fill="#fff" ${DS}/>`; }
  });
  $('#gOpen').innerHTML = s;
}

export function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  g.innerHTML = ROOM_DEF.map(def => {
    const r = state.rooms[def.id]; if (!r?.poly?.length) return '';
    const xs = r.poly.map(p=>p[0]), ys = r.poly.map(p=>p[1]);
    const x = (Math.min(...xs)+Math.max(...xs))/2, y = (Math.min(...ys)+Math.max(...ys))/2;
    const halo = 'stroke="#fbf9f4" stroke-width="45" paint-order="stroke" stroke-linejoin="round"';
    return `<text x="${x}" y="${y}" font-size="250" font-weight="600" text-anchor="middle" fill="#2b2824" ${halo}>${esc(nm(r.name))}</text>
      <text x="${x}" y="${y+260}" font-size="175" text-anchor="middle" fill="#7d7366" ${halo}>${fmt(area(r.poly))} m²</text>`;
  }).join('');
}

export function renderDims(){ /* 省略：静态标注，可保留为空 */ $('#gDims').setAttribute('display', 'none'); }

export function renderGrid(){
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}"/>`;
}

export function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a,b,tmp) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#2f5d62' : '#b5653a', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/><line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})" stroke="#fff" stroke-width="${3.5*k}" paint-order="stroke">${Math.round(L)} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a,m.b)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#2f5d62"/>`;
  $('#gMeasure').innerHTML = s;
}

export function renderSel(){
  const k = 1/view.s; let s = '';
  const hs = 1.2, hit = 12*k;
  if (ui.sel?.kind === 'furn'){
    const f = state.furniture.find(f => f.id === ui.sel.id);
    if (f){
      const p = 5*k, A = 'stroke="#b5653a" vector-effect="non-scaling-stroke"', ro = 26*k, sx = f.w/2+p, sy = f.d/2+p;
      s += `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5" pointer-events="none"/>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="#b5653a" pointer-events="none"/></g>`;
    }
  } else if (ui.sel?.kind === 'room'){
    const r = state.rooms[ui.sel.id];
    if (r?.poly?.length){
      s += `<polygon points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="rgba(181,101,58,.08)" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    }
  } else if (ui.sel?.kind === 'wall'){
    const w = state.walls.find(x => x.id === ui.sel.id);
    if (w){
      const p = 6*k, x = Math.min(w.x0,w.x1), y = Math.min(w.y0,w.y1), ww = Math.abs(w.x1-w.x0), hh = Math.abs(w.y1-w.y0);
      s += `<rect x="${x-p}" y="${y-p}" width="${ww+2*p}" height="${hh+2*p}" fill="none" stroke="#2f5d62" stroke-width="1.5" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    }
  }
  $('#gSel').innerHTML = s;
}

export function renderAll(){
  renderGrid(); renderRooms(); renderFurn(); renderWalls(); renderOpenings(); renderLabels(); renderMeasure(); renderSel();
  window.__sync3D?.();
}