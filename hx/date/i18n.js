export const LANG_KEY = 'huxing-lang';
export const LANGS = ['zh', 'zht', 'en'];

let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'zh'; } catch(e) { return 'zh'; } })();
export const getLang = () => LANG;

const S2T_PHRASES = [['布置','佈置'],['布局','佈局'],['台面','檯面'],['复制','複製']];
const S2T = new Map(('与與两兩个個为為书書于於仅僅从從价價会會传傳体體余餘侧側倾傾储儲儿兒关關内內写寫净淨准準击擊则則刚剛删刪制製办辦动動势勢区區单單占佔卧臥卫衛厅廳历歷压壓厨廚双雙发發变變叶葉后後吗嗎听聽启啟哑啞围圍图圖圆圓场場坐座块塊垫墊墙牆处處备備复復头頭妆妝婴嬰实實宽寬对對导導层層屉屜属屬岛島带帶干乾并並库庫应應开開当當径徑态態总總悬懸懒懶户戶护護拟擬择擇挂掛挡擋挤擠损損换換据據摆擺摇搖撑撐数數无無时時显顯暂暫机機杂雜杆桿条條来來松鬆构構柜櫃标標栈棧栏欄样樣梁樑棱稜椭橢横橫橱櫥气氣没沒注註浅淺测測浏瀏游遊滚滾满滿灯燈灵靈点點热熱状狀独獨环環现現电電画畫监監盖蓋盘盤砖磚确確离離积積称稱竖豎筑築签籤类類约約级級线線结結绕繞绘繪给給统統继繼绿綠缀綴编編缝縫缩縮网網联聯脚腳获獲虚虛装裝见見视視览覽触觸计計认認让讓议議记記设設识識译譯该該语語请請读讀调調负負败敗质質贴貼赶趕转轉轮輪软軟轴軸轻輕载載较較辅輔辑輯边邊过過这這进進远遠适適选選邻鄰里裡针針钢鋼钮鈕铰鉸铺鋪销銷锁鎖键鍵镜鏡长長门門闭閉闲閒间間阅閱阳陽阴陰阶階随隨隐隱静靜页頁顶頂项項顺順颜顏飘飄飞飛马馬鸟鳥齐齊龙龍').match(/../gu).map(p => [...p]));
const s2t = s => S2T_PHRASES.reduce((a, [f, t]) => a.replaceAll(f, t), s).replace(/[\u3400-\u9fff]/g, c => S2T.get(c) || c);

export const tr = (zh, en) => LANG === 'en' ? en : LANG === 'zht' ? s2t(zh) : zh;

export const NAMES_EN = {
  '主卧室':'Master Bedroom', '主卫浴':'Master Bath', '小孩房':"Kids' Room", '客卫浴':'Guest Bath', '洗衣阳台':'Laundry Balcony',
  '子女房':"Children's Room", '厨房':'Kitchen', '餐厅':'Dining', '过道':'Hallway', '客厅':'Living Room', '休闲阳台':'Leisure Balcony',
  '主卧飘窗':'Master Bay Window', '子女房飘窗':"Children's Bay Window",
  '橡木地板':'Oak Flooring', '胡桃木地板':'Walnut Flooring', '800 地砖':'800 Tile', '600 地砖':'600 Tile', '大理石':'Marble',
  '300 防滑砖':'300 Anti-slip Tile', '水磨石':'Terrazzo', '满铺地毯':'Wall-to-wall Carpet',
  '卧室':'Bedroom', '餐厨':'Dining & Kitchen', '卫浴':'Bathroom', '家电':'Appliances', '书房 · 休闲':'Study & Leisure',
  '双人床 1.8m':'Double Bed 1.8m', '双人床 1.5m':'Double Bed 1.5m', '双人床':'Double Bed', '单人床':'Single Bed', '婴儿床':'Crib',
  '床头柜':'Nightstand', '衣柜':'Wardrobe', '小衣柜':'Small Wardrobe', '梳妆台':'Dresser', '书桌':'Desk', '椅子':'Chair',
  '书架':'Bookshelf', '飘窗垫':'Bay Cushion', '三人沙发':'3-Seat Sofa', '双人沙发':'Loveseat', '转角沙发':'Corner Sofa',
  '单人沙发':'Armchair', '懒人沙发':'Beanbag', '茶几':'Coffee Table', '边几':'Side Table', '电视柜':'TV Stand', '地毯':'Rug',
  '鞋柜':'Shoe Cabinet', '玄关柜':'Entry Cabinet', '落地灯':'Floor Lamp', '绿植':'Plant', '大绿植':'Large Plant',
  '餐桌':'Dining Table', '六人餐桌':'6-Seat Dining Table', '圆桌':'Round Table', '餐椅':'Dining Chair', '岛台':'Kitchen Island',
  '吧椅':'Bar Stool', '橱柜台面':'Kitchen Counter', '燃气灶':'Gas Stove', '水槽':'Sink', '冰箱':'Fridge', '餐边柜':'Sideboard',
  '马桶':'Toilet', '浴室柜':'Vanity', '双盆浴室柜':'Double Vanity', '淋浴房':'Shower', '淋浴区':'Shower Area', '浴缸':'Bathtub',
  '洗衣机':'Washer', '洗衣池':'Laundry Sink', '电热水器':'Water Heater', '储物柜':'Storage Cabinet', '65 寸电视':'65" TV',
  '55 寸电视':'55" TV', '对开门冰箱':'French-door Fridge', '柜机空调':'Floor AC', '挂机空调':'Wall AC', '洗碗机':'Dishwasher',
  '蒸烤箱高柜':'Oven Tower', '烘干机':'Dryer', '空气净化器':'Air Purifier', '长书桌':'Long Desk', '办公椅':'Office Chair',
  '大书架':'Large Bookshelf', '立式钢琴':'Upright Piano', '跑步机':'Treadmill', '阅读椅':'Reading Chair', '茶桌':'Tea Table', '休闲椅':'Lounge Chair',
};
export const nm = s => LANG === 'en' ? (NAMES_EN[s] ?? s) : LANG === 'zht' ? s2t(s) : s;

export function setLang(l){ LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch(e) {} }

export function applyStaticLang(){
  document.documentElement.lang = {zh:'zh-CN', zht:'zh-TW', en:'en'}[LANG];
  document.title = tr('户型装修设计', 'Floor Plan Designer');
  document.querySelectorAll('[data-en]').forEach(el => { el.dataset.zh ??= el.textContent; el.textContent = tr(el.dataset.zh, el.dataset.en); });
  document.querySelectorAll('[data-en-title]').forEach(el => { el.dataset.zhTitle ??= el.title; el.title = tr(el.dataset.zhTitle, el.dataset.enTitle); });
  document.querySelectorAll('#langSel [data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); });
}