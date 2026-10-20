export const area = poly => Math.abs(poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
export const perim = poly => poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
export const bbox = poly => { const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
export function aabb(f){ const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return {hw:f.w/2*c + f.d/2*s, hh:f.w/2*s + f.d/2*c}; }
export const fmt = (n, d=2) => n.toFixed(d);
export const norm = a => ((Math.round(a) % 360) + 360) % 360;
export const wallLen = w => Math.hypot(w.x1-w.x0, w.y1-w.y0);
export const wallDir = w => { const L = wallLen(w) || 1; return [(w.x1-w.x0)/L, (w.y1-w.y0)/L]; };
export const wallNormal = w => { const [dx,dy] = wallDir(w); return [-dy, dx]; };

export function snapRects(state){
  return state.walls.filter(w => !state.demolished.includes(w.id))
    .map(w => [Math.min(w.x0,w.x1), Math.min(w.y0,w.y1), Math.max(w.x0,w.x1), Math.max(w.y0,w.y1)])
    .concat(state.wins.map(w => [w.x0, w.y0, w.x1, w.y1]));
}

export function doorRect(state, d){
  const w = state.walls.find(w => w.id === d.host || 'w'+d.host === w.id);
  if (!w) return null;
  const [dx, dy] = wallDir(w), L = wallLen(w);
  const off = Math.max(0, Math.min(L - d.len, d.offset));
  const t = w.type === 'b' || w.type === 'e' ? 240 : 220;
  const [nx, ny] = wallNormal(w);
  const c0x = w.x0 + dx*off, c0y = w.y0 + dy*off;
  const c1x = w.x0 + dx*(off + d.len), c1y = w.y0 + dy*(off + d.len);
  const x0 = Math.min(c0x, c1x, c0x + nx*t, c1x + nx*t);
  const x1 = Math.max(c0x, c1x, c0x + nx*t, c1x + nx*t);
  const y0 = Math.min(c0y, c1y, c0y + ny*t, c1y + ny*t);
  const y1 = Math.max(c0y, c1y, c0y + ny*t, c1y + ny*t);
  return {x0, y0, x1, y1, dx, dy, nx, ny, off, L, wall:w};
}
export function doorGeom(state, d){
  const r = doorRect(state, d); if (!r) return null;
  const w = r.wall, [dx, dy] = wallDir(w);
  const hx = w.x0 + dx*(r.off + (d.hinge === 'end' ? d.len : 0));
  const hy = w.y0 + dy*(r.off + (d.hinge === 'end' ? d.len : 0));
  const c = d.hinge === 'end' ? [-dx, -dy] : [dx, dy];
  const n = [r.nx, r.ny];
  const o = d.open === 'in' ? [-n[0], -n[1]] : n;
  return {h:[hx, hy], c, o, len:d.len, rect:[r.x0, r.y0, r.x1, r.y1], wall:w, off:r.off};
}
export function slideRect(state, d){
  const w = state.walls.find(w => w.id === d.host || 'w'+d.host === w.id);
  if (!w) return null;
  const [dx, dy] = wallDir(w), L = wallLen(w);
  const off = Math.max(0, Math.min(L - d.len, d.offset));
  const t = 240;
  const [nx, ny] = wallNormal(w);
  const c0x = w.x0 + dx*off, c0y = w.y0 + dy*off;
  const c1x = w.x0 + dx*(off + d.len), c1y = w.y0 + dy*(off + d.len);
  const x0 = Math.min(c0x, c1x, c0x + nx*t, c1x + nx*t);
  const x1 = Math.max(c0x, c1x, c0x + nx*t, c1x + nx*t);
  const y0 = Math.min(c0y, c1y, c0y + ny*t, c1y + ny*t);
  const y1 = Math.max(c0y, c1y, c0y + ny*t, c1y + ny*t);
  return {x0, y0, x1, y1, vertical: Math.abs(dy) > Math.abs(dx)};
}