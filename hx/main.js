import { load, save, defaultState, fixState } from './core/state.js';
import { rebuildFromDims } from './core/dims.js';
import { buildDefs, renderAll } from './core/render2d.js';
import { renderPanel } from './ui/panels.js';
import { buildHeader, buildFooter } from './ui/toolbar.js';
import { bindEvents } from './ui/events.js';
import { applyStaticLang, getLang, tr } from './data/i18n.js';
import { init3D, enter3D, exit3D } from './scene3d.js';

export let state = load() || defaultState();
export let ui = { tool:'select', sel:null, mA:null, mCur:null,
  layers:{dims:true, labels:true, furn:true, grid:false, bearing:false, wallSnap:true} };
export let view = { x0:0, y0:0, s:.06 };

const undoStack = [], redoStack = [];
export const snap = () => JSON.stringify(state);
export function commit(before){
  undoStack.push(before); if (undoStack.length > 150) undoStack.shift(); redoStack.length = 0; save(state);
}
export function mutate(fn){ const b = snap(); fn(); commit(b); renderAll(); renderPanel(); }
export function undo(){ if (!undoStack.length) return; redoStack.push(snap()); state = JSON.parse(undoStack.pop()); save(state); renderAll(); renderPanel(); }
export function redo(){ if (!redoStack.length) return; undoStack.push(snap()); state = JSON.parse(redoStack.pop()); save(state); renderAll(); renderPanel(); }

export function select(sel){ ui.sel = sel; renderAll(); renderPanel(); }
export function setTool(t){
  ui.tool = t;
  document.querySelectorAll('#tools .btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('#plan').setAttribute('class', 'tool-' + t);
}

const PX_MM = 25.4 / 96;
const svg = document.querySelector('#plan');
export function applyView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const ratio = 1/(view.s*PX_MM);
  document.querySelector('#ratio').textContent = '1:' + Math.round(ratio);
  renderAll();
}
export function fitView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  const b = {x:-1850, y:-1750, w:15600, h:14100};
  view.s = Math.min(W/b.w, H/b.h);
  view.x0 = b.x - (W/view.s - b.w)/2; view.y0 = b.y - (H/view.s - b.h)/2;
  applyView();
}
export function zoomCenter(k){
  const W = svg.clientWidth, H = svg.clientHeight;
  const ns = Math.max(.012, Math.min(2, view.s*k));
  const px = view.x0 + W/2/view.s, py = view.y0 + H/2/view.s;
  view.s = ns; view.x0 = px - W/2/ns; view.y0 = py - H/2/ns; applyView();
}
export function setRatio(r){
  const ns = 1/(r*PX_MM);
  zoomCenter(ns/view.s);
}

/* 初始化 */
rebuildFromDims(state);
buildDefs();
buildHeader();
buildFooter();
renderAll();
renderPanel();
bindEvents();
init3D();
fitView();

document.querySelector('#subtitle').textContent = tr('尺寸单位 mm', 'Units: mm');

/* 2D/3D 切换按钮 */
document.body.addEventListener('click', e => {
  const b = e.target.closest('#viewSeg .btn');
  if (!b) return;
  const m = b.dataset.view;
  document.body.classList.toggle('m3d', m === '3d');
  m === '3d' ? enter3D() : exit3D();
});