import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildFurniture, mat as furnMat, setEnv, refreshEnv } from './furniture3d.js';
import { state, ui, view, snap, commit } from './main.js';
import { doorRect, doorGeom, slideRect, area, bbox } from './core/geometry.js';
import { ROOM_DEF } from './data/rooms.js';
import { nm, tr } from './data/i18n.js';

const $ = s => document.querySelector(s);
const stage = $('#stage'), host = $('#view3d');
const OX = 6000, OY = 5300, FOV = 45;
const H = () => state.ceiling || 2.8;
const wx = x => (x - OX) / 1000, wz = y => (y - OY) / 1000, M = v => v / 1000;
const SW = () => stage.clientWidth, SH = () => stage.clientHeight;
const opt = {cut:2.8, furn:true, labels:true, night:false, hour:10, mode:'orbit'};

let inited = false, active = false, raf = 0, anim = null, fly = null;
let renderer, labelRenderer, scene, camera, orbit, walkCtl, hemi, sun, ground;
let archFloor, archUp, furnG, labelG, lampG, colliders = [], selKey = null, selHelper = null;
let sigArch = '', sigFurn = '', sigLabels = '', grow = 1, furnGrow = 1;
const doors = [], keys = {};

/* 材质：由 furniture3d 提供统一工厂，但我们需要 glass/wall/cap/frame 的句柄 */
const wallMat = () => furnMat('#f4f1eb', {roughness:.92});
const capMat  = () => furnMat('#34312d', {roughness:.9});
const frameMat= () => furnMat('#5d6166', {roughness:.5, metalness:.4});
let glassMat = null;

/* ======================= 初始化 ======================= */
function init(){
  if (inited) return; inited = true;
  renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SW(), SH());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);

  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(SW(), SH());
  Object.assign(labelRenderer.domElement.style, {position:'absolute', inset:'0', pointerEvents:'none'});
  host.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, SW()/SH(), .05, 300);
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI*.495; orbit.minDistance = 1.5; orbit.maxDistance = 45;
  walkCtl = new PointerLockControls(camera, document.body);
  walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });
  walkCtl.addEventListener('unlock', () => { if (opt.mode === 'walk'){ $('#walkOverlay').style.display = 'flex'; $('#cross').style.display = 'none'; } });

  hemi = new THREE.HemisphereLight(0xfff8ee, 0xb9a88f, 1.1);
  sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(2048);
  Object.assign(sun.shadow.camera, {left:-11, right:11, top:11, bottom:-11, near:1, far:60});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color:0xf2eee7, roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.015; ground.receiveShadow = true;
  scene.add(hemi, sun, sun.target, ground);

  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
  setEnv(env, 1);

  glassMat = furnMat('#cfe6ef', {roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide});
  glassMat = glassMat.isMeshStandardMaterial ? glassMat : null;
  if (!glassMat){
    glassMat = new THREE.MeshPhysicalMaterial({color:0xcfe6ef, roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide});
  }

  archFloor = new THREE.Group(); archUp = new THREE.Group(); furnG = new THREE.Group(); labelG = new THREE.Group(); lampG = new THREE.Group();
  scene.add(archFloor, archUp, furnG, labelG, lampG);

  const cv = renderer.domElement; let downAt = null, look = null;
  cv.addEventListener('pointerdown', e => {
    downAt = [e.clientX, e.clientY];
    if (touchWalk && !look){ look = {id:e.pointerId, x:e.clientX, y:e.clientY}; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    lookBy(e.clientX - look.x, e.clientY - look.y); look.x = e.clientX; look.y = e.clientY;
  });
  cv.addEventListener('pointercancel', e => { if (look?.id === e.pointerId) look = null; });

  let fdrag = null;
  host.addEventListener('pointerdown', e => {
    if (e.target !== cv || !e.isPrimary || anim || opt.mode !== 'orbit' || ui.sel?.kind !== 'furn') return;
    const h = pick(e), f = h?.fid === ui.sel.id && state.furniture.find(x => x.id === h.fid), g = f && groundAt(e.clientX, e.clientY);
    if (!g) return;
    fdrag = {id:f.id, pid:e.pointerId, sx:e.clientX, sy:e.clientY, ox:g.x - f.cx, oy:g.y - f.cy, before:snap(), moved:false};
    orbit.enabled = false; fly = null; cv.setPointerCapture(e.pointerId);
  }, true);
  cv.addEventListener('pointermove', e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    if (!fdrag.moved && Math.hypot(e.clientX - fdrag.sx, e.clientY - fdrag.sy) < 4) return;
    const f = state.furniture.find(x => x.id === fdrag.id), g = groundAt(e.clientX, e.clientY); if (!f || !g) return;
    fdrag.moved = true; cv.style.cursor = 'grabbing';
    f.cx = Math.round((g.x - fdrag.ox)/10)*10;
    f.cy = Math.round((g.y - fdrag.oy)/10)*10;
    const obj = furnG.children.find(o => o.userData.fid === f.id);
    if (obj) obj.position.set(wx(f.cx), 0, wz(f.cy));
  });
  const endF = e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    const d = fdrag; fdrag = null; orbit.enabled = true; cv.style.cursor = '';
    if (d.moved){ commit(d.before); window.__renderAll?.(); }
  };
  cv.addEventListener('pointerup', endF); cv.addEventListener('pointercancel', endF);

  cv.addEventListener('pointerup', e => {
    const tap = downAt && Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) <= 4;
    if (look?.id === e.pointerId){
      look = null;
      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; }
      return;
    }
    if (anim || opt.mode !== 'orbit' || !tap) return;
    const h = pick(e);
    if (h?.door) h.door.open = !h.door.open;
    else if (h?.fid) window.__select?.({kind:'furn', id:h.fid});
    else if (h?.room) window.__select?.({kind:'room', id:h.room});
    else window.__select?.(null);
  });
  new ResizeObserver(() => {
    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());
    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  }).observe(stage);
  bindUI();
}

/* ======================= 地面材质 ======================= */
const TEX = {
  wood:{sx:1.8, sy:.36, base:'#d6b58a', rough:.55}, walnut:{sx:1.8, sy:.36, base:'#9a6f4b', rough:.5},
  tile800:{sx:.8, sy:.8, base:'#ebe6dd', grout:'#cfc6b7', rough:.3}, tile600:{sx:.6, sy:.6, base:'#dfe3e0', grout:'#bfc6c1', rough:.35},
  antislip:{sx:.3, sy:.3, base:'#d3d8d4', grout:'#aab2ac', rough:.8}, marble:{sx:1.2, sy:1.2, base:'#f2efe9', grout:'#d9d2c4', rough:.18},
  terrazzo:{sx:.5, sy:.5, base:'#e6dfd3', rough:.4}, carpet:{sx:.3, sy:.3, base:'#c6bfd2', rough:1},
};
const floorMats = {};
function floorMat(kind){
  if (floorMats[kind]) return floorMats[kind];
  const s = TEX[kind] || TEX.tile800, R = (() => { let seed = kind.length*977 + 13; return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
  const cv = document.createElement('canvas'), wood = kind === 'wood' || kind === 'walnut';
  cv.width = wood ? 1024 : 512; cv.height = wood ? 205 : 512;
  const g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
  g.fillStyle = s.base; g.fillRect(0, 0, W, Hh);
  if (wood){
    const rowH = Hh/2, joints = [[W*2/3], [W/3]];
    for (let r = 0; r < 2; r++){
      let x0 = 0;
      [...joints[r], W].forEach(x1 => {
        g.fillStyle = `rgba(0,0,0,${R()*.06})`; g.fillRect(x0, r*rowH, x1-x0, rowH);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x1-1.5, r*rowH, 3, rowH); x0 = x1;
      });
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, r*rowH, W, 2.5);
    }
  } else {
    for (let k = 0; k < 1500; k++){ g.fillStyle = `rgba(0,0,0,${R()*.04})`; g.fillRect(R()*W, R()*Hh, 2, 2); }
  }
  if (s.grout){ g.fillStyle = s.grout; g.fillRect(0, 0, W, 3); g.fillRect(0, 0, 3, Hh); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1/s.sx, 1/s.sy);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return floorMats[kind] = new THREE.MeshStandardMaterial({map:t, roughness:s.rough});
}

/* ======================= 建筑 ======================= */
function clearGroup(g){ g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); g.clear(); }
function wallBox(r, yb, yt, m){
  if (yt - yb <= .001) return;
  const [x0, y0, x1, y1] = r;
  const o = new THREE.Mesh(new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0)), m || [wallMat(), wallMat(), capMat(), wallMat(), wallMat(), wallMat()]);
  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), edgeMat); ln.position.copy(o.position); ln.userData.walkOnly = true; ln.visible = opt.mode === 'walk'; archUp.add(ln);
}
const edgeMat = new THREE.LineBasicMaterial({color:0x6f675b});
function shapeOf(poly, flip){ const s = new THREE.Shape(); poly.forEach(([x, y], i) => s[i ? 'lineTo' : 'moveTo'](wx(x), flip ? wz(y) : -wz(y))); return s; }

function buildArch(){
  clearGroup(archFloor); clearGroup(archUp); lampG.clear(); doors.length = 0; colliders = [];
  const top = opt.cut, HH = H();
  Object.entries(state.rooms).forEach(([id, r]) => {
    if (!r?.poly?.length) return;
    const def = ROOM_DEF.find(x => x.id === id), bay = def?.counted === false;
    const m = floorMat(r.mat);
    const geo = bay ? new THREE.ExtrudeGeometry(shapeOf(r.poly), {depth:.45, bevelEnabled:false}) : new THREE.ShapeGeometry(shapeOf(r.poly));
    geo.rotateX(-Math.PI/2);
    const fl = new THREE.Mesh(geo, m);
    fl.receiveShadow = true; fl.userData.room = id;
    if (bay){ fl.castShadow = true; archUp.add(fl); } else archFloor.add(fl);
    const cg = new THREE.ShapeGeometry(shapeOf(r.poly, true)); cg.rotateX(Math.PI/2);
    const ceil = new THREE.Mesh(cg, furnMat('#fbfaf7', {roughness:1})); ceil.position.y = HH; ceil.visible = top >= HH; archUp.add(ceil);
  });
  state.walls.forEach(w => {
    if (state.demolished.includes(w.id)) return;
    const r = [Math.min(w.x0,w.x1), Math.min(w.y0,w.y1), Math.max(w.x0,w.x1), Math.max(w.y0,w.y1)];
    wallBox(r, 0, w.type === 'low' ? Math.min(1, top) : top);
    colliders.push([wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])]);
  });
  state.doors.forEach(d => { const g = doorGeom(state, d); if (g && top > 2.1) wallBox(g.rect, 2.1, top); });
  state.slides.forEach(s => { const r = slideRect(state, s); if (r && top > 2.1) wallBox([r.x0,r.y0,r.x1,r.y1], 2.1, top); });
  state.wins.forEach((r, i) => {
    const sill = i === 0 ? 1.4 : i >= 6 ? .45 : .9, head = 2.4;
    wallBox([r.x0,r.y0,r.x1,r.y1], 0, Math.min(sill, top)); if (top > head) wallBox([r.x0,r.y0,r.x1,r.y1], head, top);
    colliders.push([wx(r.x0), wz(r.y0), wx(r.x1), wz(r.y1)]);
    const gTop = Math.min(head, top); if (gTop <= sill) return;
    const hz = (r.x1-r.x0) >= (r.y1-r.y0), L = M(hz ? r.x1-r.x0 : r.y1-r.y0), gh = gTop - sill, cx = wx((r.x0+r.x1)/2), cz = wz((r.y0+r.y1)/2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), glassMat); pane.position.set(cx, sill + gh/2, cz); archUp.add(pane);
    const n = Math.max(1, Math.round(L/.9));
    for (let k = 0; k <= n; k++){ const t = -L/2 + k*L/n, mu = new THREE.Mesh(new THREE.BoxGeometry(hz ? .04 : .06, gh, hz ? .06 : .04), frameMat());
      mu.position.set(cx + (hz ? t : 0), sill + gh/2, cz + (hz ? 0 : t)); mu.castShadow = true; archUp.add(mu); }
    [sill + .02, gTop - .02].forEach(y => { const tr = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .06, .04, hz ? .06 : L), frameMat()); tr.position.set(cx, y, cz); archUp.add(tr); });
  });
  state.doors.forEach(d => {
    const g = doorGeom(state, d); if (!g) return;
    const pivot = new THREE.Group(), L = M(g.len), dh = Math.min(2.05, top);
    pivot.position.set(wx(g.h[0]), 0, wz(g.h[1]));
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(L, dh, .04), furnMat(d.entry ? '#6b4f3a' : '#efe6d8', {roughness:.5}));
    leaf.position.set(L/2, dh/2, 0); leaf.castShadow = leaf.receiveShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.03, 12, 8), furnMat('#cfd2d4', {metalness:.9, roughness:.25})); knob.position.set(L - .07, Math.min(1, dh - .05), 0); knob.scale.z = 2.2;
    pivot.add(leaf, knob);
    const ang = v => Math.atan2(-v[1], v[0]), door = {pivot, a0:ang(g.c), a1:ang(g.o), open:true};
    if (door.a1 - door.a0 > Math.PI) door.a1 -= Math.PI*2; if (door.a0 - door.a1 > Math.PI) door.a1 += Math.PI*2;
    door.cur = door.a1; pivot.rotation.y = door.cur; leaf.userData.door = knob.userData.door = door;
    doors.push(door); archUp.add(pivot);
  });
  state.slides.forEach(s => {
    const r = slideRect(state, s); if (!r) return;
    const v = r.vertical, L = M(v ? r.y1-r.y0 : r.x1-r.x0), ph = Math.min(v ? 2.4 : 2.1, top), pl = L*.55;
    [[-1, -.02], [1, .02]].forEach(([sd, off]) => {
      const c = sd < 0 ? -L/2 + pl/2 : L/2 - pl/2;
      const x = v ? wx((r.x0+r.x1)/2) + off : wx(r.x0) + L/2 + c, z = v ? wz(r.y0) + L/2 + c : wz((r.y0+r.y1)/2) + off;
      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), glassMat); p.position.set(x, ph/2, z); archUp.add(p);
      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat()); fr.position.set(x, y, z); archUp.add(fr); });
      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat()); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); archUp.add(fr); });
    });
  });
  applyLight(); applyGrow();
}

function buildFurn(){
  clearGroup(furnG);
  state.furniture.forEach(f => furnG.add(buildFurniture(f)));
  furnG.visible = opt.furn; selKey = null; applyGrow();
}

function buildLabels(){
  labelG.children.slice().forEach(o => { o.element.remove(); labelG.remove(o); });
  ROOM_DEF.filter(r => r.at).forEach(def => {
    const room = state.rooms[def.id]; if (!room?.poly?.length) return;
    const xs = room.poly.map(p=>p[0]), ys = room.poly.map(p=>p[1]);
    const x = (Math.min(...xs)+Math.max(...xs))/2, y = (Math.min(...ys)+Math.max(...ys))/2;
    const el = document.createElement('div'); el.className = 'rlabel';
    el.innerHTML = `${nm(room.name)}<small>${area(room.poly).toFixed(1)}m²</small>`;
    const o = new CSS2DObject(el); o.position.set(wx(x), opt.cut + .15, wz(y)); o.visible = labelG.visible; labelG.add(o);
  });
}

function sync(force){
  if (!inited || (!active && !force)) return;
  const a = JSON.stringify([state.rooms, state.walls, state.wins, state.doors, state.slides, state.demolished, opt.cut]);
  const f = JSON.stringify(state.furniture);
  const l = JSON.stringify([state.rooms, opt.cut]);
  if (force || a !== sigArch){ sigArch = a; buildArch(); }
  if (force || f !== sigFurn){ sigFurn = f; buildFurn(); }
  if (force || l !== sigLabels){ sigLabels = l; buildLabels(); }
}
export function sync3D(){ sync(); }
window.__sync3D = sync3D;

function showLabels(v){ labelG.visible = v; labelG.children.forEach(o => o.visible = v); }
function applyGrow(){
  if (!inited) return;
  archUp.scale.y = Math.max(grow, .001);
  furnG.scale.y = Math.max(furnGrow, .001);
  lampG.visible = grow > .99;
}

function applyLight(){
  const t = (opt.hour - 6) / 12, az = Math.PI * (.15 + t*.7), el = Math.sin(Math.PI*t) * 1.05 + .15, warm = 1 - Math.sin(Math.PI*t);
  sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8); sun.target.position.set(0, 0, 0);
  sun.color.setHSL(.09, .5 + warm*.4, .92 - warm*.12);
  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*t)*1.6;
  hemi.intensity = opt.night ? .12 : 1.1;
  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf7f4ee);
  ground.material.color.set(opt.night ? 0x2a2e38 : 0xf2eee7);
  renderer.toneMappingExposure = opt.night ? 1.25 : 1.05;
  refreshEnv();
}

/* ======================= 相机 / 动画 ======================= */
const ease = t => t < .5 ? 4*t*t*t : 1 - (-2*t + 2)**3/2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const pose = (t, p) => ({t, p});
function planPose(){
  const cx = view.x0 + SW()/2/view.s, cy = view.y0 + SH()/2/view.s, visH = SH()/view.s/1000;
  const dist = visH / 2 / Math.tan(FOV/2*Math.PI/180), t = new THREE.Vector3(wx(cx), 0, wz(cy));
  return pose(t, new THREE.Vector3(t.x, dist, t.z + 1e-4));
}
function isoFrom(P){
  const d = THREE.MathUtils.clamp(P.p.y, 5, 30), dir = new THREE.Vector3(.3, .82, .49).normalize();
  return pose(P.t.clone(), P.t.clone().addScaledVector(dir, d));
}
const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5, 15.5, 10));
const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19, 1e-4));
const curPose = () => pose(orbit.target.clone(), camera.position.clone());
function camTween(A, B, e){
  const t = A.t.clone().lerp(B.t, e);
  const sa = new THREE.Spherical().setFromVector3(A.p.clone().sub(A.t)), sb = new THREE.Spherical().setFromVector3(B.p.clone().sub(B.t));
  let dth = sb.theta - sa.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const s = new THREE.Spherical(sa.radius + (sb.radius - sa.radius)*e, sa.phi + (sb.phi - sa.phi)*e, sa.theta + dth*e);
  camera.position.copy(t).add(new THREE.Vector3().setFromSpherical(s)); camera.lookAt(t); orbit.target.copy(t);
}
function setPose(P){ camera.position.copy(P.p); orbit.target.copy(P.t); camera.lookAt(P.t); }
function animate(dur, fn){ return new Promise(res => { anim = {t0:performance.now(), dur, fn, res}; }); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function flyTo(B, dur = 900){ fly = {t0:performance.now(), dur, A:curPose(), B}; }
function flyToRoom(id){
  const r = state.rooms[id]; if (!r?.poly?.length) return;
  const [x0,y0,x1,y1] = bbox(r.poly);
  const t = new THREE.Vector3(wx((x0+x1)/2), .6, wz((y0+y1)/2));
  const size = M(Math.max(x1-x0, y1-y0));
  const dir = camera.position.clone().sub(orbit.target).setY(0); if (dir.lengthSq() < .01) dir.set(.6, 0, .8); dir.normalize();
  const dist = size*1.3 + 2.2;
  flyTo(pose(t, new THREE.Vector3(t.x + dir.x*dist*.7, dist*1.05, t.z + dir.z*dist*.7)));
}

export async function enter3D(){
  init(); active = true;
  renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  sync(true);
  opt.mode = 'orbit'; orbit.enabled = false; showLabels(false);
  const A = planPose(), B = isoFrom(A);
  grow = 0; furnGrow = 0; applyGrow(); setPose(A);
  stage.classList.add('animating');
  startLoop(); renderer.render(scene, camera);
  stage.classList.add('is3d');
  await wait(420);
  await animate(1700, t => {
    camTween(A, B, ease(clamp01(t/.85)));
    grow = ease(clamp01((t - .1)/.55));
    furnGrow = ease(clamp01((t - .45)/.5));
    applyGrow();
  });
  orbit.enabled = true; showLabels(opt.labels);
  stage.classList.remove('animating');
}

export async function exit3D(){
  if (opt.mode === 'walk'){ walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT; $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, 3).setY(0); opt.mode = 'orbit'; syncModeBtns(); }
  fly = null; orbit.enabled = false; showLabels(false); stage.classList.add('animating');
  const A = curPose(), B = planPose();
  await animate(1300, t => {
    camTween(A, B, ease(clamp01((t - .1)/.9)));
    furnGrow = 1 - ease(clamp01(t/.45));
    grow = 1 - ease(clamp01((t - .2)/.6));
    applyGrow();
  });
  stage.classList.remove('is3d');
  await wait(450);
  active = false; cancelAnimationFrame(raf); raf = 0;
  stage.classList.remove('animating');
  grow = furnGrow = 1; applyGrow();
}

/* ======================= 拾取 ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e){
  if (!e) ptr.set(0, 0);
  else { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1); }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([...(opt.furn ? [furnG] : []), archUp, archFloor], true);
  for (const h of hits){
    let o = h.object;
    if (o.material === glassMat) continue;
    if (o.userData.door) return {door:o.userData.door, dist:h.distance};
    if (o.userData.room) return {room:o.userData.room};
    while (o && !o.userData.fid && o !== scene) o = o.parent;
    if (o?.userData.fid) return {fid:o.userData.fid};
    return null;
  }
  return null;
}
const ground0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
export function groundAt(x, y){
  if (!active || anim) return null;
  const r = renderer.domElement.getBoundingClientRect(), hit = new THREE.Vector3();
  ptr.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1);
  ray.setFromCamera(ptr, camera);
  if (!ray.ray.intersectPlane(ground0, hit) || hit.distanceTo(camera.position) > 60) return null;
  const wall = ray.intersectObjects([archUp, archFloor], true).find(h => h.object.material !== glassMat && h.object.visible);
  if (wall && wall.distance < hit.distanceTo(camera.position) - .01) hit.set(wall.point.x, 0, wall.point.z);
  const px = v => new THREE.Vector2(v.x*r.width/2, v.y*r.height/2), a = px(hit.clone().project(camera));
  const s = Math.max(a.distanceTo(px(hit.clone().add(new THREE.Vector3(1, 0, 0)).project(camera))),
                     a.distanceTo(px(hit.clone().add(new THREE.Vector3(0, 0, 1)).project(camera)))) / 1000;
  return {x:hit.x*1000 + OX, y:hit.z*1000 + OY, s};
}
function updateSel(){
  const key = ui.sel?.kind === 'furn' ? ui.sel.id : '';
  if (key !== selKey){
    selKey = key;
    if (selHelper){ scene.remove(selHelper); selHelper.geometry.dispose(); selHelper = null; }
    const g = key && furnG.children.find(g => g.userData.fid === key);
    if (g){ selHelper = new THREE.BoxHelper(g, 0xb5653a); scene.add(selHelper); }
  }
  if (selHelper) selHelper.update();
}

/* ======================= 漫游 ======================= */
const HINT_ORBIT = () => tr('左键旋转 · 右键平移 · 滚轮缩放 · 选中家具后拖动可摆放 · 点击门开关', 'Left-drag orbits · right-drag pans · scroll zooms · select furniture to drag it · click doors to open');
const HINT_TOUCHWALK = () => tr('左下摇杆移动 · 拖动画面转向 · 点门开关', 'Joystick moves · drag to look · tap doors to open');
const HINT_WALK = () => tr('WASD 移动 · 鼠标转向 · Shift 快走 · E 开关门 · Esc 暂停', 'WASD moves · mouse looks · Shift runs · E opens doors · Esc pauses');
function syncHint3d(){ $('#hint3d').textContent = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk ? HINT_TOUCHWALK() : HINT_WALK(); }
let touchWalk = false;
const joy = {x:0, y:0, id:null}, eul = new THREE.Euler(0, 0, 0, 'YXZ');
function lookBy(dx, dy){
  eul.setFromQuaternion(camera.quaternion);
  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);
  camera.quaternion.setFromEuler(eul);
}
function startTouchWalk(){
  touchWalk = true;
  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';
  syncHint3d();
}
function stopTouchWalk(){
  touchWalk = false; joy.x = joy.y = 0; joy.id = null; $('#joy i').style.transform = '';
  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none';
}
function bindJoystick(){
  const el = $('#joy'), knob = $('#joy i'), R = 50;
  const upd = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const L = Math.hypot(dx, dy); if (L > R){ dx *= R/L; dy *= R/L; }
    joy.x = dx/R; joy.y = dy/R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === joy.id) upd(e); });
  const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
function setMode(m){
  if (anim) return;
  opt.mode = m; syncModeBtns();
  if (m === 'walk'){
    window.__select?.(null);
    if (opt.cut < H()){ opt.cut = H(); syncCutBtns(); sync(); }
    orbit.enabled = false; fly = null;
    camera.position.set(wx(4200), 1.6, wz(8755)); camera.lookAt(wx(7000), 1.5, wz(8755));
    $('#walkOverlay').style.display = 'flex';
    syncHint3d();
  } else {
    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;
    $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    syncHint3d();
    orbit.target.set(0, 0, 0); flyTo(isoWhole());
  }
  showLabels(opt.labels && m === 'orbit');
  archUp.traverse(o => { if (o.userData.walkOnly) o.visible = m === 'walk'; });
}
function blocked(x, z, r = .22){
  for (const [x0, z0, x1, z1] of colliders) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;
  for (const d of doors){
    const a = d.pivot.rotation.y, px = d.pivot.position.x, pz = d.pivot.position.z, ex = px + Math.cos(a)*.9, ez = pz - Math.sin(a)*.9;
    const t = clamp01(((x-px)*(ex-px) + (z-pz)*(ez-pz)) / ((ex-px)**2 + (ez-pz)**2));
    if (Math.hypot(x - (px + t*(ex-px)), z - (pz + t*(ez-pz))) < r*.8) return true;
  }
  return false;
}
function stepWalk(dt){
  if (!walkCtl.isLocked && !touchWalk) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right); if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk){ mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
  const mag = Math.min(1, mv.length());
  if (mag < .05) return;
  mv.normalize().multiplyScalar(sp * mag);
  const p = camera.position;
  if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
  if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
}
addEventListener('keydown', e => {
  if (!active || e.target.matches('input,select,textarea')) return;
  keys[e.code] = true;
  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }
});
addEventListener('keyup', e => keys[e.code] = false);

/* ======================= 工具栏 ======================= */
function syncModeBtns(){ document.querySelectorAll('#modes3d .btn').forEach(b => b.classList.toggle('on', b.dataset.mode === opt.mode)); }
function syncCutBtns(){ document.querySelectorAll('[data-cut]').forEach(b => b.classList.toggle('on', +b.dataset.cut === opt.cut)); }
function syncWalkTexts(){
  const t = [
    tr('点击开始，从入户门进入', 'Click to start at the front door'),
    tr('WASD 移动 · 鼠标转向 · Shift 快走', 'WASD moves · mouse looks · Shift runs'),
    tr('E 开关门 · Esc 暂停', 'E opens doors · Esc pauses')];
  t.forEach((h, i) => { const el = $('#wo' + (i + 1)); if (el) el.textContent = h; });
  syncHint3d();
}
function bindUI(){
  document.querySelectorAll('#modes3d .btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  $('#walkOverlay').onclick = () => walkCtl.lock();
  document.addEventListener('pointerlockerror', () => { if (active && opt.mode === 'walk') startTouchWalk(); });
  $('#walkExit').onclick = () => setMode('orbit');
  bindJoystick();
  syncWalkTexts();
  const iso = $('#vIso'), top = $('#vTop');
  if (iso) iso.onclick = () => { if (opt.mode === 'walk') setMode('orbit'); else flyTo(isoWhole()); };
  if (top) top.onclick = () => { if (opt.mode === 'walk') setMode('orbit'); flyTo(topWhole()); };
  document.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { if (opt.mode === 'walk') return; opt.cut = +b.dataset.cut; syncCutBtns(); sync(); });
  document.querySelectorAll('#toggles3d .btn').forEach(b => b.onclick = () => {
    const k = b.dataset.t; opt[k] = !opt[k]; b.classList.toggle('on', opt[k]);
    if (k === 'furn'){ furnG.visible = opt.furn; }
    if (k === 'labels') showLabels(opt.labels && opt.mode === 'orbit' && !anim);
    if (k === 'night') applyLight();
  });
  const sun = $('#sun'); if (sun) sun.oninput = e => { opt.hour = +e.target.value; applyLight(); };
}

/* ======================= 主循环 ======================= */
const clock = new THREE.Clock();
function startLoop(){ if (!raf){ clock.getDelta(); raf = requestAnimationFrame(loop); } }
function loop(){
  raf = requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  if (anim){ const t = clamp01((now - anim.t0)/anim.dur); anim.fn(t); if (t >= 1){ const r = anim.res; anim = null; r(); } }
  else if (fly){ const t = clamp01((now - fly.t0)/fly.dur); camTween(fly.A, fly.B, ease(t)); if (t >= 1) fly = null; }
  else if (opt.mode === 'orbit') orbit.update();
  else stepWalk(dt);
  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });
  updateSel();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

export function init3D(){ init(); }
export function relang(){ syncWalkTexts(); if (inited) buildLabels(); }
export function shot(){ const a = document.createElement('a'); a.download = tr('户型装修方案', 'floor-plan-design') + '-3D.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click(); }
export function flyToRoomExport(id){ active && !anim && flyToRoom(id); }
export function walking(){ return active && opt.mode === 'walk'; }