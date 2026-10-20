import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const M = v => v / 1000;

let envTex = null, envK = 1;
export function setEnv(t, k){ envTex = t; envK = k; }

const matCache = new Map();
export function mat(color, o = {}){
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)){
    const m = new THREE.MeshStandardMaterial({color, roughness:.7, ...o});
    if (envTex && (m.metalness > 0 || m.roughness < .4)){ m.envMap = envTex; m.userData.env = m.metalness > .5 ? 1 : .5; m.envMapIntensity = m.userData.env*envK; }
    matCache.set(key, m);
  }
  return matCache.get(key);
}
export function refreshEnv(){ matCache.forEach(m => { if (m.envMap) m.envMapIntensity = m.userData.env*envK; }); }

function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rgbK = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v*k))); return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`; };

const asMat = m => typeof m === 'string' ? mat(m) : m;
const sh = o => { o.castShadow = o.receiveShadow = true; return o; };
const mesh = (geo, m) => sh(new THREE.Mesh(geo, asMat(m)));
const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
function box(w, h, d, m, x = 0, y = 0, z = 0){
  const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h/2, z); return o;
}
function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = .04){
  const o = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/2-.001, h/2-.001, d/2-.001)), m); o.position.set(x, y + h/2, z); return o;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 28){
  const o = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y + h/2, z); return o;
}
function lathe(pts, m, x = 0, y = 0, z = 0, seg = 40){
  const o = mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-4), h)), seg), m); o.position.set(x, y, z); return o;
}
function rod(a, b, r0, m, r1 = r0, seg = 12){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = mesh(new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), m);
  o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return o;
}
const tube = (pts, r, m, seg = 40) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), seg, r, 10), m);
function blob(rx, ry, rz, m, x = 0, y = 0, z = 0, seg = 24){
  const o = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg*.7)), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o;
}
function ring(R, r, m, x = 0, y = 0, z = 0){ const o = mesh(new THREE.TorusGeometry(R, r, 10, 48), m); o.rotation.x = Math.PI/2; o.position.set(x, y, z); return o; }
function rrect(w, d, r){
  const s = new THREE.Shape(), x = -w/2, y = -d/2; r = Math.min(r, w/2 - .001, d/2 - .001);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function shell(w, d, h, t, r, m, x = 0, y = 0, z = 0){
  const s = rrect(w, d, r); s.holes.push(rrect(w - 2*t, d - 2*t, Math.max(.004, r - t)));
  const geo = new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, curveSegments:10}); geo.rotateX(-Math.PI/2);
  const o = mesh(geo, m); o.position.set(x, y, z); return o;
}
const darker = (hex, k = .8) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const lighter = (hex, k = .2) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
const legs = (g, w, d, h, m, inset = .05, r = .02) => [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2-inset), 0, b*(d/2-inset)], [a*(w/2-inset), h, b*(d/2-inset)], r*.7, m, r)));
const metal = () => mat('#cfd2d4', {metalness:.9, roughness:.25});
const chrome = () => mat('#eef0f2', {metalness:1, roughness:.08});
const hwMat = () => mat('#b9b3a8', {metalness:.85, roughness:.3});
const blackMetal = () => mat('#2b2b2d', {metalness:.6, roughness:.4});
const mirror = () => mat('#dfeaee', {metalness:.55, roughness:.06});
const ceramic = (o = {}) => mat('#fbfbf9', {roughness:.12, ...o});
const fabric = c => mat(c, {roughness:.96});
const woodM = c => mat(c, {roughness:.55});
const screenMat = (glow = '#1a2636') => mat('#0b0e13', {roughness:.1, metalness:.3, emissive:glow, emissiveIntensity:.35});
const glowMat = (c = '#fff4dc', e = '#ffdca0', k = .5) => mat(c, {emissive:e, emissiveIntensity:k, roughness:.9, side:THREE.DoubleSide});

function pull(g, len, vert, x, y, z){
  const m = hwMat(), o = new THREE.Group();
  o.add(vert ? box(.01, len, .01, m, 0, -len/2, .028) : box(len, .01, .01, m, 0, -.005, .028));
  [-1, 1].forEach(s => o.add(vert ? box(.008, .008, .028, m, 0, s*(len/2 - .015) - .004, .014) : box(.008, .008, .028, m, s*(len/2 - .015), -.004, .014)));
  o.position.set(x, y, z); g.add(o);
}
function knob(g, x, y, z){ const k = cyl(.011, .014, .02, hwMat(), x, y - .01, z + .01, 16); k.rotation.x = Math.PI/2; g.add(k, blob(.014, .014, .008, hwMat(), x, y, z + .022, 12)); }
function fronts(g, x0, y0, w, h, z, nx, ny, m, hd = 'bar', hy = null){
  const gap = .005, pw = w/nx, ph = h/ny, fz = z + .018;
  g.add(box(w, h, .002, '#2a2724', x0 + w/2, y0, z + .001));
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const cx = x0 + pw*(i + .5), yb = y0 + ph*j, drawer = ph < .4 && pw >= ph;
    g.add(rbox(pw - gap, ph - gap, .018, m, cx, yb + gap/2, z + .009, .003));
    if (hd === 'none') continue;
    if (hd === 'edge'){ g.add(box(pw - .05, .01, .006, '#3c3a37', cx, yb + ph - gap - .018, fz)); continue; }
    if (drawer){ hd === 'knob' ? knob(g, cx, yb + ph/2, fz) : pull(g, Math.min(.3, pw*.45), false, cx, yb + ph/2, fz); continue; }
    const len = Math.min(.45, ph*.35), hx = nx === 1 ? cx + pw/2 - .045 : (i % 2 ? cx - pw/2 + .04 : cx + pw/2 - .04);
    const y = Math.min(yb + ph - .05 - len/2, Math.max(yb + .05 + len/2, hy ?? yb + ph/2));
    hd === 'knob' ? knob(g, hx, y, fz) : pull(g, len, true, hx, y, fz);
  }
}
const vasePts = (r, h) => [[0, 0], [r*.65, 0], [r, h*.32], [r*.92, h*.62], [r*.42, h*.86], [r*.5, h]];
function vase(g, x, y, z, r, h, c, R, flowers = true){
  g.add(lathe(vasePts(r, h), mat(c, {roughness:.35, side:THREE.DoubleSide}), x, y, z, 32));
  if (!flowers) return;
  const cols = ['#f3e6d8', '#e8b4a0', '#f6d27a', '#ffffff'];
  for (let k = 0; k < 5; k++){
    const a = k*1.26 + R()*.4, s = .03 + R()*.05, top = [x + Math.cos(a)*s, y + h + .12 + R()*.14, z + Math.sin(a)*s];
    g.add(rod([x, y + h*.6, z], top, .003, '#6f8f4a', .003, 6), blob(.022, .018, .022, cols[k % 4], ...top, 12));
  }
}
function tableLamp(g, x, y, z, s = 1){
  g.add(lathe([[0, 0], [.06*s, 0], [.075*s, .05*s], [.08*s, .12*s], [.055*s, .2*s], [.018*s, .25*s], [.012*s, .3*s]], ceramic({roughness:.3}), x, y, z, 32));
  g.add(lathe([[.13*s, 0], [.1*s, .18*s]], glowMat('#f6ecd9', '#ffdca0', .35), x, y + .26*s, z, 40), blob(.03*s, .03*s, .03*s, glowMat('#fff', '#ffe2b0', 1), x, y + .31*s, z, 12));
}
const plate = (g, r, x, y, z) => g.add(lathe([[0, 0], [r*.6, 0], [r*.72, .008], [r, .02]], ceramic({side:THREE.DoubleSide}), x, y, z, 32));

/* ============================================================
 * 家具 3D 模型：保持原样
 * ============================================================ */
export function buildFurniture(f){
  const g = new THREE.Group(), w = M(f.w), d = M(f.d), c = f.color || '#ddd', bz = -d/2, R = rng(Math.round(f.w*7 + f.d*13 + f.cx + f.cy));
  switch (f.type){
    case 'bed': {
      const fr = woodM('#8d7258'), fab = fabric(c), fh = .3, mt = .22, top = fh + mt, n = Math.max(3, Math.round(w/.28)), sw = (w - .04)/n;
      g.add(box(w - .12, .06, d - .14, '#4a3e33', 0, 0, .03), rbox(w, fh - .06, d - .08, fr, 0, .06, .04, .015));
      g.add(rbox(w, 1.08, .06, fr, 0, 0, bz + .03, .012));
      for (let i = 0; i < n; i++) g.add(rbox(sw - .006, .62, .06, fabric(darker(c, .8)), -w/2 + .02 + sw*(i + .5), .42, bz + .08, .025));
      const md = d - .13, dd = md*.66, dz = d/2 - .015 - dd/2;
      g.add(rbox(w - .06, mt, md, '#f6f3ee', 0, fh, bz + .11 + md/2, .07));
      g.add(rbox(w + .02, .27, dd, fab, 0, top - .2, dz, .04), rbox(w + .024, .06, .22, fabric('#fbfaf7'), 0, top + .025, dz - dd/2 + .11, .025));
      g.add(rbox(w + .05, .285, .42, fabric(darker(c, .62)), 0, top - .205, d/2 - .35, .03));
      const np = w >= 1.3 ? 2 : 1, pw = (w - .16 - (np-1)*.06)/np;
      for (let i = 0; i < np; i++){
        const x = -w/2 + .08 + pw/2 + i*(pw + .06);
        g.add(rot(rbox(pw, .15, .42, fabric('#ffffff'), x, top - .01, bz + .34, .07), -.28), rot(rbox(pw*.62, .3, .1, fabric(i ? '#efe7da' : darker(c, .7)), x, top, bz + .54, .045), -.3));
      }
      break;
    }
    case 'sofa': case 'armchair': {
      const fab = fabric(c), dk = fabric(darker(c, .88)), a = Math.min(.18, w*.14), n = f.type === 'armchair' ? 1 : (w > 2.2 ? 3 : 2), cw = (w - 2*a)/n, bd = Math.min(.2, d*.24), lh = .12, sd = d - bd - .02;
      legs(g, w, d, lh, woodM('#3a3027'), .07, .018);
      g.add(rbox(w, .16, d, dk, 0, lh, 0, .03), rbox(w, .73, bd, dk, 0, lh, bz + bd/2, .06));
      [-1, 1].forEach(s => g.add(rbox(a, .5, d, dk, s*(w/2 - a/2), lh, 0, .07)));
      for (let i = 0; i < n; i++){
        const x = -w/2 + a + cw/2 + i*cw;
        g.add(rbox(cw - .012, .15, sd, fab, x, lh + .16, bz + bd + sd/2, .055), rot(rbox(cw - .03, .44, .16, fab, x, lh + .3, bz + bd + .08, .07), -.16));
      }
      if (n > 1) [-1, 1].forEach(s => g.add(rot(rbox(.42, .42, .12, fabric(s < 0 ? '#ece5d8' : darker(c, .7)), s*(w/2 - a - .26), lh + .32, bz + bd + .22, .06), -.3, s*-.25)));
      else g.add(rot(rbox(.4, .26, .1, fabric('#ece5d8'), 0, lh + .33, bz + bd + .2, .05), -.25));
      break;
    }
    case 'cornersofa': {
      const k = Math.min(.95, d*.56, w*.4), b = .2, fab = fabric(c), dk = fabric(darker(c, .88)), lh = .1, sw = (w - b - .2)/2;
      [[-w/2+.07, bz+.07], [w/2-.07, bz+.07], [w/2-.07, bz+k-.07], [-w/2+.07, d/2-.07], [-w/2+k-.07, d/2-.07], [-w/2+k-.07, bz+k-.07]]
        .forEach(([x, z]) => g.add(rod([x, 0, z], [x, lh, z], .012, woodM('#3a3027'), .018)));
      g.add(rbox(w, .18, k, dk, 0, lh, bz + k/2, .03), rbox(k, .18, d - k + .02, dk, -w/2 + k/2, lh, bz + k + (d - k)/2 - .01, .03));
      g.add(rbox(w, .72, b, dk, 0, lh, bz + b/2, .06), rbox(b, .72, d, dk, -w/2 + b/2, lh, 0, .06), rbox(.2, .5, k, dk, w/2 - .1, lh, bz + k/2, .07), rbox(k, .5, .2, dk, -w/2 + k/2, lh, d/2 - .1, .07));
      for (let i = 0; i < 2; i++){
        const x = -w/2 + b + sw/2 + i*sw;
        g.add(rbox(sw - .012, .15, k - b - .02, fab, x, lh + .18, bz + b + (k - b)/2, .055), rot(rbox(sw - .04, .42, .16, fab, x, lh + .3, bz + b + .07, .07), -.16));
      }
      g.add(rbox(k - b - .02, .15, d - k - .22, fab, -w/2 + b + (k - b)/2, lh + .18, bz + k + (d - k - .2)/2, .055));
      const L = d - .2 - b - .18, nl = Math.max(1, Math.round(L/.75));
      for (let i = 0; i < nl; i++) g.add(rot(rbox(.16, .42, L/nl - .03, fab, -w/2 + b + .07, lh + .3, bz + b + .18 + L/nl*(i + .5), .07), 0, 0, .16));
      g.add(rot(rbox(.42, .42, .12, fabric('#ece5d8'), -w/2 + b + .3, lh + .34, bz + b + .24, .06), -.35, .6), rot(rbox(.4, .4, .12, fabric(darker(c, .7)), w/2 - .5, lh + .34, bz + b + .2, .06), -.3, -.25));
      break;
    }
    case 'nightstand': {
      const wm = woodM(c);
      legs(g, w, d, .1, woodM('#5a4a3b'), .04, .014);
      g.add(rbox(w, .4, d - .02, wm, 0, .1, -.01, .012));
      fronts(g, -w/2 + .02, .12, w - .04, .36, d/2 - .02, 1, 2, wm, 'bar');
      tableLamp(g, -w*.12, .5, -d*.12);
      g.add(box(.16, .025, .22, '#2f5d62', w*.24, .5, .04), box(.14, .02, .2, '#e6dccd', w*.24, .525, .04));
      break;
    }
    case 'wardrobe': case 'cabinet': case 'shoecab': {
      const cm = mat(c, {roughness:.55}), fz = d/2 - .02;
      if (f.type === 'wardrobe'){
        const h = 2.2, n = Math.max(1, Math.round(w/.5));
        g.add(box(w - .02, .08, d - .06, '#4a4641', 0, 0, -.03), box(w, h - .08, d - .02, cm, 0, .08, -.01));
        fronts(g, -w/2, .08, w, h - .1, fz, n, 1, cm, 'bar', 1.05);
        g.add(box(w, .02, d - .02, darker(c, .9), 0, h - .02, -.01));
      } else if (f.type === 'shoecab'){
        const h = 1.0, y0 = .16, n = Math.max(1, Math.round(w/.45));
        g.add(box(w, h - y0, d - .02, cm, 0, y0, -.01), box(w - .04, .01, .03, glowMat('#fff7e6', '#ffe9c4', .8), 0, y0 - .01, fz - .06));
        fronts(g, -w/2, y0, w, h - y0, fz, n, 1, cm, 'edge');
        g.add(rbox(w + .01, .025, d, woodM(darker(c, .8)), 0, h, 0, .006));
        g.add(rbox(.22, .015, .14, woodM('#6b543f'), -w*.25, h + .025, 0, .006));
        vase(g, w*.28, h + .025, -.03, .05, .2, '#d8cfc2', R);
      } else {
        const h = .85, n = Math.max(1, Math.round(w/.5));
        legs(g, w, d, .1, woodM('#3a3027'), .05, .016);
        g.add(box(w, h - .13, d - .02, cm, 0, .1, -.01));
        fronts(g, -w/2, .62, w, .2, fz, n, 1, cm, 'bar');
        fronts(g, -w/2, .1, w, .52, fz, n, 1, cm, 'bar', .52);
        g.add(rbox(w + .02, .03, d + .01, woodM(darker(c, .78)), 0, h - .03, 0, .008));
        vase(g, w*.3, h, 0, .07, .24, '#e9e2d6', R);
        g.add(rot(box(.3, .38, .02, woodM('#3a3027'), -w*.25, h, bz + .06), -.12), rot(box(.25, .33, .005, '#d9cfbf', -w*.25, h + .03, bz + .075), -.12));
        g.add(lathe([[0, 0], [.05, 0], [.12, .06], [.13, .07]], mat('#b8a58c', {roughness:.5, side:THREE.DoubleSide}), 0, h, .02, 32));
        for (let k = 0; k < 3; k++) g.add(blob(.035, .035, .035, ['#d98c4a', '#c9ad4f', '#b5463a'][k], Math.cos(k*2.1)*.04, h + .045, .02 + Math.sin(k*2.1)*.04, 14));
      }
      break;
    }
    case 'dresser': {
      const wm = woodM(c), r = Math.min(.34, w*.3);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .04), 0, b*(d/2 - .04)], [a*(w/2 - .05), .58, b*(d/2 - .05)], .012, wm, .02)));
      g.add(box(w - .04, .14, d - .04, wm, 0, .58), rbox(w, .03, d, wm, 0, .72, 0, .008));
      fronts(g, -w/2 + .03, .585, w - .06, .13, d/2 - .02, 2, 1, wm, 'knob');
      const mr = new THREE.Mesh(new THREE.TorusGeometry(r, .018, 12, 64), woodM(darker(c, .7))); mr.position.set(0, .77 + r, bz + .04); sh(mr);
      const mg = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mirror()); mg.position.set(0, .77 + r, bz + .035);
      g.add(mr, mg, box(.08, .03, .06, woodM(darker(c, .7)), 0, .75, bz + .04));
      [['#e7c9b5', .03, .09], ['#b9d0d8', .025, .12], ['#f0e3cf', .02, .07]].forEach(([cc, rr, hh], i) => g.add(cyl(rr, rr, hh, mat(cc, {roughness:.15, transparent:true, opacity:.8}), w*.25 + i*.06, .75, .02)));
      g.add(rbox(.16, .06, .1, woodM('#6b543f'), -w*.28, .75, .03, .01));
      const sz = d/2 + .25;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*.13, 0, sz + b*.13], [a*.12, .4, sz + b*.12], .01, wm, .014)));
      g.add(rbox(.34, .08, .34, fabric('#e8ddd0'), 0, .4, sz, .035));
      break;
    }
    case 'desk': {
      const tm = woodM(c), bm = blackMetal();
      g.add(rbox(w, .025, d, tm, 0, .72, 0, .006));
      [-1, 1].forEach(s => {
        const x = s*(w/2 - .06);
        g.add(box(.03, .72, .03, bm, x, 0, d/2 - .06), box(.03, .72, .03, bm, x, 0, bz + .06), box(.03, .03, d - .1, bm, x, 0, 0), box(.03, .03, d - .1, bm, x, .69, 0));
      });
      g.add(box(w - .12, .04, .015, bm, 0, .66, bz + .06), box(.4, .09, d - .12, tm, w/2 - .32, .63, 0));
      pull(g, .16, false, w/2 - .32, .675, d/2 - .06);
      const my = .745, mz = bz + .15;
      g.add(rbox(.22, .012, .16, bm, 0, my, mz, .004), rod([0, my, mz - .02], [0, my + .2, mz - .03], .012, bm));
      g.add(rbox(.62, .37, .02, '#1d1d1f', 0, my + .12, mz - .04, .006), box(.6, .33, .002, screenMat('#27405c'), 0, my + .15, mz - .029));
      g.add(rbox(.42, .015, .13, '#e8e8ea', 0, my, .06, .004), rbox(.4, .004, .11, '#d2d2d6', 0, my + .014, .06, .002), blob(.03, .015, .05, '#e8e8ea', .3, my + .012, .07, 16));
      const lx = -w/2 + .15, lz = bz + .12;
      g.add(cyl(.07, .075, .02, bm, lx, my, lz, 28), tube([[lx, my + .02, lz], [lx, my + .3, lz + .03], [lx + .12, my + .42, lz + .1]], .008, bm));
      const hd = cyl(.02, .06, .1, bm, lx + .14, my + .34, lz + .12, 24); hd.rotation.x = .5; g.add(hd);
      g.add(cyl(.04, .038, .09, ceramic({roughness:.3}), w/2 - .15, my, .05, 20), rbox(.2, .015, .28, '#3b5566', -w/2 + .3, my, .1, .004));
      break;
    }
    case 'chair': {
      const lw = woodM('#6b543f'), fab = fabric(c), sy = .44;
      [[-1, 1], [1, 1]].forEach(([s]) => g.add(rod([s*(w/2 - .04), 0, d/2 - .05], [s*(w/2 - .05), sy, d/2 - .07], .012, lw, .018)));
      [-1, 1].forEach(s => g.add(rod([s*(w/2 - .04), 0, bz + .03], [s*(w/2 - .05), .86, bz + .07], .012, lw, .018)));
      g.add(box(w - .08, .025, .02, lw, 0, .15, d/2 - .06), box(w - .08, .025, .02, lw, 0, .15, bz + .05));
      [-1, 1].forEach(s => g.add(box(.02, .025, d - .12, lw, s*(w/2 - .045), .18, 0)));
      g.add(box(w - .06, .04, d - .1, lw, 0, sy - .03, 0), rbox(w - .04, .05, d - .08, fab, 0, sy, .005, .022));
      g.add(rot(rbox(w - .08, .15, .025, lw, 0, .66, bz + .065, .012), -.12), rot(box(w - .08, .025, .02, lw, 0, .52, bz + .055), -.12));
      break;
    }
    case 'bookshelf': {
      const h = 1.8, t = .022, ns = 5, wm = woodM(c), sh0 = (h - .06 - t)/ns, cols = ['#b88a6a','#6f8f8a','#d9c08c','#9aa58c','#a8675e','#e6dccd','#7d8ea3','#c9bfae'];
      g.add(box(w, h, .012, woodM(darker(c, .85)), 0, 0, bz + .006), box(t, h, d, wm, -w/2 + t/2), box(t, h, d, wm, w/2 - t/2), box(w - 2*t, .06, d - .03, wm, 0, 0, .0));
      for (let s = 0; s <= ns; s++){
        const y = s < ns ? .06 + s*sh0 : h - t; g.add(box(w - 2*t, t, d - .012, wm, 0, y, .006));
        if (s === ns) break;
        const yb = y + t, end = w/2 - t - .01; let x = -w/2 + t + .01, deco = R() < .55 ? x + R()*(w - .45) : 99;
        while (x < end - .03){
          if (x >= deco){
            deco = 99;
            if (R() < .5) vase(g, x + .07, yb, 0, .045, .16, cols[Math.floor(R()*8)], R, false);
            else for (let k = 0; k < 3; k++) g.add(box(.2 - k*.02, .028, d*.7, mat(cols[Math.floor(R()*8)], {roughness:.8}), x + .1, yb + k*.028, .01));
            x += .2; continue;
          }
          if (R() < .07){ x += .03 + R()*.05; continue; }
          const bw = .018 + R()*.03, bh = Math.min(sh0 - t - .03, .17 + R()*.13), bd = d*(.62 + R()*.22);
          if (x + bw > end) break;
          g.add(box(bw, bh, bd, mat(cols[Math.floor(R()*8)], {roughness:.75}), x + bw/2, yb, d/2 - .015 - bd/2));
          x += bw + .002;
        }
      }
      break;
    }
    case 'baycushion':
      g.add(rbox(w, .08, d, fabric(c), 0, .45, 0, .03));
      g.add(rot(rbox(w - .1, .34, .14, fabric('#ffffff'), 0, .52, bz + .14, .06), .25), rot(rbox(w - .1, .34, .14, fabric('#f0e6d6'), 0, .52, d/2 - .14, .06), -.25));
      g.add(rbox(w*.8, .04, .3, fabric(darker(c, .7)), 0, .53, d*.12, .02), rbox(.28, .015, .2, woodM('#8d7258'), 0, .53, -d*.15, .006), cyl(.035, .03, .06, ceramic(), 0, .545, -d*.15, 20));
      break;
    case 'coffeetable': {
      const tm = mat(c, {roughness:.35}), lw = woodM('#3a3027');
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .05), 0, b*(d/2 - .05)], [a*(w/2 - .07), .365, b*(d/2 - .07)], .012, lw, .02)));
      g.add(rbox(w, .035, d, tm, 0, .365, 0, .015), rbox(w - .12, .02, d - .12, woodM(darker(c, .85)), 0, .12, 0, .006));
      g.add(box(.3, .03, .22, '#2f5d62', w*.2, .14, 0), box(.26, .025, .19, '#d9b36c', w*.2, .17, .01));
      g.add(rbox(.38, .015, .24, woodM('#6b543f'), -w*.2, .4, 0, .006), box(.22, .025, .16, '#e6dccd', -w*.22, .415, 0));
      g.add(lathe([[0, 0], [.025, 0], [.035, .07], [.034, .08]], ceramic({side:THREE.DoubleSide}), -w*.12, .415, .06, 20));
      vase(g, w*.24, .4, -.05, .055, .18, '#e9e2d6', R);
      break;
    }
    case 'tvstand': {
      const sm = mat(c, {roughness:.5}), n = Math.max(2, Math.round(w/.6));
      legs(g, w, d, .1, blackMetal(), .08, .012);
      g.add(rbox(w, .4, d - .02, sm, 0, .1, -.01, .01));
      fronts(g, -w/2 + .005, .105, w - .01, .39, d/2 - .02, n, 1, sm, 'edge');
      g.add(rbox(1.45, .84, .025, mat('#18181a', {roughness:.4, metalness:.3}), 0, .95, bz + .03, .004), box(1.43, .81, .002, screenMat(), 0, .962, bz + .0435));
      g.add(rbox(.9, .06, .09, '#2a2a2c', 0, .5, -.02, .02), box(.86, .045, .002, fabric('#3a3a3c'), 0, .507, .026));
      vase(g, w/2 - .25, .5, 0, .06, .26, '#d8cfc2', R);
      g.add(box(.25, .035, .18, '#a9433b', -w/2 + .3, .5, 0), box(.22, .03, .16, '#e6dccd', -w/2 + .3, .535, 0));
      break;
    }
    case 'rug':
      [[w, d, .01, c, 0], [w - .16, d - .16, .002, darker(c, .82), .01], [w - .26, d - .26, .002, lighter(c, .12), .0115]].forEach(([a, b, h, cc, y]) => {
        const r = box(a, h, b, mat(cc, {roughness:1}), 0, y + .002); r.castShadow = false; g.add(r);
      });
      break;
    case 'plant': {
      const r = Math.min(w, d)/2, Hh = .9 + r*1.6, pot = mat('#d9d2c5', {roughness:.6}), lm = [mat('#5f8f4e', {roughness:.6, side:THREE.DoubleSide}), mat('#79a862', {roughness:.6, side:THREE.DoubleSide})];
      g.add(lathe([[0, 0], [r*.4, 0], [r*.44, .02], [r*.54, .36], [r*.57, .4], [r*.52, .4], [r*.5, .37], [0, .37]], pot, 0, 0, 0, 36), cyl(r*.49, r*.49, .005, '#4a3a2c', 0, .368, 0, 28));
      g.add(rod([0, .37, 0], [.02, Hh*.62, -.01], .016, '#6b5540', .009));
      const N = 20 + Math.round(r*36), sc = Math.sqrt(r/.25);
      for (let k = 0; k < N; k++){
        const t = k/N, a = k*2.399 + R()*.3, len = (.14 + R()*.08)*(1.1 - t*.4)*sc, s0 = .03 + R()*.08*sc, p = new THREE.Group();
        p.position.set(0, Hh*(.42 + .58*t), 0); p.rotation.set(0, -a, .1 + t*.5 + R()*.3, 'YXZ');
        const lf = blob(len/2, .005, len*.27, lm[k % 2], s0 + len/2, 0, 0, 16); lf.rotation.z = -.3;
        p.add(box(s0, .005, .005, '#6f8f4a', s0/2, 0, 0), lf); g.add(p);
      }
      break;
    }
    case 'table': {
      const tm = mat(c, {roughness:.4}), lw = woodM(darker(c, .55)), ns = Math.max(1, Math.round(w/.62)), top = .75;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .08), 0, b*(d/2 - .08)], [a*(w/2 - .1), .715, b*(d/2 - .1)], .016, lw, .026)));
      g.add(rbox(w, .035, d, tm, 0, .715, 0, .012), box(w - .22, .07, d - .22, lw, 0, .645));
      g.add(box(w*.7, .003, .32, fabric('#b9a58c'), 0, top, 0));
      for (let i = 0; i < ns; i++) [-1, 1].forEach(s => {
        const x = -w/2 + w/ns*(i + .5), z = s*(d/2 - .17);
        g.add(box(.38, .003, .28, fabric('#e7dfd1'), x, top, z)); plate(g, .12, x, top + .003, z);
        g.add(cyl(.03, .026, .1, mat('#dfeef3', {transparent:true, opacity:.35, roughness:.05}), x + .15, top + .003, z - s*.1, 16));
      });
      vase(g, 0, top + .003, 0, .06, .2, '#e9e2d6', R);
      break;
    }
    case 'roundtable': {
      const b = Math.min(.25, w*.3), lw = woodM('#4a3e33'), top = .75;
      g.add(lathe([[b, 0], [b, .015], [b*.8, .035], [.06, .12], [.045, .35], [.05, .6], [.12, .69], [.18, .715]], lw, 0, 0, 0, 40), cyl(w/2, w/2, .035, mat(c, {roughness:.4}), 0, .715, 0, 64));
      for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + .4, rr = w/2 - .17; plate(g, .11, Math.cos(a)*rr, top, Math.sin(a)*rr); }
      vase(g, 0, top, 0, .05, .18, '#e9e2d6', R);
      break;
    }
    case 'counter': {
      const cm = mat(c, {roughness:.45}), stone = mat('#dcd7cf', {roughness:.22}), n = Math.max(1, Math.round(w/.6)), fz = d/2 - .04;
      g.add(box(w - .01, .1, d - .1, '#4a4641', 0, 0, -.05), box(w, .72, d - .04, cm, 0, .1, -.02));
      fronts(g, -w/2, .64, w, .18, fz, n, 1, cm, 'bar'); fronts(g, -w/2, .1, w, .54, fz, n, 1, cm, 'bar', .56);
      g.add(rbox(w + .01, .04, d, stone, 0, .82, 0, .004), box(w, .62, .01, mat('#efece6', {roughness:.3}), 0, .86, bz + .005));
      g.add(box(w, .7, .33, cm, 0, 1.48, bz + .165)); fronts(g, -w/2, 1.48, w, .7, bz + .33, n, 1, cm, 'bar', 1.56);
      g.add(box(w - .04, .01, .02, glowMat('#fff7e6', '#ffe9c4', .8), 0, 1.47, bz + .29));
      if (w >= .8){
        g.add(rbox(.36, .018, .25, woodM('#c9a27a'), -w/2 + .3, .86, .0, .005));
        [.07, .06, .05].forEach((r, i) => g.add(cyl(r, r, .16 - i*.03, mat(['#e9e2d6', '#d6cfc3', '#bfb6a8'][i], {roughness:.4}), w/2 - .15 - i*.15, .86, bz + .1, 24)));
        g.add(cyl(.05, .045, .14, ceramic({roughness:.3}), w/2 - .6, .86, bz + .1, 20));
        for (let k = 0; k < 4; k++) g.add(rod([w/2 - .6, .9, bz + .1], [w/2 - .6 + (k - 1.5)*.018, 1.1, bz + .1 + (k % 2 - .5)*.02], .005, woodM('#8d7258'), .006, 6));
      }
      break;
    }
    case 'stove': {
      const sm = mat('#b9bec3', {metalness:.8, roughness:.3});
      g.add(rbox(w, .012, d, mat('#0d0d0e', {roughness:.06, metalness:.3}), 0, .862, 0, .004));
      (w/d > 1.4 ? [[-w/4, 0], [w/4, 0]] : [[-w/4,-d/4],[w/4,-d/4],[-w/4,d/4],[w/4,d/4]]).forEach(([x, z]) => {
        g.add(cyl(.085, .09, .008, '#2b2b2b', x, .874, z, 32), cyl(.045, .05, .014, mat('#6b5a45', {metalness:.7, roughness:.35}), x, .874, z, 28), cyl(.028, .028, .022, '#1a1a1a', x, .874, z, 20));
        for (let k = 0; k < 5; k++){ const a = k*Math.PI*2/5; g.add(rot(box(.07, .014, .012, '#1c1c1c', x + Math.cos(a)*.1, .874, z + Math.sin(a)*.1), 0, -a)); }
        g.add(cyl(.02, .022, .018, '#222', x, .874, d/2 - .04, 20));
      });
      g.add(rbox(w, .06, .5, sm, 0, 1.55, bz + .25, .01), box(.3, .72, .26, sm, 0, 1.61, bz + .13));
      g.add(rot(box(w - .02, .3, .008, mat('#15181b', {roughness:.05, metalness:.5}), 0, 1.58, bz + .38), -.9), box(.16, .012, .003, mat('#101214', {emissive:'#6fd0ff', emissiveIntensity:.6}), 0, 1.575, bz + .502));
      break;
    }
    case 'ksink': {
      const st = mat('#c7ccd1', {metalness:.85, roughness:.28}), inner = mat('#9aa1a8', {metalness:.8, roughness:.35}), two = w >= .75, bw = two ? w*.42 : w*.7, bd = d*.66;
      g.add(box(w, .008, d, st, 0, .862, 0));
      (two ? [-w*.23, w*.23] : [0]).forEach(x => g.add(shell(bw, bd, .02, .015, .04, st, x, .862, .03), box(bw - .03, .002, bd - .03, inner, x, .87, .03), cyl(.03, .03, .003, chrome(), x, .872, .03, 20)));
      const fx = two ? 0 : w*.3, cm = chrome();
      g.add(cyl(.025, .028, .03, cm, fx, .87, bz + .06, 20), tube([[fx, .9, bz + .06], [fx, 1.12, bz + .06], [fx, 1.17, bz + .1], [fx, 1.14, bz + .18], [fx, 1.08, bz + .2]], .012, cm));
      g.add(rot(box(.012, .012, .09, cm, fx + .035, .98, bz + .09), -.3));
      break;
    }
    case 'fridge': {
      const fm = mat(c, {metalness:.45, roughness:.28}), h = 1.8, fz = d/2 - .05;
      g.add(box(w - .02, .06, d - .06, '#2a2c2e', 0, 0, -.03), rbox(w, h - .06, d - .05, fm, 0, .06, -.025, .02), box(w - .01, h - .07, .003, '#2a2c2e', 0, .065, fz + .0015));
      if (w > .85){
        [-1, 1].forEach(s => { g.add(rbox(w/2 - .004, h - .08, .04, fm, s*w/4, .07, fz + .023, .012)); pull(g, .8, true, s*.035, 1.05, fz + .043); });
        g.add(box(.1, .14, .003, screenMat('#2a6f8f'), -w/4, 1.25, fz + .044));
      } else {
        g.add(rbox(w - .006, 1.06, .04, fm, 0, .72, fz + .023, .012), rbox(w - .006, .64, .04, fm, 0, .07, fz + .023, .012));
        pull(g, .5, true, -w/2 + .06, 1.05, fz + .043); pull(g, w*.5, false, 0, .64, fz + .043);
        g.add(box(.08, .1, .003, screenMat('#2a6f8f'), w*.22, 1.4, fz + .044));
      }
      break;
    }
    case 'toilet': {
      const cer = ceramic(), Rb = w*.45, zc = bz + d*.62, kz = (d*.37)/Rb, cm = chrome();
      g.add(rbox(w*.88, .4, d*.24, cer, 0, .36, bz + d*.12, .04), rbox(w*.92, .03, d*.27, cer, 0, .76, bz + d*.135, .012), cyl(.022, .022, .006, cm, 0, .79, bz + d*.135, 20));
      const ped = lathe([[0, 0], [Rb*.62, 0], [Rb*.66, .02], [Rb*.56, .12], [Rb*.62, .22], [Rb*.92, .33], [Rb, .37]], cer, 0, 0, zc, 40);
      const seat = cyl(Rb*1.01, Rb*1.01, .022, mat('#f4f4f2', {roughness:.2}), 0, .37, zc, 40), lid = cyl(Rb*.97, Rb*.99, .02, mat('#f4f4f2', {roughness:.2}), 0, .392, zc, 40);
      ped.scale.z = seat.scale.z = lid.scale.z = kz; g.add(ped, seat, lid);
      [-1, 1].forEach(s => g.add(box(.03, .02, .03, cm, s*w*.18, .39, zc - Rb*kz - .005)));
      break;
    }
    case 'vanity': {
      const vm = mat(c, {roughness:.5}), stone = mat('#fafafa', {roughness:.18}), nb = w >= 1.1 ? 2 : 1, cd = d - .04, cm = chrome();
      g.add(rbox(w, .45, cd, vm, 0, .33, bz + cd/2, .008));
      fronts(g, -w/2 + .005, .335, w - .01, .44, d/2 - .04, nb, 2, vm, 'edge');
      g.add(rbox(w, .03, d, stone, 0, .78, 0, .006));
      const rb = Math.min(.19, w/nb*.36);
      for (let i = 0; i < nb; i++){
        const x = nb === 1 ? 0 : (i ? w/4 : -w/4);
        g.add(lathe([[0, 0], [rb*.55, 0], [rb*.85, .03], [rb, .1], [rb*.97, .12]], ceramic({side:THREE.DoubleSide}), x, .81, .03, 40), cyl(.018, .018, .003, cm, x, .812, .03, 16));
        g.add(cyl(.02, .022, .02, cm, x, .81, bz + .06, 16), tube([[x, .83, bz + .06], [x, 1.03, bz + .06], [x, 1.07, bz + .11], [x, 1.03, bz + .15]], .01, cm), rot(box(.01, .01, .06, cm, x, 1.05, bz + .04), .4));
      }
      const mw = Math.min(w*.9, nb*.7);
      g.add(rbox(mw + .02, .82, .02, glowMat('#fff7e6', '#ffe9c4', .9), 0, 1.14, bz + .01, .01), box(mw, .8, .01, mirror(), 0, 1.15, bz + .025));
      g.add(cyl(.028, .028, .12, mat('#c8b8a6', {roughness:.3}), w/2 - .08, .81, bz + .1, 16), rbox(.18, .03, .12, fabric('#e9e2d6'), -w/2 + .12, .81, .05, .012));
      break;
    }
    case 'shower': {
      const cm = chrome(), x = -w/4;
      g.add(rbox(w, .05, d, mat('#f4f4f2', {roughness:.3}), 0, 0, 0, .01), box(w*.6, .003, .05, mat('#9aa1a8', {metalness:.8, roughness:.3}), 0, .05, bz + .08));
      [[w, .01, 0, d/2 - .005], [.01, d, w/2 - .005, 0]].forEach(([gw, gd, px, pz]) => { const p = box(gw, 1.95, gd, glassMat, px, .05, pz); p.castShadow = false; g.add(p); });
      g.add(box(.02, 1.95, .02, frameMat, w/2 - .01, .05, d/2 - .01), box(.02, 1.95, .03, frameMat, -w/2 + .01, .05, d/2 - .005), box(.03, 1.95, .02, frameMat, w/2 - .005, .05, bz + .01));
      g.add(box(w, .015, .02, frameMat, 0, 1.985, d/2 - .005), box(.02, .015, d, frameMat, w/2 - .005, 1.985, 0));
      g.add(rbox(.14, .1, .04, cm, x, 1.0, bz + .02, .01), rod([x, 1.1, bz + .03], [x, 1.95, bz + .03], .012, cm));
      g.add(tube([[x, 1.95, bz + .03], [x, 2.02, bz + .06], [x, 2.03, bz + .22]], .01, cm), rbox(.24, .012, .24, cm, x, 2.02, bz + .25, .004));
      g.add(rot(cyl(.015, .02, .2, cm, x + .1, 1.25, bz + .05, 16), .25), blob(.03, .012, .03, cm, x + .1, 1.47, bz + .08, 16));
      g.add(box(.26, .012, .1, ceramic(), w/2 - .2, 1.2, bz + .05));
      [['#e6dccd', .03, .18], ['#2f5d62', .025, .15], ['#f4f4f2', .028, .12]].forEach(([cc, r, hh], i) => g.add(cyl(r, r, hh, mat(cc, {roughness:.3}), w/2 - .28 + i*.07, 1.212, bz + .05, 16)));
      break;
    }
    case 'bathtub': {
      const cer = ceramic(), h = .56, t = .07, cm = chrome();
      g.add(shell(w, d, h, t, .14, cer), box(w - .1, .12, d - .1, cer, 0, 0, 0), box(w - 2*t + .004, .004, d - 2*t + .004, mat('#bfe0ea', {roughness:.03, transparent:true, opacity:.6}), 0, .4, 0));
      const fx = w/2 - t/2;
      g.add(tube([[fx, h - .02, 0], [fx, h + .1, 0], [fx - .06, h + .13, 0], [fx - .13, h + .09, 0]], .014, cm));
      [-1, 1].forEach(s => g.add(cyl(.02, .02, .04, cm, fx, h, s*.1, 16)));
      g.add(rot(rbox(.08, .16, .3, cer, -w/2 + t + .06, h - .12, 0, .04), 0, 0, -.5), rbox(.22, .05, .16, fabric('#e9e2d6'), fx - .05, h, d/2 - .1, .02));
      break;
    }
    case 'washer': case 'dryer': {
      const bm = mat(c, {roughness:.35}), R0 = Math.min(w, d)*.25, fz = d/2 - .02;
      g.add(box(w - .02, .04, d - .04, '#8f969b', 0, 0, -.02), rbox(w, .81, d - .02, bm, 0, .04, -.01, .025));
      g.add(box(w - .04, .1, .006, lighter(c, .3), 0, .72, fz + .003), rbox(.18, .07, .01, bm, -w/2 + .12, .735, fz + .006, .004));
      g.add(box(.12, .035, .003, screenMat('#1f6f6a'), w*.14, .745, fz + .007));
      const kn = cyl(.03, .03, .02, chrome(), -w*.02, .75, fz + .016, 28); kn.rotation.x = Math.PI/2; g.add(kn);
      const dr = new THREE.Mesh(new THREE.CircleGeometry(R0, 40), mat('#1b1f22', {roughness:.6})); dr.position.set(0, .4, fz + .004); g.add(dr);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(R0 + .02, .022, 14, 48), mat('#c7cfd5', {metalness:.7, roughness:.25})); rg.position.set(0, .4, fz + .016); sh(rg); g.add(rg);
      const Rs = R0*1.42, cap = new THREE.Mesh(new THREE.SphereGeometry(Rs, 32, 12, 0, Math.PI*2, 0, .78), mat(f.type === 'dryer' ? '#4a4038' : '#26343d', {roughness:.04, metalness:.2, transparent:true, opacity:.8}));
      cap.rotation.x = Math.PI/2; cap.position.set(0, .4, fz + .012 - Rs*Math.cos(.78)); g.add(cap);
      g.add(box(w - .06, .004, .003, '#b9c3ca', 0, .08, fz + .002));
      break;
    }
    case 'crib': {
      const wm = woodM(c);
      g.add(rbox(w - .09, .12, d - .09, fabric('#ffffff'), 0, .3, 0, .04), box(w - .06, .025, d - .06, wm, 0, .28));
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rbox(.045, .95, .045, wm, a*(w/2 - .022), 0, b*(d/2 - .022), .008), blob(.028, .028, .028, wm, a*(w/2 - .022), .97, b*(d/2 - .022), 14)));
      [-1, 1].forEach(s => {
        const z = s*(d/2 - .022), x = s*(w/2 - .022);
        g.add(rbox(w - .05, .035, .03, wm, 0, .88, z, .008), rbox(w - .05, .035, .03, wm, 0, .25, z, .008), rbox(.03, .035, d - .05, wm, x, .88, 0, .008), rbox(.03, .035, d - .05, wm, x, .25, 0, .008));
        for (let p = -w/2 + .09; p < w/2 - .05; p += .075) g.add(rod([p, .28, z], [p, .88, z], .009, wm, .009, 8));
        for (let p = -d/2 + .09; p < d/2 - .05; p += .075) g.add(rod([x, .28, p], [x, .88, p], .009, wm, .009, 8));
      });
      g.add(rbox(w*.5, .03, d - .14, fabric('#f3d9c9'), w*.12, .42, 0, .015), rbox(.3, .06, .2, fabric('#fbfaf7'), -w/2 + .22, .42, 0, .03));
      const bx = -w*.3 + .1, bear = '#c9a27a';
      g.add(blob(.05, .06, .045, bear, bx, .5, .12), blob(.045, .042, .04, bear, bx, .59, .12), blob(.016, .016, .01, bear, bx - .032, .625, .12), blob(.016, .016, .01, bear, bx + .032, .625, .12));
      break;
    }
    case 'beanbag': {
      const fab = mat(c, {roughness:.95});
      g.add(blob(w*.5, .3, d*.5, fab, 0, .3, 0, 40), blob(w*.42, .22, d*.22, fab, 0, .5, bz + d*.26, 32));
      break;
    }
    case 'sidetable': {
      const r = Math.min(w, d)/2, bm = blackMetal();
      g.add(lathe([[r*.55, 0], [r*.55, .012], [.03, .035], [.018, .3], [.025, .5], [.08, .52]], bm, 0, 0, 0, 40), cyl(r, r*.98, .025, mat(c, {roughness:.35}), 0, .52, 0, 48));
      g.add(box(.16, .02, .12, '#4f6b8a', -r*.25, .545, 0));
      vase(g, r*.35, .545, -r*.1, .035, .12, '#e9e2d6', R, false);
      break;
    }
    case 'floorlamp': {
      const r = Math.min(w, d)/2, lm = mat(c, {roughness:.35, metalness:.5});
      g.add(lathe([[0, 0], [r*.55, 0], [r*.58, .012], [r*.5, .03], [.02, .035]], lm, 0, 0, 0, 40), rod([0, .03, 0], [0, 1.36, 0], .011, lm));
      g.add(lathe([[r*.85, 0], [r*.55, .36]], glowMat('#f6ecd9', '#ffdca0', .45), 0, 1.22, 0, 48), blob(.035, .035, .035, glowMat('#fff', '#ffe2b0', 1.2), 0, 1.36, 0, 12));
      g.add(ring(r*.85, .004, lm, 0, 1.22, 0), ring(r*.55, .004, lm, 0, 1.58, 0));
      break;
    }
    case 'island': {
      const cm = mat(c, {roughness:.45}), stone = mat('#dcd7cf', {roughness:.2}), cd = d - .3, n = Math.max(1, Math.round((w - .1)/.6)), cab = new THREE.Group(), fz = cd/2 - .03;
      cab.add(box(w - .12, .1, cd - .08, '#4a4641', 0, 0, -.04), box(w - .1, .74, cd - .03, cm, 0, .1, -.015));
      fronts(cab, -w/2 + .05, .64, w - .1, .2, fz, n, 1, cm, 'bar'); fronts(cab, -w/2 + .05, .1, w - .1, .54, fz, n, 1, cm, 'bar', .56);
      cab.rotation.y = Math.PI; cab.position.z = bz + cd/2; g.add(cab);
      g.add(rbox(w, .05, d, stone, 0, .84, 0, .006));
      [-1, 1].forEach(s => g.add(box(.04, .84, d, stone, s*(w/2 - .02), 0, 0)));
      g.add(lathe([[0, 0], [.06, 0], [.14, .06], [.15, .07]], mat('#6b543f', {roughness:.5, side:THREE.DoubleSide}), w*.22, .89, 0, 32));
      for (let k = 0; k < 4; k++) g.add(blob(.04, .04, .04, ['#d98c4a', '#9fbf5a', '#b5463a', '#e6c14f'][k], w*.22 + Math.cos(k*1.6)*.05, .935 + (k === 3 ? .04 : 0), Math.sin(k*1.6)*.05, 14));
      vase(g, -w*.25, .89, -.05, .05, .22, '#e9e2d6', R);
      break;
    }
    case 'barstool': {
      const r = Math.min(w, d)/2, bm = blackMetal(), sy = .7;
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a, b]) => g.add(rod([a*r*.72, 0, b*r*.72], [a*r*.4, sy, b*r*.4], .011, bm)));
      g.add(ring(Math.SQRT2*r*(.72 - .32*.4), .008, bm, 0, .28, 0), cyl(r*.55, r*.55, .02, bm, 0, sy - .01, 0, 32));
      g.add(lathe([[0, 0], [r*.85, 0], [r*.95, .02], [r*.97, .045], [r*.9, .07], [0, .075]], mat(c, {roughness:.6}), 0, sy, 0, 40));
      break;
    }
    case 'waterheater': {
      const r = Math.min(d/2, .23), L = w - .06, yc = 1.95, zc = bz + r + .02, tm = mat(c, {roughness:.35}), cp = mat('#cfd4d8', {roughness:.4});
      const tank = mesh(new THREE.CylinderGeometry(r, r, L, 40), tm); tank.rotation.z = Math.PI/2; tank.position.set(0, yc, zc); g.add(tank);
      [-1, 1].forEach(s => g.add(blob(.035, r*.99, r*.99, cp, s*L/2, yc, zc, 32), box(.05, r*1.1, .02, '#9a9ea3', s*L*.3, yc - r*.55, bz + .01)));
      g.add(rbox(.2, .09, .02, '#e7eaec', L*.18, yc - .05, zc + r*.93, .008), box(.07, .03, .002, screenMat('#2f8f7a'), L*.18 - .04, yc - .02, zc + r*.93 + .011));
      [[-L*.3, '#3b7bbf'], [-L*.18, '#c0463a']].forEach(([x, cc]) => g.add(rod([x, yc - r*.8, zc], [x, 1.3, zc], .012, metal()), cyl(.02, .02, .03, cc, x, 1.5, zc, 12)));
      break;
    }
    case 'tv': {
      const th = w*.5625, yb = 1.2 - th/2, z = bz + .03;
      g.add(rbox(w*.6, th*.6, .03, '#222', 0, yb + th*.2, bz + .015, .01));
      g.add(rbox(w, th, .025, mat('#18181a', {roughness:.4, metalness:.3}), 0, yb, z + .01, .004), box(w - .016, th - .022, .002, screenMat('#1f2b3a'), 0, yb + .014, z + .0235), box(.04, .006, .002, '#8a8a8e', 0, yb + .004, z + .0235));
      break;
    }
    case 'aircon': {
      const am = mat(c, {roughness:.3}), h = 1.8, fz = d/2 - .005;
      g.add(rbox(w, .06, d, '#cfd3d6', 0, 0, 0, .015), rbox(w - .01, h - .06, d - .01, am, 0, .06, 0, .06));
      g.add(rbox(w - .06, 1.0, .01, mat(lighter(c, .4), {roughness:.12}), 0, .22, fz, .005), box(w - .1, .42, .01, '#3d4145', 0, 1.28, fz));
      for (let i = 0; i < 8; i++) g.add(rot(box(w - .11, .012, .03, '#e4e7ea', 0, 1.3 + i*.05, fz + .008), -.35));
      g.add(box(.1, .035, .003, mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.7}), 0, 1.12, fz + .006));
      for (let i = 0; i < 8; i++) g.add(box(w - .12, .005, .004, '#b9bfc4', 0, .09 + i*.015, fz + .002));
      break;
    }
    case 'acwall': {
      const h = .3, am = mat(c, {roughness:.3}), s = new THREE.Shape();
      s.moveTo(0, .02); s.lineTo(0, h); s.lineTo(d*.75, h); s.quadraticCurveTo(d, h, d, h*.55); s.quadraticCurveTo(d, 0, d*.55, 0); s.lineTo(.02, 0); s.lineTo(0, .02);
      const geo = new THREE.ExtrudeGeometry(s, {depth:w - .02, bevelEnabled:true, bevelThickness:.01, bevelSize:.006, bevelSegments:3, curveSegments:16});
      geo.rotateY(-Math.PI/2); geo.translate((w - .02)/2, 2.2, bz); g.add(mesh(geo, am));
      g.add(box(w - .12, .004, .07, '#3a3d40', 0, 2.19, bz + d*.55), rot(box(w - .12, .008, .06, am, 0, 2.18, bz + d*.72), .35));
      g.add(box(.06, .018, .002, mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.7}), w*.3, 2.2 + h*.5, bz + d + .007));
      for (let i = 0; i < 6; i++) g.add(box(w - .12, .003, .008, '#d5d9dc', 0, 2.2 + h + .006, bz + .03 + i*.022));
      break;
    }
    case 'dishwasher': {
      const dm = mat(c, {metalness:.55, roughness:.28}), fz = d/2 - .02;
      g.add(box(w - .01, .08, d - .07, '#3a3834', 0, 0, -.035), box(w - .005, .76, d - .03, '#8b9095', 0, .08, -.015));
      g.add(rbox(w - .006, .7, .02, dm, 0, .085, fz, .004), box(w - .006, .055, .02, '#26282a', 0, .785, fz));
      for (let i = 0; i < 4; i++) g.add(box(.012, .006, .002, mat('#101214', {emissive:i ? '#6fd0ff' : '#7fe08a', emissiveIntensity:.8}), w*.1 + i*.03, .81, fz + .011));
      pull(g, w*.6, false, 0, .74, fz + .01);
      break;
    }
    case 'ovencol': {
      const cm = mat(c, {roughness:.5}), h = 2.1, fz = d/2 - .02, frm = mat('#1c1d1f', {roughness:.3, metalness:.5}), gl = mat('#0b0c0d', {roughness:.03, metalness:.6});
      g.add(box(w - .02, .08, d - .06, '#4a4641', 0, 0, -.03), box(w, h - .08, d - .02, cm, 0, .08, -.01));
      fronts(g, -w/2, .08, w, .6, fz, 1, 2, cm, 'bar'); fronts(g, -w/2, 1.78, w, h - 1.8, fz, 1, 1, cm, 'bar', 1.84);
      [[.7, .58], [1.3, .46]].forEach(([y, ah]) => {
        g.add(box(w - .02, ah - .01, .02, frm, 0, y, fz + .01), box(w - .1, ah*.52, .003, gl, 0, y + ah*.1, fz + .021), box(w - .04, .06, .003, '#2a2c2e', 0, y + ah - .075, fz + .021));
        g.add(box(.08, .022, .002, mat('#101214', {emissive:'#ff9a3c', emissiveIntensity:.7}), 0, y + ah - .056, fz + .023));
        pull(g, w*.7, false, 0, y + ah*.72, fz + .02);
      });
      break;
    }
    case 'purifier': {
      const pm = mat(c, {roughness:.45}), h = .72;
      g.add(rbox(w, h, d, pm, 0, 0, 0, Math.min(w, d)*.2), rbox(w - .05, .006, d - .05, '#8d959b', 0, h - .002, 0, .02));
      for (let i = 0; i < 7; i++) g.add(box(w - .07, .004, .006, '#6f777d', 0, h + .002, -d/2 + .05 + i*(d - .1)/6));
      g.add(rbox(w - .06, .42, .006, fabric('#c8ccd0'), 0, .06, d/2 - .001, .01));
      const rg = new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 8, 32), mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.8})); rg.position.set(0, .6, d/2 + .002); g.add(rg);
      break;
    }
    case 'officechair': {
      const r = Math.min(w, d)*.46, dk = darker(c, .75), bm = mat('#2b2b2d', {roughness:.45}), cm = chrome();
      for (let k = 0; k < 5; k++){
        const a = k*Math.PI*2/5, tx = Math.sin(a)*r*.95, tz = Math.cos(a)*r*.95;
        g.add(rod([0, .1, 0], [tx, .07, tz], .022, bm, .014, 10), cyl(.008, .008, .03, bm, tx, .04, tz, 8), rot(cyl(.026, .026, .03, '#111', tx, .026 - .015, tz, 16), 0, a, Math.PI/2));
      }
      g.add(cyl(.05, .06, .05, bm, 0, .08, 0, 20), cyl(.025, .025, .22, cm, 0, .12, 0, 16), cyl(.036, .036, .12, bm, 0, .12, 0, 16), rbox(.22, .05, .22, bm, 0, .34, .02, .01));
      g.add(rbox(w*.78, .03, d*.72, bm, 0, .38, .04, .01), rbox(w*.8, .08, d*.74, fabric(c), 0, .4, .05, .035));
      g.add(tube([[0, .36, 0], [0, .38, bz + .12], [0, .6, bz + .07]], .02, bm));
      const bf = shell(w*.72, .6, .03, .025, .08, bm); bf.rotation.x = Math.PI/2 - .12; bf.position.set(0, .88, bz + .06); g.add(bf);
      g.add(rot(box(w*.68, .56, .006, mat(dk, {roughness:.85, transparent:true, opacity:.88, side:THREE.DoubleSide}), 0, .6, bz + .085), -.12), rot(rbox(w*.5, .08, .03, fabric(c), 0, .66, bz + .11, .015), -.12));
      g.add(rod([-.05, 1.14, bz + .025], [-.05, 1.22, bz + .015], .008, bm), rod([.05, 1.14, bz + .025], [.05, 1.22, bz + .015], .008, bm), rbox(w*.45, .12, .05, fabric(dk), 0, 1.2, bz + .02, .025));
      [-1, 1].forEach(s => g.add(box(.035, .22, .035, bm, s*w*.4, .42, .04), rbox(.07, .03, d*.4, bm, s*w*.4, .63, .04, .012)));
      break;
    }
    case 'piano': {
      const pk = mat(c, {roughness:.12, metalness:.1}), bd = d*.5, kz = bz + bd, h = 1.25, kd = d*.22 - .03, iv = mat('#faf8f3', {roughness:.3}), eb = mat('#111', {roughness:.25}), kw = (w - .12)/52;
      g.add(box(w, h, bd, pk, 0, 0, bz + bd/2), rbox(w + .02, .03, bd + .03, pk, 0, h, bz + bd/2 + .01, .008));
      [-1, 1].forEach(s => g.add(rbox(.06, .13, kd + .06, pk, s*(w/2 - .03), .6, kz + (kd + .06)/2, .01), box(.05, .6, .05, pk, s*(w/2 - .08), 0, kz + kd + .01), box(.06, .04, d - bd, pk, s*(w/2 - .08), 0, kz + (d - bd)/2)));
      g.add(box(w - .12, .08, kd + .05, pk, 0, .6, kz + (kd + .05)/2), box(w - .12, .1, .03, pk, 0, .68, kz + .015));
      for (let i = 0; i < 52; i++){
        const x = -w/2 + .06 + kw*(i + .5); g.add(box(kw - .0015, .022, kd, iv, x, .68, kz + .03 + kd/2));
        if (i < 51 && 'ACDFG'.includes('ABCDEFG'[i % 7])) g.add(box(kw*.58, .02, kd*.62, eb, x + kw/2, .7, kz + .03 + kd*.31));
      }
      g.add(rot(box(w*.42, .18, .012, pk, 0, .84, kz + .012), -.25));
      [-.06, 0, .06].forEach(x => g.add(box(.025, .012, .07, mat('#c9a35a', {metalness:.9, roughness:.3}), x, .05, kz + .03)));
      const mt = cyl(.0, .05, .2, woodM('#5a3e2b'), w*.3, h + .03, bz + bd/2, 4); mt.rotation.y = Math.PI/4; g.add(mt);
      g.add(rot(box(.14, .18, .015, woodM('#c9a27a'), -w*.3, h + .03, bz + .06), -.15), rot(box(.11, .14, .002, '#9fb3c2', -w*.3, h + .05, bz + .07), -.15));
      break;
    }
    case 'treadmill': {
      const tm = mat(c, {roughness:.55}), bm = mat('#2a2a2c', {roughness:.5}), al = mat('#9a9ea3', {metalness:.6, roughness:.4});
      g.add(rbox(w, .14, d - .25, tm, 0, .03, .125, .03), box(w - .16, .006, d - .5, '#141414', 0, .17, .15));
      [-1, 1].forEach(s => g.add(box(.07, .008, d - .45, al, s*(w/2 - .05), .17, .15)));
      [bz + .06, d/2 - .06].forEach(z => [-1, 1].forEach(s => g.add(box(.06, .03, .06, bm, s*(w/2 - .06), 0, z))));
      g.add(rbox(w, .22, .32, tm, 0, 0, bz + .16, .05));
      [-1, 1].forEach(s => g.add(rod([s*(w/2 - .06), .15, bz + .2], [s*(w/2 - .06), 1.15, bz + .3], .025, bm, .022), tube([[s*(w/2 - .06), 1.0, bz + .28], [s*(w/2 - .06), 1.0, bz + .5], [s*(w/2 - .07), .97, bz + .62]], .018, bm)));
      const cg = new THREE.Group(); cg.position.set(0, 1.2, bz + .31); cg.rotation.x = -.5;
      cg.add(rbox(w*.8, .2, .08, bm, 0, -.1, 0, .02), box(w*.4, .11, .004, screenMat('#2a5d8f'), 0, -.055, .041)); g.add(cg);
      break;
    }
    default: g.add(box(w, .8, d, c));
  }
  g.position.set(wx(f.cx), 0, wz(f.cy));
  g.rotation.y = -f.rot * Math.PI/180;
  g.userData.fid = f.id;
  return g;
}

// 户型坐标 → 世界坐标（与 scene3d 保持一致）
const OX = 6000, OY = 5300;
const wx = x => (x - OX) / 1000, wz = y => (y - OY) / 1000;

// 供 scene3d 使用的建筑材质（避免重复定义）
export const sharedMats = {
  glass: () => new THREE.MeshPhysicalMaterial({color:0xcfe6ef, roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide}),
  wall: () => mat('#f4f1eb', {roughness:.92}),
  cap: () => mat('#34312d', {roughness:.9}),
  frame: () => mat('#5d6166', {roughness:.5, metalness:.4}),
};