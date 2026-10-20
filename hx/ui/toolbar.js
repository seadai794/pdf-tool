import { state, ui, view, setTool, zoomCenter, setRatio, fitView, undo, redo, mutate, select } from '../main.js';
import { applyStaticLang, setLang, getLang, tr } from '../data/i18n.js';
import { renderPanel } from './panels.js';

const $ = s => document.querySelector(s);

export function buildHeader(){
  $('#header').innerHTML = `
    <div class="brand"><b>三室两厅两卫 · 装修设计</b><span id="subtitle">尺寸单位 mm</span></div>
    <div class="grp" id="tools">
      <button class="btn on" data-tool="select">${tr('选择','Select')}</button>
      <button class="btn" data-tool="measure">${tr('测量','Measure')}</button>
      <button class="btn" data-tool="demolish">${tr('拆改','Demolish')}</button>
    </div>
    <div class="grp">
      <button class="btn" id="zoomOut">−</button>
      <button class="btn" id="zoomIn">＋</button>
      <button class="btn" id="fit">${tr('适应','Fit')}</button>
      <button class="btn" id="s60">1:60</button>
      <button class="btn" id="s100">1:100</button>
    </div>
    <div class="grp">
      <button class="btn" id="undo">${tr('撤销','Undo')}</button>
      <button class="btn" id="redo">${tr('重做','Redo')}</button>
    </div>
    <div class="spacer"></div>
    <div class="grp" id="langSel">
      <button class="btn chip" data-lang="zh">简</button>
      <button class="btn chip" data-lang="zht">繁</button>
      <button class="btn chip" data-lang="en">EN</button>
    </div>`;
  document.querySelectorAll('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('#zoomIn').onclick = () => zoomCenter(1.25);
  $('#zoomOut').onclick = () => zoomCenter(.8);
  $('#fit').onclick = fitView;
  $('#s60').onclick = () => setRatio(60);
  $('#s100').onclick = () => setRatio(100);
  $('#undo').onclick = undo; $('#redo').onclick = redo;
  $('#langSel').onclick = e => { const l = e.target.closest('[data-lang]')?.dataset.lang; if (l) { setLang(l); applyStaticLang(); buildHeader(); } };
  applyStaticLang();
}

export function buildFooter(){
  $('#footer').innerHTML = `<span>X <b id="cx">—</b></span><span>Y <b id="cy">—</b></span>
    <span>${tr('比例','Scale')} <b id="ratio">—</b></span><span id="hover"></span><span class="spacer"></span><span id="tip"></span>`;
}