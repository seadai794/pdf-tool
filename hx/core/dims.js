import { ROOM_DEF, polyOf } from '../data/rooms.js';

export function buildWallsFromDims(d){
  const walls = [];
  const buckets = { v: {}, h: {} };
  Object.entries(d.seg).forEach(([k, type]) => {
    const [ori, a, b0, b1] = k.split(':');
    const A = +a, B0 = +b0, B1 = +b1, t = d.t;
    if (ori === 'v'){
      (buckets.v[A] ??= []).push({y0:Math.min(B0,B1), y1:Math.max(B0,B1), type, x0:A-t/2, x1:A+t/2});
    } else {
      (buckets.h[A] ??= []).push({x0:Math.min(B0,B1), x1:Math.max(B0,B1), type, y0:A-t/2, y1:A+t/2});
    }
  });
  const merge = (arr, k) => {
    arr.sort((a,b) => a[k+'0'] - b[k+'0']);
    const out = []; let cur = null;
    arr.forEach(s => {
      if (cur && s[k+'0'] <= cur[k+'1'] + 5 && s.type === cur.type){ cur[k+'1'] = Math.max(cur[k+'1'], s[k+'1']); }
      else { if (cur) out.push(cur); cur = {...s}; }
    });
    if (cur) out.push(cur);
    return out;
  };
  Object.values(buckets.v).forEach(arr => walls.push(...merge(arr, 'y')));
  Object.values(buckets.h).forEach(arr => walls.push(...merge(arr, 'x')));
  return walls.map((w, i) => ({id:'w'+i, ...w}));
}

export function rebuildFromDims(state){
  state.walls = buildWallsFromDims(state.dims);
  Object.entries(state.rooms).forEach(([id, r]) => {
    const def = ROOM_DEF.find(x => x.id === id);
    if (def) r.poly = polyOf(def, state.dims);
  });
  // 门窗长度不超出宿主墙
  state.doors.forEach(d => {
    const w = state.walls.find(w => w.id === d.host);
    if (w) d.len = Math.min(d.len, Math.round(wallLenSafe(w) - 40));
  });
}
const wallLenSafe = w => Math.hypot(w.x1-w.x0, w.y1-w.y0);