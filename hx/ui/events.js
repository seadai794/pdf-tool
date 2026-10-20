import { state, ui, view, mutate, select, snap, commit, setTool } from '../main.js';
import { doorRect, doorGeom, slideRect, wallLen, wallDir, aabb, snapRects } from '../core/geometry.js';
import { renderAll, renderFurn, renderSel, renderMeasure, renderRooms, renderWalls, renderOpenings, renderLabels } from '../core/render2d.js';
import { applyView } from '../main.js';

const $ = s => document.querySelector(s);
const svg = $('#plan');

let drag = null, pinch = null;
const touches = new Map();
const TAP = 4;

const toMM = e => { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
const svgXY = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
const pinchInfo = () => { const [a, b] = [...touches.values()]; return {d:Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c:svgXY((a.x+b.x)/2, (a.y+b.y)/2)}; };

function endDrag(cancel){
  const d = drag; drag = null;
  if (!d) return;
  if (d.kind === 'pan'){ if (!cancel && !d.moved && ui.tool === 'select') select(d.room ? {kind:'room', id:d.room} : null); return; }
  if (d.moved){ commit(d.before); renderAll(); }
}

export function bindEvents(){
  svg.addEventListener('pointerdown', e => {
    if (e.button === 1 || e.button === 2) return;
    if (e.pointerType !== 'mouse'){
      touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
      svg.setPointerCapture(e.pointerId);
      if (touches.size >= 2){ endDrag(false); const {d, c} = pinchInfo(); pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s}; return; }
    }
    if (pinch) return;
    const p = toMM(e), t = e.target;

    if (ui.tool === 'select' && t.closest('[data-wall]')){ select({kind:'wall', id:t.closest('[data-wall]').dataset.wall}); return; }
    if (ui.tool === 'select' && t.closest('[data-fid]')){
      const f = state.furniture.find(x => x.id === t.closest('[data-fid]').dataset.fid);
      if (f){ if (ui.sel?.id !== f.id) select({kind:'furn', id:f.id}); drag = {kind:'move', id:f.id, sx:e.clientX, sy:e.clientY, ox:p.x-f.cx, oy:p.y-f.cy, before:snap(), moved:false}; }
    } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
      const id = t.closest('[data-wall]').dataset.wall, w = state.walls.find(x => x.id === id);
      if (w && w.type === 'n') mutate(() => state.demolished = state.demolished.includes(id) ? state.demolished.filter(x => x !== id) : [...state.demolished, id]);
      return;
    } else {
      const room = t.closest('[data-room]');
      drag = {kind:'pan', sx:e.clientX, sy:e.clientY, x0:view.x0, y0:view.y0, room:room && room.dataset.room, moved:false};
    }
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (pinch){
      if (touches.size < 2) return;
      const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
      view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; applyView(); return;
    }
    const p = toMM(e);
    $('#cx').textContent = Math.round(p.x) + ' mm'; $('#cy').textContent = Math.round(p.y) + ' mm';
    if (!drag) return;
    const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
    if (drag.kind === 'pan'){
      if (!drag.moved && !far) return;
      drag.moved = true;
      view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; applyView(); return;
    }
    const f = state.furniture.find(x => x.id === drag.id); if (!f) return;
    if (!drag.moved && !far) return;
    drag.moved = true;
    if (drag.kind === 'move'){ f.cx = Math.round((p.x-drag.ox)/10)*10; f.cy = Math.round((p.y-drag.oy)/10)*10; }
    renderFurn(); renderSel();
  });

  const end = e => {
    touches.delete(e.pointerId);
    if (pinch){ if (touches.size < 2) pinch = null; return; }
    endDrag(e.type === 'pointercancel');
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);

  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    const ns = Math.max(.012, Math.min(2, view.s*Math.exp(-e.deltaY*.0015)));
    const px = view.x0 + (e.clientX-r.left)/view.s, py = view.y0 + (e.clientY-r.top)/view.s;
    view.s = ns; view.x0 = px - (e.clientX-r.left)/ns; view.y0 = py - (e.clientY-r.top)/ns; applyView();
  }, {passive:false});

  document.addEventListener('keydown', e => {
    if (e.target.matches('input,select,textarea')) return;
    const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (mod && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (k === 'v') setTool('select');
    else if (k === 'm') setTool('measure');
    else if (k === 'x') setTool('demolish');
    else if (k === 'escape') select(null);
    else if (k === 'delete' && ui.sel?.kind === 'furn'){
      e.preventDefault(); const id = ui.sel.id; select(null);
      mutate(() => state.furniture = state.furniture.filter(f => f.id !== id));
    }
  });
}