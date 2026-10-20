import { DIM_DEFAULT, DEFAULT_SEG, DEFAULT_WINS, DEFAULT_DOORS, DEFAULT_SLIDES } from '../data/default-dims.js';
import { ROOM_DEF } from '../data/rooms.js';
import { typeColor } from '../data/furniture.js';

const STORE = 'huxing-design-v3';
let _n = 1;
export const uid = () => 'f' + Date.now().toString(36) + (_n++);
export const F = (type,name,cx,cy,w,d,rot=0,color) => ({id:uid(),type,name,cx,cy,w,d,rot,color:color||typeColor(type)});

export function defaultFurniture(){ return [
  F('bed','双人床',8300,1000,1800,2000,0,'#c9d6df'), F('nightstand','床头柜',7150,220,450,400), F('nightstand','床头柜',9450,220,450,400),
  F('wardrobe','衣柜',8800,3070,2400,600,180), F('baycushion','飘窗垫',10770,1705,520,1800),
  F('shower','淋浴房',5270,450,900,900), F('toilet','马桶',5170,1500,400,700,270), F('vanity','浴室柜',6110,700,800,500,90),
  F('bed','单人床',2420,1000,1200,2000,0,'#e8d5b5'), F('desk','书桌',2120,2700,1200,600,270), F('chair','椅子',2700,2700,450,480,90),
  F('wardrobe','衣柜',4280,1000,1600,600,90), F('bookshelf','书架',3500,150,800,300),
  F('shower','淋浴区',2870,4280,900,1340), F('toilet','马桶',3560,3960,400,700), F('vanity','浴室柜',4150,3850,700,480),
  F('washer','洗衣机',300,3960,600,600,270), F('vanity','洗衣池',250,4600,600,500,270),
  F('counter','橱柜台面',300,6575,2770,600,270), F('counter','橱柜台面',1390,7660,1580,600,180),
  F('stove','燃气灶',300,6200,750,450,270), F('ksink','水槽',1400,7680,800,450,180),
  F('fridge','冰箱',2770,5540,700,700), F('table','餐桌',3600,6650,1400,800,90),
  F('chair','餐椅',2940,6320,450,480,270), F('chair','餐椅',2940,6980,450,480,270),
  F('chair','餐椅',4260,6320,450,480,90), F('chair','餐椅',4260,6980,450,480,90),
  F('cabinet','餐边柜',3500,7785,1600,350,180),
  F('rug','地毯',7600,8950,2600,1800), F('tvstand','电视柜',7600,6810,2400,400), F('sofa','三人沙发',7600,10110,3000,900,180),
  F('coffeetable','茶几',7600,8900,1300,650), F('armchair','单人沙发',9500,8900,850,850,90),
  F('shoecab','鞋柜',4995,9900,1000,350,270), F('plant','绿植',9950,10250,500,500), F('plant','绿植',5250,7050,500,500),
  F('bed','双人床',7323,5500,1500,2000,270,'#d8c7dc'), F('wardrobe','衣柜',8500,3910,2000,600),
  F('desk','书桌',9500,6070,1200,600,180), F('chair','椅子',9500,5480,450,480), F('baycushion','飘窗垫',10770,4997,520,1575),
  F('roundtable','茶桌',11180,8200,600,600), F('armchair','休闲椅',11180,7520,750,750,0,'#d6b99a'),
  F('armchair','休闲椅',11180,8880,750,750,180,'#d6b99a'), F('plant','绿植',11550,10250,500,500),
];}

export function defaultState(){
  const rooms = {};
  ROOM_DEF.forEach(r => rooms[r.id] = {name:r.name, mat:r.mat, poly:[]});
  return {
    dims: { ...DIM_DEFAULT, seg: { ...DEFAULT_SEG } },
    walls: [],
    wins: DEFAULT_WINS.map((r,i)=>({id:'win'+i, x0:r[0],y0:r[1],x1:r[2],y1:r[3]})),
    doors: DEFAULT_DOORS.map((d,i)=>({id:'door'+i, ...d})),
    slides: DEFAULT_SLIDES.map((d,i)=>({id:'slide'+i, ...d})),
    furniture: defaultFurniture(),
    rooms, demolished: [], measures: [], ceiling: 2.8,
  };
}

export function fixState(s){
  if (!s.dims) s.dims = { ...DIM_DEFAULT, seg: { ...DEFAULT_SEG } };
  if (!Array.isArray(s.walls) || !s.walls.length) s.walls = [];
  s.wins ??= DEFAULT_WINS.map((r,i)=>({id:'win'+i, x0:r[0],y0:r[1],x1:r[2],y1:r[3]}));
  s.doors ??= DEFAULT_DOORS.map((d,i)=>({id:'door'+i, ...d}));
  s.slides ??= DEFAULT_SLIDES.map((d,i)=>({id:'slide'+i, ...d}));
  s.rooms ??= {};
  ROOM_DEF.forEach(r => {
    s.rooms[r.id] ??= {name:r.name, mat:r.mat};
    s.rooms[r.id].name ??= r.name;
    s.rooms[r.id].mat ??= r.mat;
    s.rooms[r.id].poly ??= [];
  });
  s.demolished ??= []; s.measures ??= []; s.furniture ??= []; s.ceiling ??= 2.8;
  return s;
}

export function load(){
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s) return fixState(s); } catch(e) {}
  return null;
}
export function save(state){ try { localStorage.setItem(STORE, JSON.stringify(state)); } catch(e) {} }