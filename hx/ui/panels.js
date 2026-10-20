import { state, ui, view, mutate, select } from '../main.js';
import { area, perim, bbox, fmt, wallLen } from '../core/geometry.js';
import { MATS } from '../data/materials.js';
import { ROOM_DEF } from '../data/rooms.js';
import { nm, tr } from '../data/i18n.js';
import { rebuildFromDims } from '../core/dims.js';
import { DIM_DEFAULT } from '../data/default-dims.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export function renderPanel(){
  const p = $('#panel');
  if (ui.sel?.kind === 'furn'){ const f = state.furniture.find(x => x.id === ui.sel.id); if (f){ p.innerHTML = furnPanel(f); bindFurnPanel(f); return; } }
  if (ui.sel?.kind === 'room'){ const r = state.rooms[ui.sel.id]; if (r){ p.innerHTML = roomPanel(ui.sel.id); bindRoomPanel(ui.sel.id); return; } }
  if (ui.sel?.kind === 'wall'){ const w = state.walls.find(x => x.id === ui.sel.id); if (w){ p.innerHTML = wallPanel(w); bindWallPanel(w); return; } }
  if (ui.sel?.kind === 'door'){ const d = state.doors.find(x => x.id === ui.sel.id); if (d){ p.innerHTML = doorPanel(d); bindDoorPanel(d); return; } }
  if (ui.sel?.kind === 'win'){ const w = state.wins.find(x => x.id === ui.sel.id); if (w){ p.innerHTML = winPanel(w); bindWinPanel(w); return; } }
  p.innerHTML = overviewPanel(); bindOverview();
}

function dimsSection(){
  const d = state.dims;
  return `<section><h3>${tr('户型整体尺寸','Overall Dimensions')}</h3>
    <div class="form">
      <label>${tr('总宽','Width')}<input type="number" id="dW" value="${d.W}" step="10"></label>
      <label>${tr('总高','Height')}<input type="number" id="dH" value="${d.H}" step="10"></label>
      <label>${tr('墙厚','Wall thickness')}<input type="number" id="dT" value="${d.t}" step="10"></label>
    </div>
    <div class="actions"><button class="btn" id="dApply">${tr('应用尺寸','Apply')}</button>
      <button class="btn danger" id="dReset">${tr('恢复默认','Reset')}</button></div>
  </section>`;
}
function bindDimsSection(){
  const apply = () => {
    const W = +$('#dW').value, Hh = +$('#dH').value, t = +$('#dT').value;
    mutate(() => {
      const d = state.dims;
      if (W && W !== d.W){ const k = W/d.W; d.vx = d.vx.map(v => Math.round(v*k)); d.W = W; }
      if (Hh && Hh !== d.H){ const k = Hh/d.H; d.hy = d.hy.map(v => Math.round(v*k)); d.H = Hh; }
      if (t) d.t = t;
      rebuildFromDims(state);
    });
  };
  $('#dW').onchange = apply; $('#dH').onchange = apply; $('#dT').onchange = apply;
  $('#dApply').onclick = apply;
  $('#dReset').onclick = () => mutate(() => {
    state.dims = { ...DIM_DEFAULT, vx:[...DIM_DEFAULT.vx], hy:[...DIM_DEFAULT.hy], seg:{...state.dims.seg} };
    rebuildFromDims(state);
  });
}

function overviewPanel(){
  const rows = ROOM_DEF.map(r => {
    const st = state.rooms[r.id]; if (!st?.poly?.length) return '';
    return `<tr class="click" data-room="${r.id}"><td><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(nm(st.name))}${r.counted===false?' *':''}</td><td class="r">${fmt(area(st.poly))} m²</td></tr>`;
  }).join('');
  const tot = ROOM_DEF.filter(r => r.counted !== false).reduce((a,r) => a + (state.rooms[r.id].poly ? area(state.rooms[r.id].poly) : 0), 0);
  return dimsSection() + `<section><h3>${tr('房间面积','Room Areas')}</h3><table>${rows}</table>
    <div class="total"><span>${tr('套内使用面积','Net area')}</span><b>${fmt(tot)} m²</b></div></section>
    <section><h3>${tr('方案统计','Stats')}</h3>
    <div class="stats"><div><small>${tr('家具数量','Furniture')}</small><span class="big">${state.furniture.length}</span></div>
      <div><small>${tr('墙体','Walls')}</small><span class="big">${state.walls.length}</span></div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${tr('清除测量','Clear measures')}</button></div></section>`;
}
function bindOverview(){
  bindDimsSection();
  document.querySelectorAll('#panel tr[data-room]').forEach(tr => tr.onclick = () => select({kind:'room', id:tr.dataset.room}));
  $('#clearMeasure').onclick = () => state.measures.length && mutate(() => state.measures = []);
}

function roomPanel(id){
  const r = state.rooms[id];
  const a = r.poly ? area(r.poly) : 0;
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===r.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>¥${m.price}/m²</small></span></button>`).join('');
  return `<section><h3>${tr('房间','Room')}</h3>
    <div class="form"><label class="full">${tr('名称','Name')}<input id="rName" value="${esc(nm(r.name))}"></label></div>
    <div class="stats" style="margin-top:10px"><div><small>${tr('面积','Area')}</small><span class="big">${fmt(a)}</span> m²</div>
      <div><small>${tr('周长','Perimeter')}</small><span class="big">${r.poly ? fmt(perim(r.poly),1) : 0}</span> m</div></div></section>
    <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div></section>
    <section><h3>${tr('返回','Back')}</h3><div class="actions"><button class="btn" id="back">${tr('← 返回总览','← Back')}</button></div></section>`;
}
function bindRoomPanel(id){
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
  $('#back').onclick = () => select(null);
}

function furnPanel(f){
  return `<section><h3>${tr('家具属性','Furniture')}</h3>
    <div class="form">
      <label class="full">${tr('名称','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <label>${tr('宽','W')}<input type="number" id="fW" value="${f.w}" min="50" step="10"></label>
      <label>${tr('深','D')}<input type="number" id="fD" value="${f.d}" min="50" step="10"></label>
      <label>X<input type="number" id="fX" value="${Math.round(f.cx)}" step="10"></label>
      <label>Y<input type="number" id="fY" value="${Math.round(f.cy)}" step="10"></label>
      <label>${tr('旋转','Rot')}<input type="number" id="fR" value="${f.rot}" step="15"></label>
      <label>${tr('颜色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="actions"><button class="btn danger" id="aDel">${tr('删除','Delete')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindFurnPanel(f){
  const upd = fn => mutate(() => { const g = state.furniture.find(x => x.id === f.id); if (g) fn(g); });
  const num = (id, fn) => $(id).onchange = e => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd(g => fn(g, v)); };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fW', (g,v) => g.w = Math.max(50, Math.round(v)));
  num('#fD', (g,v) => g.d = Math.max(50, Math.round(v)));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = v);
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  $('#aDel').onclick = () => { const id = f.id; ui.sel = null; mutate(() => state.furniture = state.furniture.filter(g => g.id !== id)); };
  $('#back').onclick = () => select(null);
}

function wallPanel(w){
  return `<section><h3>${tr('墙体','Wall')} <small>${w.id}</small></h3>
    <div class="form">
      <label>X0<input type="number" id="wX0" value="${Math.round(w.x0)}" step="10"></label>
      <label>Y0<input type="number" id="wY0" value="${Math.round(w.y0)}" step="10"></label>
      <label>X1<input type="number" id="wX1" value="${Math.round(w.x1)}" step="10"></label>
      <label>Y1<input type="number" id="wY1" value="${Math.round(w.y1)}" step="10"></label>
      <label class="full">${tr('类型','Type')}<select id="wType">
        <option value="n" ${w.type==='n'?'selected':''}>${tr('非承重','Non-bearing')}</option>
        <option value="b" ${w.type==='b'?'selected':''}>${tr('承重','Bearing')}</option>
        <option value="e" ${w.type==='e'?'selected':''}>${tr('外墙','Exterior')}</option>
        <option value="low" ${w.type==='low'?'selected':''}>${tr('矮墙','Low')}</option>
      </select></label>
    </div>
    <div class="muted" style="margin-top:8px">${tr('长度','Length')} ${Math.round(wallLen(w))} mm</div>
    <div class="actions"><button class="btn danger" id="wDel">${tr('删除墙体','Delete')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindWallPanel(w){
  const upd = fn => mutate(() => { const g = state.walls.find(x => x.id === w.id); if (g) fn(g); });
  $('#wX0').onchange = e => upd(g => g.x0 = +e.target.value);
  $('#wY0').onchange = e => upd(g => g.y0 = +e.target.value);
  $('#wX1').onchange = e => upd(g => g.x1 = +e.target.value);
  $('#wY1').onchange = e => upd(g => g.y1 = +e.target.value);
  $('#wType').onchange = e => upd(g => g.type = e.target.value);
  $('#wDel').onclick = () => { ui.sel = null; mutate(() => state.walls = state.walls.filter(x => x.id !== w.id)); };
  $('#back').onclick = () => select(null);
}

function doorPanel(d){
  return `<section><h3>${tr('门','Door')}</h3>
    <div class="form">
      <label>${tr('宽度','Len')}<input type="number" id="dLen" value="${d.len}" step="10"></label>
      <label>Offset<input type="number" id="dOff" value="${Math.round(d.offset)}" step="10"></label>
    </div>
    <div class="actions"><button class="btn danger" id="dDel">${tr('删除','Delete')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindDoorPanel(d){
  const upd = fn => mutate(() => { const g = state.doors.find(x => x.id === d.id); if (g) fn(g); });
  $('#dLen').onchange = e => upd(g => g.len = Math.max(200, +e.target.value));
  $('#dOff').onchange = e => upd(g => g.offset = Math.max(0, +e.target.value));
  $('#dDel').onclick = () => { ui.sel = null; mutate(() => state.doors = state.doors.filter(x => x.id !== d.id)); };
  $('#back').onclick = () => select(null);
}
function winPanel(w){
  return `<section><h3>${tr('窗','Window')}</h3>
    <div class="form">
      <label>X0<input type="number" id="nX0" value="${w.x0}" step="10"></label>
      <label>Y0<input type="number" id="nY0" value="${w.y0}" step="10"></label>
      <label>X1<input type="number" id="nX1" value="${w.x1}" step="10"></label>
      <label>Y1<input type="number" id="nY1" value="${w.y1}" step="10"></label>
    </div>
    <div class="actions"><button class="btn danger" id="nDel">${tr('删除','Delete')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindWinPanel(w){
  const upd = fn => mutate(() => { const g = state.wins.find(x => x.id === w.id); if (g) fn(g); });
  $('#nX0').onchange = e => upd(g => g.x0 = +e.target.value);
  $('#nY0').onchange = e => upd(g => g.y0 = +e.target.value);
  $('#nX1').onchange = e => upd(g => g.x1 = +e.target.value);
  $('#nY1').onchange = e => upd(g => g.y1 = +e.target.value);
  $('#nDel').onclick = () => { ui.sel = null; mutate(() => state.wins = state.wins.filter(x => x.id !== w.id)); };
  $('#back').onclick = () => select(null);
}