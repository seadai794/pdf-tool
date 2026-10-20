const R = (x0,y0,x1,y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];

// 房间用分隔线索引描述：
// vx:[i0,i1] = 左/右边界在 dims.vx 中的索引
// hy:[j0,j1] = 上/下边界在 dims.hy 中的索引
// poly(d) 用于不规则形状，直接返回多边形
export const ROOM_DEF = [
  {id:'master', name:'主卧室', mat:'wood',
    poly:d => R(d.vx[9], d.hy[2], d.vx[12], d.hy[3])},
  {id:'mbath', name:'主卫浴', mat:'antislip',
    poly:d => R(d.vx[5], d.hy[1], d.vx[7], d.hy[2])},
  {id:'kid', name:'小孩房', mat:'wood',
    poly:d => R(d.vx[2], d.hy[1], d.vx[4], d.hy[3])},
  {id:'gbath', name:'客卫浴', mat:'antislip',
    poly:d => R(d.vx[3], d.hy[4], d.vx[5], d.hy[5])},
  {id:'laundry', name:'洗衣阳台', mat:'antislip',
    poly:d => R(d.vx[1], d.hy[4], d.vx[3], d.hy[5])},
  {id:'child', name:'子女房', mat:'wood',
    poly:d => R(d.vx[7], d.hy[4], d.vx[12], d.hy[7])},
  {id:'kitchen', name:'厨房', mat:'tile600',
    poly:d => R(d.vx[1], d.hy[5], d.vx[3], d.hy[8])},
  {id:'dining', name:'餐厅', mat:'tile800',
    poly:d => [[d.vx[3],d.hy[5]],[d.vx[5],d.hy[5]],[d.vx[5],d.hy[8]],[d.vx[3],d.hy[8]],
               [d.vx[3],d.hy[7]],[d.vx[2],d.hy[7]],[d.vx[2],d.hy[6]],[d.vx[3],d.hy[6]]]},
  {id:'hall', name:'过道', mat:'tile800',
    poly:d => [[d.vx[5],d.hy[2]],[d.vx[7],d.hy[2]],[d.vx[7],d.hy[4]],[d.vx[6],d.hy[4]],
               [d.vx[6],d.hy[7]],[d.vx[5],d.hy[7]]]},
  {id:'living', name:'客厅', mat:'tile800',
    poly:d => R(d.vx[5], d.hy[7], d.vx[12], d.hy[11])},
  {id:'balcony', name:'休闲阳台', mat:'walnut',
    poly:d => R(d.vx[12], d.hy[7], d.vx[14], d.hy[11])},
  {id:'bay1', name:'主卧飘窗', mat:'marble', counted:false,
    poly:d => [[d.vx[11],d.hy[3]-1600],[d.vx[12],d.hy[3]-1600],[d.vx[12],d.hy[3]-1640],
               [d.vx[13],d.hy[3]-1640],[d.vx[13],d.hy[3]-460],[d.vx[12],d.hy[3]-460],
               [d.vx[12],d.hy[3]-500],[d.vx[11],d.hy[3]-500]]},
  {id:'bay2', name:'子女房飘窗', mat:'marble', counted:false,
    poly:d => [[d.vx[11],d.hy[5]+0],[d.vx[12],d.hy[5]+0],[d.vx[12],d.hy[5]-40],
               [d.vx[13],d.hy[5]-40],[d.vx[13],d.hy[5]+620],[d.vx[12],d.hy[5]+620],
               [d.vx[12],d.hy[5]+580],[d.vx[11],d.hy[5]+580]]},
];

// 标签位置：相对每个房间 bbox 中心的偏移，渲染时计算
export const ROOM_AT_OFFSET = {
  master:[0,0], mbath:[0,0], kid:[0,0], gbath:[0,0], laundry:[0,0], child:[0,0],
  kitchen:[0,0], dining:[0,0], hall:[0,0], living:[0,-400], balcony:[0,0],
};

export function polyOf(def, dims){
  if (def.poly) return def.poly(dims);
  return R(dims.vx[def.vx[0]], dims.hy[def.hy[0]], dims.vx[def.vx[1]], dims.hy[def.hy[1]]);
}