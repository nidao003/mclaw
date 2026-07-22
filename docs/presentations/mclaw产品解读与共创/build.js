// mclaw 产品解读与共创 PPT 生成脚本
// 配色：地铁橙 #EE7C4B 主色，深浅三明治结构
// 布局：LAYOUT_WIDE 13.333" x 7.5"
const pptxgen = require('pptxgenjs');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.author = 'mclaw 团队';
pres.title = 'mclaw 产品解读与共创';
pres.company = 'mclaw';

// ── 配色 ──────────────────────────────────────────
const C = {
  brand:    'EE7C4B',  // 地铁橙
  brandDk:  'D95A2B',  // 深橙
  brandSf:  'F5C9B0',  // 浅橙
  brandTx:  'C25A2E',  // 橙色文字
  ink:      '1F1A17',  // 深墨（深色页）
  ink2:     '2B2622',  // 深棕文字
  cream:    'FAF6F1',  // 暖奶油（浅色页）
  paper:    'FFFFFF',  // 卡片白
  text:     '2B2622',
  mute:     '8C8278',
  mute2:    '6B6259',
  line:     'E8E0D6',
  green:    '3A6B5A',  // 墨绿点缀
  gold:     'C9954A',  // 暖金点缀
  blue:     '345B7A',  // 深蓝点缀
};
const FONT = 'Microsoft YaHei';

// ── 阴影工厂（不可复用，每次新建） ─────────────────
const shCard = () => ({ type:'outer', color:'1F1A17', blur:10, offset:3, angle:90, opacity:0.10 });
const shSoft = () => ({ type:'outer', color:'1F1A17', blur:6,  offset:2, angle:90, opacity:0.08 });

// ── 通用组件 ──────────────────────────────────────
function lightBg(s){ s.background = { color: C.cream }; }
function darkBg(s){ s.background = { color: C.ink }; }

function header(s, part, title) {
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:0.55, w:0.13, h:0.62, fill:{color:C.brand}, line:{type:'none'} });
  s.addText(part, { x:0.85, y:0.52, w:8, h:0.28, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:6, margin:0 });
  s.addText(title, { x:0.85, y:0.80, w:11.8, h:0.6, fontSize:27, fontFace:FONT, color:C.text, bold:true, margin:0 });
}

function footer(s, n) {
  s.addShape(pres.shapes.LINE, { x:0.6, y:7.08, w:12.13, h:0, line:{color:C.line, width:0.75} });
  s.addText('mclaw · 内部解读与共创', { x:0.6, y:7.12, w:6, h:0.3, fontSize:9, fontFace:FONT, color:C.mute, margin:0 });
  s.addText(String(n).padStart(2,'0') + ' / 17', { x:11.5, y:7.12, w:1.23, h:0.3, fontSize:9, fontFace:FONT, color:C.mute, align:'right', margin:0 });
}

function card(s, x, y, w, h, fill) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill:{color:fill||C.paper}, line:{color:C.line, width:0.75}, shadow: shCard() });
}
function accentBar(s, x, y, h, color) {
  s.addShape(pres.shapes.RECTANGLE, { x, y, w:0.08, h, fill:{color:color||C.brand}, line:{type:'none'} });
}
function dot(s, x, y, d, color) {
  s.addShape(pres.shapes.OVAL, { x, y, w:d, h:d, fill:{color:color||C.brand}, line:{type:'none'} });
}
// 数字圆
function numCircle(s, x, y, d, num, bg, fg) {
  s.addShape(pres.shapes.OVAL, { x, y, w:d, h:d, fill:{color:bg||C.brand}, line:{type:'none'} });
  s.addText(String(num), { x, y, w:d, h:d, fontSize:d*22, fontFace:FONT, color:fg||'FFFFFF', bold:true, align:'center', valign:'middle', margin:0 });
}

// ════════════════════════════════════════════════
// P1 封面（深色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); darkBg(s);
  // 装饰橙圆
  s.addShape(pres.shapes.OVAL, { x:9.8, y:-1.8, w:5.2, h:5.2, fill:{color:C.brand}, line:{type:'none'} });
  s.addShape(pres.shapes.OVAL, { x:11.0, y:0.2, w:3.0, h:3.0, fill:{color:C.brandDk}, line:{type:'none'} });
  s.addShape(pres.shapes.OVAL, { x:8.6, y:4.2, w:2.2, h:2.2, fill:{color:C.brand}, transparency:55, line:{type:'none'} });
  // 顶部标签
  s.addShape(pres.shapes.RECTANGLE, { x:0.9, y:0.95, w:0.5, h:0.06, fill:{color:C.brand}, line:{type:'none'} });
  s.addText('MCLAW · 内部解读', { x:1.5, y:0.8, w:6, h:0.35, fontSize:12, fontFace:FONT, color:C.brandSf, bold:true, charSpacing:6, margin:0 });
  // 大标题
  s.addText('mclaw', { x:0.85, y:2.0, w:9, h:1.4, fontSize:96, fontFace:FONT, color:C.brand, bold:true, margin:0 });
  // 副标题
  s.addText('面向地铁行业的图形化 AI 桌面助手', { x:0.9, y:3.5, w:9.5, h:0.7, fontSize:26, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
  // 一句话
  s.addText('把命令行 AI 编排能力，变成开箱即用的桌面体验', { x:0.92, y:4.35, w:9.5, h:0.5, fontSize:15, fontFace:FONT, color:C.brandSf, margin:0 });
  // 底部
  s.addShape(pres.shapes.LINE, { x:0.9, y:6.5, w:7, h:0, line:{color:'4A3F38', width:0.75} });
  s.addText('向全公司解读与共创', { x:0.9, y:6.6, w:6, h:0.35, fontSize:13, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
  s.addText('2026.07', { x:0.9, y:6.95, w:6, h:0.3, fontSize:11, fontFace:FONT, color:C.mute, margin:0 });
}

// ════════════════════════════════════════════════
// P2 目录（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:0.6, w:0.13, h:0.62, fill:{color:C.brand}, line:{type:'none'} });
  s.addText('CONTENTS', { x:0.85, y:0.57, w:6, h:0.28, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:6, margin:0 });
  s.addText('本次解读六个部分', { x:0.85, y:0.85, w:11, h:0.6, fontSize:27, fontFace:FONT, color:C.text, bold:true, margin:0 });

  const items = [
    ['01','是什么','产品定位与一句话价值'],
    ['02','有什么用','核心能力与地铁特色'],
    ['03','怎么想的','产品思路与取舍'],
    ['04','借鉴了谁','参考对象与对标'],
    ['05','怎么运转','架构与业务流程'],
    ['06','一起共创','邀请全员参与'],
  ];
  const cw = 3.8, ch = 1.85, gx = 0.36, gy = 0.35;
  const xs = [0.6, 0.6+cw+gx, 0.6+2*(cw+gx)];
  const ys = [1.85, 1.85+ch+gy];
  items.forEach((it, i) => {
    const x = xs[i%3], y = ys[Math.floor(i/3)];
    card(s, x, y, cw, ch);
    accentBar(s, x, y, ch, C.brand);
    numCircle(s, x+0.28, y+0.28, 0.62, it[0], C.brand, 'FFFFFF');
    s.addText(it[1], { x:x+1.05, y:y+0.32, w:cw-1.2, h:0.42, fontSize:18, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(it[2], { x:x+1.05, y:y+0.82, w:cw-1.25, h:0.8, fontSize:11, fontFace:FONT, color:C.mute2, margin:0 });
  });
  footer(s, 2);
}

// ════════════════════════════════════════════════
// P3 mclaw 是什么（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 01 · 是什么', 'mclaw 是什么');
  // 左侧定位
  s.addText('一句话定位', { x:0.6, y:1.7, w:7, h:0.3, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:4, margin:0 });
  s.addText([
    { text:'基于 ', options:{ fontSize:24, color:C.text } },
    { text:'OpenClaw', options:{ fontSize:24, color:C.brand, bold:true } },
    { text:' 二次开发的', options:{ fontSize:24, color:C.text } },
  ], { x:0.6, y:2.1, w:7.2, h:1.0, fontFace:FONT, bold:true, margin:0 });
  s.addText([
    { text:'图形化 AI 桌面助手', options:{ fontSize:24, color:C.text, bold:true, breakLine:true } },
    { text:'专为地铁行业定制', options:{ fontSize:24, color:C.text, bold:true } },
  ], { x:0.6, y:2.95, w:7.2, h:1.3, fontFace:FONT, margin:0 });
  s.addText('欧孚士产品生态的统一客户端--连接旗下所有产品，技能与专家可在其他 AI 系统运行。', { x:0.6, y:4.45, w:7.0, h:1.4, fontSize:14, fontFace:FONT, color:C.mute2, margin:0 });

  // 右侧关键词卡片
  const kws = [
    ['图形化桌面','鼠标即用，告别命令行'],
    ['开箱即用','设置向导，零配置上手'],
    ['地铁行业定制','预装数据查询与专家灵魂'],
    ['多模型接入','auto 智能模型路由'],
    ['开放生态','连欧孚士所有产品，技能可移植'],
    ['安全计费','登录才能用，防白嫖'],
  ];
  const rx = 8.3, rw = 4.4, rh = 0.72, rg = 0.12;
  kws.forEach((kw, i) => {
    const y = 1.7 + i*(rh+rg);
    card(s, rx, y, rw, rh);
    dot(s, rx+0.2, y+0.21, 0.3, [C.brand,C.green,C.gold,C.blue,C.brandDk,C.mute2][i]);
    s.addText(kw[0], { x:rx+0.65, y:y+0.06, w:rw-0.7, h:0.32, fontSize:13, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(kw[1], { x:rx+0.65, y:y+0.38, w:rw-0.7, h:0.3, fontSize:9.5, fontFace:FONT, color:C.mute, margin:0 });
  });
  footer(s, 3);
}

// ════════════════════════════════════════════════
// P4 为什么需要它（浅色，痛点 vs 解法）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 01 · 是什么', '为什么需要它');

  const pains = [
    '命令行门槛高，非技术人员用不了',
    '配置文件复杂，上手成本高',
    '通用 AI 不懂地铁业务',
    '模型 key 裸奔，白嫖风险大',
    '无计费体系，无法商业化',
  ];
  const sols = [
    '图形化桌面，鼠标即用',
    '设置向导，零配置开箱',
    '预装地铁数据查询技能',
    '登录才能用，key 不外泄防白嫖',
    '三档会员计费 + 按次数据计费',
  ];

  // 左栏 痛点
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:1.7, w:5.85, h:5.0, fill:{color:'F0EBE4'}, line:{color:C.line, width:0.75}, shadow: shSoft() });
  s.addText('行业痛点', { x:0.85, y:1.9, w:5, h:0.4, fontSize:16, fontFace:FONT, color:C.mute2, bold:true, margin:0 });
  pains.forEach((p, i) => {
    const y = 2.5 + i*0.82;
    s.addText('✕', { x:0.85, y, w:0.4, h:0.4, fontSize:16, fontFace:FONT, color:C.brandDk, bold:true, margin:0 });
    s.addText(p, { x:1.3, y, w:5.0, h:0.6, fontSize:13, fontFace:FONT, color:C.text, valign:'middle', margin:0 });
  });

  // 右栏 解法
  s.addShape(pres.shapes.RECTANGLE, { x:6.9, y:1.7, w:5.85, h:5.0, fill:{color:C.paper}, line:{color:C.brand, width:1.0}, shadow: shCard() });
  accentBar(s, 6.9, 1.7, 5.0, C.brand);
  s.addText('mclaw 解法', { x:7.15, y:1.9, w:5, h:0.4, fontSize:16, fontFace:FONT, color:C.brandTx, bold:true, margin:0 });
  sols.forEach((p, i) => {
    const y = 2.5 + i*0.82;
    s.addText('✓', { x:7.15, y, w:0.4, h:0.4, fontSize:16, fontFace:FONT, color:C.green, bold:true, margin:0 });
    s.addText(p, { x:7.6, y, w:5.0, h:0.6, fontSize:13, fontFace:FONT, color:C.text, valign:'middle', margin:0 });
  });
  footer(s, 4);
}

// ════════════════════════════════════════════════
// P5 九大功能模块（浅色，3x3）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 02 · 有什么用', '核心能力全景 · 八大模块');

  const mods = [
    ['对话','多模型聊天 · @agent 路由'],
    ['模型','云端管理 · auto 智能路由'],
    ['专家','小欧 / 精营有数 / 报告'],
    ['任务','Cron 定时 · 自动化'],
    ['技能','数据查询 · 文档处理'],
    ['链接','多通道 · 按账号绑代理'],
    ['梦境','梦境创作'],
    ['设置','账户 / 订阅 / 代理'],
  ];
  const cw = 2.8, ch = 1.6, gx = 0.31, gy = 0.3;
  const xs = [0.6, 0.6+cw+gx, 0.6+2*(cw+gx), 0.6+3*(cw+gx)];
  const ys = [1.7, 1.7+ch+gy];
  const colors = [C.brand,C.blue,C.green,C.gold,C.brandDk,C.mute2,C.brand,C.green];
  mods.forEach((m, i) => {
    const x = xs[i%4], y = ys[Math.floor(i/4)];
    card(s, x, y, cw, ch);
    accentBar(s, x, y, ch, colors[i]);
    dot(s, x+0.28, y+0.28, 0.42, colors[i]);
    s.addText(String(i+1).padStart(2,'0'), { x:x+0.28, y:y+0.28, w:0.42, h:0.42, fontSize:13, fontFace:FONT, color:'FFFFFF', bold:true, align:'center', valign:'middle', margin:0 });
    s.addText(m[0], { x:x+0.85, y:y+0.3, w:cw-1.0, h:0.45, fontSize:18, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(m[1], { x:x+0.85, y:y+0.82, w:cw-1.0, h:0.6, fontSize:10.5, fontFace:FONT, color:C.mute2, margin:0 });
  });
  footer(s, 5);
}

// ════════════════════════════════════════════════
// P6 地铁行业四大能力（浅色，2x2）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 02 · 有什么用', '地铁行业四大能力');

  const abis = [
    [C.brand, '地铁数据查询', ['18 类查询：画像 / 城市 / 线路 / 业态','含客流 / 人口 / 产业等经营数据','后续持续扩展更多接口']],
    [C.green, '登录即用·防白嫖',['必须登录才能用任何功能','云端模型 key 不外泄，绑定设备','数据 key 与模型 key 两套隔离']],
    [C.gold,  '会员计费',     ['三档套餐 × 日/周/月 token 池','1 积分 = 1 万 token','自动选最合适的可用模型']],
    [C.blue,  '品牌定制',     ['地铁橙 #EE7C4B 品牌色','菜单两字化命名','暗色默认 + 亮色自适应']],
  ];
  const cw = 5.95, ch = 2.35, gx = 0.3, gy = 0.3;
  const xs = [0.6, 0.6+cw+gx];
  const ys = [1.7, 1.7+ch+gy];
  abis.forEach((a, i) => {
    const x = xs[i%2], y = ys[Math.floor(i/2)];
    card(s, x, y, cw, ch);
    accentBar(s, x, y, ch, a[0]);
    // 大数字
    s.addText('0'+(i+1), { x:x+0.3, y:y+0.25, w:1.2, h:0.7, fontSize:30, fontFace:FONT, color:a[0], bold:true, margin:0 });
    s.addText(a[1], { x:x+1.55, y:y+0.32, w:cw-1.7, h:0.5, fontSize:18, fontFace:FONT, color:C.text, bold:true, margin:0 });
    a[2].forEach((t, j) => {
      s.addText('—  '+t, { x:x+1.55, y:y+0.85+j*0.42, w:cw-1.8, h:0.4, fontSize:11.5, fontFace:FONT, color:C.mute2, margin:0 });
    });
  });
  footer(s, 6);
}

// ════════════════════════════════════════════════
// P7 产品思路（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 03 · 怎么想的', '产品思路');

  const ideas = [
    ['通用底座 + 行业预装','不重新造轮子。OpenClaw 全功能保留，上叠地铁能力——类腾讯 QClaw / WorkBuddy 模式。'],
    ['站在巨人肩膀','借 OpenClaw 运行时、QClaw 架构、ooh-manus 行业内容，自己只做行业适配与商业化。'],
    ['两端协同','桌面端（用户使用）+ Go 后端（服务支撑），职责清晰，独立演进。'],
    ['数据统一','数据 API 从 Java 迁到 Go 后端，一套技术栈、一套鉴权、一套计费，长期省心。'],
  ];
  const colors = [C.brand, C.green, C.gold, C.blue];
  ideas.forEach((it, i) => {
    const y = 1.75 + i*1.18;
    card(s, 0.6, y, 12.13, 1.0);
    numCircle(s, 0.85, y+0.22, 0.56, i+1, colors[i], 'FFFFFF');
    s.addText(it[0], { x:1.65, y:y+0.14, w:3.4, h:0.4, fontSize:16, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(it[1], { x:1.65, y:y+0.52, w:10.8, h:0.45, fontSize:11.5, fontFace:FONT, color:C.mute2, margin:0 });
  });
  footer(s, 7);
}

// ════════════════════════════════════════════════
// P8 借鉴了谁（浅色，4列）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 04 · 借鉴了谁', '四个参考对象');

  const refs = [
    [C.brand, 'OpenClaw','底座',  ['AI 代理运行时','Gateway 协议','技能 / 插件系统','控制电脑与浏览器']],
    [C.blue,  'QClaw','架构',     ['升级不重装的运行时','可靠的数据存储','可装卸的扩展机制','灵活的进程调度']],
    [C.green, 'ooh-manus','内容', ['4 个数据查询 skill','3 个专家灵魂','小欧 / 精营有数 / 报告','行业 know-how 来源']],
    [C.gold,  'Java 后端','数据', ['18 个数据接口迁到 Go','ooh_data 数据源','按次计费模型','统一技术栈与鉴权']],
  ];
  const cw = 2.81, ch = 4.6, gx = 0.3;
  const xs = [0.6, 0.6+cw+gx, 0.6+2*(cw+gx), 0.6+3*(cw+gx)];
  refs.forEach((r, i) => {
    const x = xs[i], y = 1.7;
    card(s, x, y, cw, ch);
    // 顶部色块
    s.addShape(pres.shapes.RECTANGLE, { x, y, w:cw, h:0.9, fill:{color:r[0]}, line:{type:'none'} });
    s.addText(r[1], { x:x+0.15, y:y+0.16, w:cw-0.3, h:0.4, fontSize:16, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
    s.addText(r[2], { x:x+0.15, y:y+0.55, w:cw-0.3, h:0.3, fontSize:11, fontFace:FONT, color:'FFFFFF', charSpacing:4, margin:0 });
    // 借鉴了
    s.addText('借鉴了', { x:x+0.2, y:y+1.05, w:cw-0.4, h:0.3, fontSize:10, fontFace:FONT, color:C.mute, charSpacing:3, margin:0 });
    r[3].forEach((t, j) => {
      s.addText('·  '+t, { x:x+0.2, y:y+1.4+j*0.62, w:cw-0.35, h:0.55, fontSize:11.5, fontFace:FONT, color:C.text, valign:'top', margin:0 });
    });
  });
  footer(s, 8);
}

// ════════════════════════════════════════════════
// P9 三个产品决策 · 借鉴 QClaw（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 04 · 借鉴了谁', '三个产品决策 · 借鉴 QClaw');

  const lessons = [
    ['升级不重装','借鉴 QClaw：底层运行时独立打包，mclaw 升级时用户无感，不用重新下载安装整个应用。'],
    ['数据存得稳','借鉴 QClaw：本地数据用专业数据库存储，可靠不丢、可追溯，满足合规审计要求。'],
    ['功能可装卸','借鉴 QClaw：每个能力像装 App 一样独立安装卸载，用户按需扩展，互不干扰。'],
  ];
  const cw = 3.8, ch = 3.6, gx = 0.36;
  const xs = [0.6, 0.6+cw+gx, 0.6+2*(cw+gx)];
  lessons.forEach((l, i) => {
    const x = xs[i], y = 1.75;
    card(s, x, y, cw, ch);
    numCircle(s, x+0.3, y+0.3, 0.7, i+1, C.brand, 'FFFFFF');
    s.addText(l[0], { x:x+0.3, y:y+1.15, w:cw-0.6, h:0.9, fontSize:16, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(l[1], { x:x+0.3, y:y+2.15, w:cw-0.6, h:1.3, fontSize:11, fontFace:FONT, color:C.mute2, margin:0 });
  });
  // 底部现有优势条
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:5.7, w:12.13, h:0.95, fill:{color:'F0EBE4'}, line:{color:C.line, width:0.75} });
  s.addText('mclaw 现有优势（不需改）', { x:0.85, y:5.8, w:4, h:0.3, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, margin:0 });
  s.addText('跨平台 Mac/Windows  ·  多语言界面  ·  内置用量遥测  ·  预装地铁数据技能与专家', { x:0.85, y:6.12, w:11.6, h:0.4, fontSize:11.5, fontFace:FONT, color:C.text, margin:0 });
  footer(s, 9);
}

// ════════════════════════════════════════════════
// P10 技术架构（浅色，三端）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 05 · 怎么运转', '技术架构 · 两端协同');

  const ends = [
    [C.brand, 'mclaw 桌面端','Electron + React 19','用户主应用','登录后使用：对话 / 查询\n专家 / 技能 / 任务\n底层 OpenClaw 服务'],
    [C.green, 'Go 后端','Go 1.25 · PostgreSQL','mclaw-server/backend','登录鉴权 / 计费\n模型代理 / 数据 API\n钱包 / 订阅 / 官网'],
  ];
  const cw = 5.5, ch = 3.0, gx = 1.13;
  const xs = [0.6, 0.6+cw+gx];
  ends.forEach((e, i) => {
    const x = xs[i], y = 1.9;
    card(s, x, y, cw, ch);
    s.addShape(pres.shapes.RECTANGLE, { x, y, w:cw, h:0.7, fill:{color:e[0]}, line:{type:'none'} });
    s.addText(e[1], { x:x+0.2, y:y+0.15, w:cw-0.4, h:0.45, fontSize:17, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
    s.addText(e[2], { x:x+0.25, y:y+0.85, w:cw-0.5, h:0.35, fontSize:12, fontFace:FONT, color:C.brandTx, bold:true, margin:0 });
    s.addText(e[3], { x:x+0.25, y:y+1.2, w:cw-0.5, h:0.3, fontSize:10, fontFace:FONT, color:C.mute, margin:0 });
    s.addText(e[4], { x:x+0.25, y:y+1.6, w:cw-0.5, h:1.3, fontSize:11.5, fontFace:FONT, color:C.text, margin:0 });
    // 箭头
    if (i < 1) {
      s.addText('->', { x:x+cw+0.06, y:y+1.2, w:gx-0.12, h:0.5, fontSize:28, fontFace:FONT, color:C.brand, bold:true, align:'center', margin:0 });
    }
  });
  // 底部协同说明
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:5.5, w:12.13, h:1.15, fill:{color:'F0EBE4'}, line:{color:C.line, width:0.75} });
  s.addText('两端如何协同', { x:0.85, y:5.6, w:4, h:0.3, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:3, margin:0 });
  s.addText('桌面端登录 Go 后端，所有功能（对话 / 模型 / 数据查询 / 计费）都经后端鉴权与计费；后端另提供官网与管理后台，供用户管理账户、运营管理配置。', { x:0.85, y:5.95, w:11.6, h:0.6, fontSize:11.5, fontFace:FONT, color:C.text, margin:0 });
  footer(s, 10);
}

// ════════════════════════════════════════════════
// P11 用户使用流程（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 05 · 怎么运转', '业务流程 · 用户怎么用');

  const steps = ['设置向导','登录 Go 后端','同步云端模型','自动配数据 key','对话 / 查询'];
  const sw = 2.1, sh = 1.1, sg = 0.35;
  const startX = (13.333 - (5*sw + 4*sg)) / 2;
  steps.forEach((st, i) => {
    const x = startX + i*(sw+sg), y = 2.0;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w:sw, h:sh, fill:{color:C.paper}, line:{color:C.brand, width:1.0}, rectRadius:0.1, shadow: shSoft() });
    numCircle(s, x+sw/2-0.25, y-0.25, 0.5, i+1, C.brand, 'FFFFFF');
    s.addText(st, { x:x+0.1, y, w:sw-0.2, h:sh, fontSize:13, fontFace:FONT, color:C.text, bold:true, align:'center', valign:'middle', margin:0 });
    if (i < 4) {
      s.addText('→', { x:x+sw-0.02, y:y+0.3, w:sg+0.04, h:0.5, fontSize:20, fontFace:FONT, color:C.brand, bold:true, align:'center', margin:0 });
    }
  });
  // 示例对话
  s.addText('示例对话', { x:0.6, y:3.7, w:3, h:0.3, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:3, margin:0 });
  const demos = [
    '五四广场站的整体情况怎么样？',
    '青岛 3 号线有哪些站？',
    '五四广场站周边有没有星巴克？',
  ];
  demos.forEach((d, i) => {
    const y = 4.15 + i*0.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.6, y, w:8.5, h:0.58, fill:{color:C.brand}, transparency:85, line:{color:C.brandSf, width:0.75}, rectRadius:0.08 });
    s.addText(d, { x:0.85, y, w:8.2, h:0.58, fontSize:12.5, fontFace:FONT, color:C.text, valign:'middle', margin:0 });
  });
  // 右侧说明
  s.addShape(pres.shapes.RECTANGLE, { x:9.5, y:4.15, w:3.23, h:2.55, fill:{color:'F0EBE4'}, line:{color:C.line, width:0.75} });
  accentBar(s, 9.5, 4.15, 2.55, C.brand);
  s.addText('不登录任何功能都用不了。登录后即可在对话中直接提问地铁数据，技能自动路由、数据 key 无感注入。', { x:9.75, y:4.35, w:2.85, h:2.2, fontSize:11, fontFace:FONT, color:C.mute2, margin:0 });
  footer(s, 11);
}

// ════════════════════════════════════════════════
// P12 计费模型（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 05 · 怎么运转', '计费模型 · 三档套餐');

  // 左侧表格
  const rows = [
    ['档位','日 token','月送积分','并发'],
    ['basic','200 万','200','1'],
    ['pro','1000 万','1000','3'],
    ['ultra','4000 万','5000','10'],
  ];
  const tableData = rows.map((r, ri) => r.map((cell, ci) => {
    const isH = ri === 0;
    const isUltra = ri === 3;
    return { text: cell, options: {
      fill: { color: isH ? C.brand : (isUltra ? 'FBE9DE' : C.paper) },
      color: isH ? 'FFFFFF' : C.text,
      bold: isH || ci === 0,
      fontSize: isH ? 12 : 12.5,
      fontFace: FONT,
      align: ci === 0 ? 'left' : 'center',
      valign: 'middle',
    }};
  }));
  s.addText('三档套餐', { x:0.6, y:1.7, w:4, h:0.3, fontSize:11, fontFace:FONT, color:C.brandTx, bold:true, charSpacing:3, margin:0 });
  s.addTable(tableData, {
    x:0.6, y:2.1, w:7.3, colW:[1.8,1.9,1.8,1.8],
    border: { pt:0.75, color:C.line },
    rowH: 0.7,
  });
  s.addText('周期：日 = 自然日 / 周 = ISO 周一起 / 月 = 自然月，各自独立懒触发重置', { x:0.6, y:5.2, w:7.3, h:0.6, fontSize:10.5, fontFace:FONT, color:C.mute, margin:0 });

  // 右侧大字
  s.addShape(pres.shapes.RECTANGLE, { x:8.3, y:1.7, w:4.43, h:4.5, fill:{color:C.ink}, line:{type:'none'}, shadow: shCard() });
  s.addText('换算口径', { x:8.55, y:1.95, w:4, h:0.3, fontSize:11, fontFace:FONT, color:C.brandSf, bold:true, charSpacing:4, margin:0 });
  s.addText([
    { text:'1', options:{ fontSize:64, color:C.brand, bold:true } },
    { text:' 积分', options:{ fontSize:20, color:'FFFFFF', bold:true } },
  ], { x:8.55, y:2.4, w:4, h:1.2, fontFace:FONT, margin:0 });
  s.addText('= 1 万 token', { x:8.6, y:3.65, w:4, h:0.5, fontSize:18, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
  s.addShape(pres.shapes.LINE, { x:8.6, y:4.35, w:3.8, h:0, line:{color:'4A3F38', width:0.75} });
  s.addText('auto 智能模型路由', { x:8.6, y:4.55, w:4, h:0.35, fontSize:13, fontFace:FONT, color:C.brandSf, bold:true, margin:0 });
  s.addText('按模型权重与可用性自动挑选最合适的模型，按实际用量记账。', { x:8.6, y:4.95, w:3.9, h:1.0, fontSize:11, fontFace:FONT, color:C.mute, margin:0 });
  footer(s, 12);
}

// ════════════════════════════════════════════════
// P13 数据查询流程（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 05 · 怎么运转', '数据查询流程');

  const steps = [
    ['用户提问',C.brand],
    ['Gateway',C.blue],
    ['数据查询 skill',C.green],
    ['Go 后端\n/api/v1/data',C.gold],
    ['ooh_data 库',C.brandDk],
    ['返回结果',C.green],
  ];
  const sw = 1.75, sh = 1.0, sg = 0.18;
  const totalW = 6*sw + 5*sg;
  const startX = (13.333 - totalW) / 2;
  steps.forEach((st, i) => {
    const x = startX + i*(sw+sg), y = 2.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w:sw, h:sh, fill:{color:C.paper}, line:{color:st[1], width:1.0}, rectRadius:0.08, shadow: shSoft() });
    s.addShape(pres.shapes.RECTANGLE, { x, y, w:sw, h:0.1, fill:{color:st[1]}, line:{type:'none'} });
    s.addText(st[0], { x:x+0.1, y, w:sw-0.2, h:sh, fontSize:11.5, fontFace:FONT, color:C.text, bold:true, align:'center', valign:'middle', margin:0 });
    if (i < 5) {
      s.addText('→', { x:x+sw-0.05, y:y+0.25, w:sg+0.1, h:0.5, fontSize:16, fontFace:FONT, color:st[1], bold:true, align:'center', margin:0 });
    }
  });
  // 下方要点
  const points = [
    [C.brand, '18 类查询', '车站画像 / 城市 / 线路 / 业态，覆盖客流、人口、产业等经营数据'],
    [C.green, '数据 key 无感', '存 macOS Keychain，明文不落配置文件，mclaw 内自动注入'],
    [C.blue,  '通用可导出', '数据 key 不绑客户端，用户可在 Postman / 其他工具直接使用'],
    [C.gold,  '按次计费', '复用钱包 credit，调用 Go 后端 /api/v1/data/* 按次扣费'],
  ];
  points.forEach((p, i) => {
    const x = 0.6 + i*3.03, y = 4.0;
    card(s, x, y, 2.9, 2.4);
    accentBar(s, x, y, 2.4, p[0]);
    s.addText(p[1], { x:x+0.25, y:y+0.2, w:2.6, h:0.4, fontSize:14, fontFace:FONT, color:p[0], bold:true, margin:0 });
    s.addText(p[2], { x:x+0.25, y:y+0.7, w:2.55, h:1.6, fontSize:11, fontFace:FONT, color:C.mute2, margin:0 });
  });
  footer(s, 13);
}

// ════════════════════════════════════════════════
// P14 为什么要共创（深色，转折页）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); darkBg(s);
  // 装饰
  s.addShape(pres.shapes.OVAL, { x:-1.5, y:3.5, w:4, h:4, fill:{color:C.brand}, transparency:70, line:{type:'none'} });
  s.addShape(pres.shapes.OVAL, { x:10.5, y:-1.5, w:4, h:4, fill:{color:C.brandDk}, transparency:60, line:{type:'none'} });
  s.addShape(pres.shapes.RECTANGLE, { x:0.9, y:1.5, w:0.5, h:0.06, fill:{color:C.brand}, line:{type:'none'} });
  s.addText('PART 06 · 一起共创', { x:1.5, y:1.35, w:6, h:0.35, fontSize:12, fontFace:FONT, color:C.brandSf, bold:true, charSpacing:6, margin:0 });
  s.addText('行业 know-how，分散在每个人脑子里', { x:0.9, y:2.1, w:11.5, h:1.4, fontSize:34, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
  s.addText('mclaw 提供了容器，但真正的行业智慧，需要大家一起蒸馏进来。', { x:0.92, y:3.5, w:11, h:0.6, fontSize:16, fontFace:FONT, color:C.brandSf, margin:0 });

  const ts = [
    [C.brand, '一个人的经验', '→ 全公司的能力'],
    [C.green, '重复的劳动',   '→ 可复用的技能'],
    [C.gold,  '私人的套路',   '→ 标准的资产'],
  ];
  ts.forEach((t, i) => {
    const y = 4.5 + i*0.7;
    s.addShape(pres.shapes.OVAL, { x:0.9, y:y+0.05, w:0.3, h:0.3, fill:{color:t[0]}, line:{type:'none'} });
    s.addText(t[1], { x:1.4, y, w:4, h:0.45, fontSize:15, fontFace:FONT, color:'FFFFFF', bold:true, margin:0 });
    s.addText(t[2], { x:5.5, y, w:6, h:0.45, fontSize:15, fontFace:FONT, color:t[0], bold:true, margin:0 });
  });
  s.addText('14 / 17', { x:11.5, y:7.12, w:1.23, h:0.3, fontSize:9, fontFace:FONT, color:C.mute, align:'right', margin:0 });
}

// ════════════════════════════════════════════════
// P15 邀你共创（浅色，2x2）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, 'PART 06 · 一起共创', '邀你一起共创');

  const ways = [
    [C.brand, '贡献行业技能 / 专家灵魂', '把本职经验沉淀成可复用的 skill 或 agent 灵魂，不绑 mclaw，其他 AI 系统也能运行。', '类似小欧 / 精营有数 / 报告生成'],
    [C.green, '试用产品 + 提反馈', '装上用起来，提 bug、提需求、提场景，做产品验证。', '你的真实使用是最好的需求来源'],
    [C.gold,  '共创产品方向', '讨论 mclaw 该往哪走、该加什么行业能力、优先级怎么排。', '方向由使用者定义，不是闭门造车'],
    [C.blue,  '开放数据 / 接口 / 资源', '业务部门把数据源、业务接口、文档开放出来，供技能调用。', '接 ooh_data 那套思路，接入即资产'],
  ];
  const cw = 5.95, ch = 2.35, gx = 0.3, gy = 0.3;
  const xs = [0.6, 0.6+cw+gx];
  const ys = [1.7, 1.7+ch+gy];
  ways.forEach((w, i) => {
    const x = xs[i%2], y = ys[Math.floor(i/2)];
    card(s, x, y, cw, ch);
    accentBar(s, x, y, ch, w[0]);
    numCircle(s, x+0.3, y+0.28, 0.6, i+1, w[0], 'FFFFFF');
    s.addText(w[1], { x:x+1.1, y:y+0.3, w:cw-1.3, h:0.5, fontSize:16, fontFace:FONT, color:C.text, bold:true, margin:0 });
    s.addText(w[2], { x:x+0.35, y:y+1.05, w:cw-0.7, h:0.8, fontSize:11.5, fontFace:FONT, color:C.mute2, margin:0 });
    s.addText('▸ '+w[3], { x:x+0.35, y:y+1.8, w:cw-0.7, h:0.4, fontSize:10.5, fontFace:FONT, color:w[0], bold:true, margin:0 });
  });
  footer(s, 15);
}

// ════════════════════════════════════════════════
// P16 现状与路线（浅色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); lightBg(s);
  header(s, '现状与路线', '现在到哪了，接下来去哪');

  // 左：现状
  s.addShape(pres.shapes.RECTANGLE, { x:0.6, y:1.7, w:5.85, h:5.0, fill:{color:C.paper}, line:{color:C.line, width:0.75}, shadow: shCard() });
  accentBar(s, 0.6, 1.7, 5.0, C.green);
  s.addText('当前状态', { x:0.85, y:1.85, w:5, h:0.4, fontSize:17, fontFace:FONT, color:C.green, bold:true, margin:0 });
  s.addText('v0.4.9-alpha', { x:0.85, y:2.3, w:5, h:0.35, fontSize:11, fontFace:FONT, color:C.mute, margin:0 });
  const now = [
    '两端就绪：mclaw 桌面端 + Go 后端',
    '数据查询 18 类接口调通（画像 / 经营）',
    '会员计费三档 + 自动模型路由落地',
    '云端模型登录绑定，key 不外泄防白嫖',
    '品牌定制完成，地铁橙 + 菜单两字化',
    'macOS / Windows 跨平台安装包',
  ];
  now.forEach((t, i) => {
    s.addText('✓', { x:0.85, y:2.85+i*0.6, w:0.35, h:0.4, fontSize:13, fontFace:FONT, color:C.green, bold:true, margin:0 });
    s.addText(t, { x:1.25, y:2.85+i*0.6, w:5.0, h:0.45, fontSize:11.5, fontFace:FONT, color:C.text, valign:'middle', margin:0 });
  });

  // 右：路线
  s.addShape(pres.shapes.RECTANGLE, { x:6.9, y:1.7, w:5.83, h:5.0, fill:{color:C.paper}, line:{color:C.line, width:0.75}, shadow: shCard() });
  accentBar(s, 6.9, 1.7, 5.0, C.brand);
  s.addText('后续方向', { x:7.15, y:1.85, w:5, h:0.4, fontSize:17, fontFace:FONT, color:C.brandTx, bold:true, margin:0 });
  s.addText('借鉴 QClaw + 行业深化', { x:7.15, y:2.3, w:5, h:0.35, fontSize:11, fontFace:FONT, color:C.mute, margin:0 });
  const next = [
    '升级不重装，底层运行时独立',
    '本地数据可靠存储 + 可追溯合规',
    '功能可装卸，建能力扩展市场',
    '更多数据 API：经营类 / 画像类持续扩展',
    '更多地铁行业 skill / 专家灵魂',
    '多工作区隔离 + 自动备份',
  ];
  next.forEach((t, i) => {
    s.addText('→', { x:7.15, y:2.85+i*0.6, w:0.35, h:0.4, fontSize:13, fontFace:FONT, color:C.brand, bold:true, margin:0 });
    s.addText(t, { x:7.55, y:2.85+i*0.6, w:5.0, h:0.45, fontSize:11.5, fontFace:FONT, color:C.text, valign:'middle', margin:0 });
  });
  footer(s, 16);
}

// ════════════════════════════════════════════════
// P17 结尾（深色）
// ════════════════════════════════════════════════
{
  const s = pres.addSlide(); darkBg(s);
  s.addShape(pres.shapes.OVAL, { x:9.8, y:-2, w:5, h:5, fill:{color:C.brand}, transparency:55, line:{type:'none'} });
  s.addShape(pres.shapes.OVAL, { x:11, y:0.5, w:2.8, h:2.8, fill:{color:C.brandDk}, transparency:30, line:{type:'none'} });
  s.addShape(pres.shapes.RECTANGLE, { x:0.9, y:2.0, w:0.5, h:0.06, fill:{color:C.brand}, line:{type:'none'} });
  s.addText([
    { text:'一起来，把 mclaw', options:{ fontSize:30, color:'FFFFFF', bold:true, breakLine:true } },
    { text:'蒸馏成地铁行业的 ', options:{ fontSize:30, color:'FFFFFF', bold:true } },
    { text:'AI 操作系统', options:{ fontSize:30, color:C.brand, bold:true } },
  ], { x:0.9, y:2.3, w:11, h:2.2, fontFace:FONT, margin:0 });
  s.addText('你的每一个业务经验，都可能变成全公司可复用的能力。', { x:0.92, y:4.7, w:11, h:0.5, fontSize:15, fontFace:FONT, color:C.brandSf, margin:0 });
  // 联系
  s.addShape(pres.shapes.LINE, { x:0.9, y:5.6, w:7, h:0, line:{color:'4A3F38', width:0.75} });
  s.addText('参与方式', { x:0.9, y:5.75, w:3, h:0.3, fontSize:11, fontFace:FONT, color:C.brandSf, bold:true, charSpacing:3, margin:0 });
  s.addText('联系产品 / 研发负责人  ·  提交你的 skill 想法  ·  申请试用账号  ·  加入共创群', { x:0.9, y:6.1, w:11, h:0.4, fontSize:12, fontFace:FONT, color:'FFFFFF', margin:0 });
  s.addText('mclaw · Built for the metro industry', { x:0.9, y:6.9, w:11, h:0.3, fontSize:10, fontFace:FONT, color:C.mute, margin:0 });
  s.addText('17 / 17', { x:11.5, y:7.12, w:1.23, h:0.3, fontSize:9, fontFace:FONT, color:C.mute, align:'right', margin:0 });
}

// ── 输出 ──────────────────────────────────────────
pres.writeFile({ fileName: __dirname + '/mclaw-产品解读与共创.pptx' })
  .then(f => console.log('✅ 生成成功:', f))
  .catch(e => { console.error('❌ 失败:', e); process.exit(1); });
