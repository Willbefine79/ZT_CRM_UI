const C = {
  canvas: '#CEDBE8',
  surface: '#E6EFF8',
  white: '#FFFFFF',
  ink: '#1A2733',
  muted: '#6D7D8B',
  line: '#C5D3DF',
  panel: '#D4E3F0',
  panelStrong: '#C4D7E8',
  action: '#6986A3',
  neon: '#C4FF62',
  neonSoft: '#ECFFD0',
  blue: '#4D7CFE',
  amber: '#F5A524',
  red: '#E95B64',
  green: '#31A86B'
};

const SCREEN_W = 390;
const SCREEN_H = 844;
const GAP = 72;
let FONT_REGULAR = { family: 'PingFang SC', style: 'Regular' };
let FONT_MEDIUM = { family: 'PingFang SC', style: 'Medium' };
let FONT_BOLD = { family: 'PingFang SC', style: 'Semibold' };

function rgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255
  };
}

function solid(hex, opacity = 1) {
  return [{ type: 'SOLID', color: rgb(hex), opacity }];
}

function iceGradient() {
  return [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: [
      { position: 0, color: { ...rgb('#F1F7FC'), a: 1 } },
      { position: 0.52, color: { ...rgb('#E4EEF8'), a: 1 } },
      { position: 1, color: { ...rgb('#D6E5F2'), a: 1 } }
    ]
  }];
}

function makeFrame(parent, name, x, y, w, h, fill = C.white, radius = 0) {
  const node = figma.createFrame();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = solid(fill);
  node.cornerRadius = radius;
  node.clipsContent = true;
  parent.appendChild(node);
  return node;
}

function box(parent, name, x, y, w, h, fill = C.white, radius = 8, stroke = null) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = solid(fill);
  node.cornerRadius = radius;
  if (stroke) {
    node.strokes = solid(stroke);
    node.strokeWeight = 1;
  }
  parent.appendChild(node);
  return node;
}

function glassBox(parent, name, x, y, w, h, opacity = 0.64, radius = 18, blur = 28) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = solid(C.white, opacity);
  node.cornerRadius = radius;
  node.strokes = solid(C.white, 0.58);
  node.strokeWeight = 1;
  node.effects = [
    { type: 'BACKGROUND_BLUR', radius: blur, visible: true },
    {
      type: 'DROP_SHADOW',
      color: { r: 0.1, g: 0.18, b: 0.26, a: 0.07 },
      offset: { x: 0, y: 18 },
      radius: 48,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL'
    }
  ];
  parent.appendChild(node);
  return node;
}

function notchedGlass(parent, name, x, y, w, h, opacity = 0.72) {
  const card = glassBox(parent, name, x, y, w, h, opacity, 22, 18);
  const notchColor = C.surface;
  ellipse(parent, `${name}/left notch`, x - 7, y + h / 2 - 8, 16, notchColor);
  ellipse(parent, `${name}/right notch`, x + w - 9, y + h / 2 - 8, 16, notchColor);
  ellipse(parent, `${name}/left node`, x - 1, y + h / 2 - 2, 5, '#91AFC8');
  ellipse(parent, `${name}/right node`, x + w - 4, y + h / 2 - 2, 5, '#91AFC8');
  return card;
}

function arcMetric(parent, x, y, size, progress, color, value) {
  const base = ellipse(parent, 'Metric track', x, y, size, '#E5EDF4');
  base.strokes = solid('#B9CCDC');
  base.strokeWeight = 2;
  const arc = figma.createEllipse();
  arc.name = 'Metric progress';
  arc.x = x;
  arc.y = y;
  arc.resize(size, size);
  arc.fills = solid(color);
  arc.arcData = {
    startingAngle: -Math.PI / 2,
    endingAngle: -Math.PI / 2 + Math.PI * 2 * progress,
    innerRadius: 0.78
  };
  parent.appendChild(arc);
  label(parent, value, x, y + size * 0.34, size * 0.22, C.ink, 'medium', size, 'CENTER');
}

function microFlow(parent, x, y, width, color) {
  ellipse(parent, 'Flow start', x, y, 6, color);
  box(parent, 'Flow path', x + 5, y + 2, width - 10, 2, '#AFC4D5', 1);
  ellipse(parent, 'Flow end', x + width - 6, y, 6, C.white, '#91AFC8');
}

function neonDot(parent, x, y, size = 10) {
  const dot = ellipse(parent, 'Active neon point', x, y, size, C.neon);
  dot.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0.77, g: 1, b: 0.38, a: 0.45 },
    offset: { x: 0, y: 0 },
    radius: 10,
    spread: 2,
    visible: true,
    blendMode: 'NORMAL'
  }];
  return dot;
}

function ellipse(parent, name, x, y, size, fill, stroke = null) {
  const node = figma.createEllipse();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(size, size);
  node.fills = solid(fill);
  if (stroke) {
    node.strokes = solid(stroke);
    node.strokeWeight = 1;
  }
  parent.appendChild(node);
  return node;
}

function rule(parent, x, y, w, color = C.line) {
  return box(parent, 'Divider', x, y, w, 1, color, 0);
}

function label(parent, value, x, y, size = 14, color = C.ink, weight = 'regular', width = null, align = 'LEFT') {
  const node = figma.createText();
  node.name = value.slice(0, 24);
  node.fontName = weight === 'bold' ? FONT_BOLD : weight === 'medium' ? FONT_MEDIUM : FONT_REGULAR;
  node.characters = value;
  node.fontSize = size;
  node.fills = solid(color);
  node.x = x;
  node.y = y;
  node.textAlignHorizontal = align;
  node.textAutoResize = width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  if (width) node.resize(width, Math.max(size * 1.4, node.height));
  parent.appendChild(node);
  return node;
}

function pill(parent, value, x, y, fill = C.white, textColor = C.ink, active = false, w = null) {
  const width = w || Math.max(48, value.length * 13 + 22);
  const resolvedFill = fill === C.ink ? C.action : fill;
  box(parent, `Pill/${value}`, x, y, width, 30, resolvedFill, 15, active ? null : C.line);
  label(parent, value, x, y + 7, 12, textColor, active ? 'medium' : 'regular', width, 'CENTER');
  return width;
}

function iconButton(parent, value, x, y, dark = false) {
  const icon = ellipse(parent, `Icon/${value}`, x, y, 36, dark ? C.action : C.white, dark ? null : C.line);
  if (!dark) icon.opacity = 0.74;
  label(parent, value, x, y + 8, 14, dark ? C.white : C.ink, 'medium', 36, 'CENTER');
}

function avatar(parent, initials, x, y, fill = C.neonSoft, size = 40) {
  ellipse(parent, `Avatar/${initials}`, x, y, size, fill);
  label(parent, initials, x, y + size * 0.27, size * 0.31, C.ink, 'medium', size, 'CENTER');
}

function statusBar(parent, dark = false) {
  label(parent, '9:41', 20, 14, 12, dark ? C.white : C.ink, 'medium');
  label(parent, '●●●  5G  ▰', 286, 14, 10, dark ? C.white : C.ink, 'medium');
}

function topBar(parent, title, back = false, dark = false, action = '···') {
  const color = dark ? C.white : C.ink;
  if (back) label(parent, '‹', 18, 48, 30, color, 'regular');
  label(parent, title, back ? 52 : 20, 54, 24, color, 'bold');
  iconButton(parent, action, 334, 46, dark);
}

function bottomNav(parent, active) {
  const nav = box(parent, 'Bottom navigation glass', 0, 774, SCREEN_W, 70, C.white, 0);
  nav.opacity = 0.82;
  nav.effects = [{ type: 'BACKGROUND_BLUR', radius: 24, visible: true }];
  rule(parent, 0, 774, SCREEN_W);
  const items = [
    { key: '工作台', x: 38, glyph: '⌂' },
    { key: '客户', x: 116, glyph: '○' },
    { key: '记录', x: 274, glyph: '≡' },
    { key: '我的', x: 352, glyph: '◇' }
  ];
  items.forEach(item => {
    const color = active === item.key ? C.ink : C.muted;
    if (active === item.key) box(parent, 'Active nav', item.x - 15, 781, 46, 3, C.neon, 2);
    label(parent, item.glyph, item.x, 790, 19, color, 'medium', 26, 'CENTER');
    label(parent, item.key, item.x - 13, 818, 10, color, active === item.key ? 'medium' : 'regular', 42, 'CENTER');
  });
  const quick = ellipse(parent, 'Quick record', 176, 755, 48, C.action);
  quick.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.2 }, offset: { x: 0, y: 8 }, radius: 18, spread: 0, visible: true, blendMode: 'NORMAL' }];
  neonDot(parent, 195, 769, 10);
}

function workbenchItem(parent, y, type, title, detail, action, accent = C.blue) {
  notchedGlass(parent, `Workbench item/${title}`, 20, y, 350, 76, 0.66);
  ellipse(parent, 'Workbench status', 36, y + 20, 28, accent === C.red ? '#FBE6E8' : accent === C.amber ? '#FFF2D8' : '#DCEAF6');
  label(parent, type, 36, y + 28, 9, accent === C.red ? C.red : accent === C.amber ? C.amber : C.action, 'bold', 28, 'CENTER');
  label(parent, title, 78, y + 14, 13, C.ink, 'medium', 210);
  label(parent, detail, 78, y + 39, 10, C.muted, 'regular', 210);
  label(parent, action, 290, y + 27, 10, C.action, 'medium', 62, 'RIGHT');
}

function buildWorkbench(page) {
  const f = screen(page, '00 工作台', 0);
  statusBar(f);
  topBar(f, '工作台', false, false, '◌');
  label(f, '早上好，张伟', 20, 96, 20, C.ink, 'medium');
  label(f, '今天只处理 CRM 事实，不错过任何一条沟通', 20, 125, 11, C.muted, 'regular', 320);
  glassBox(f, 'Workbench metrics', 20, 160, 350, 78, 0.62, 24, 28);
  label(f, '待确认草稿', 38, 175, 10, C.muted);
  label(f, '02', 38, 193, 22, C.ink, 'medium');
  rule(f, 126, 178, 1, '#C4D4E1');
  label(f, '查重候选', 151, 175, 10, C.muted);
  label(f, '01', 151, 193, 22, C.ink, 'medium');
  rule(f, 238, 178, 1, '#C4D4E1');
  label(f, '处理失败', 263, 175, 10, C.muted);
  label(f, '01', 263, 193, 22, C.ink, 'medium');
  label(f, '待处理', 20, 274, 16, C.ink, 'medium');
  label(f, '仅显示系统状态', 278, 278, 10, C.muted);
  workbenchItem(f, 302, '草稿', '电话记录待确认', '华东智造科技 · 今天 14:20', '继续编辑', C.blue);
  workbenchItem(f, 388, '查重', '发现 2 个客户候选', '输入：云启新能源', '去选择', C.amber);
  workbenchItem(f, 474, '失败', '语音材料处理失败', '原始文件仍已保留', '重试', C.red);
  glassBox(f, 'Recent facts', 20, 580, 350, 110, 0.5, 22, 24);
  label(f, '最近事实', 36, 596, 14, C.ink, 'medium');
  label(f, '华东智造科技', 36, 628, 12, C.ink, 'medium');
  label(f, '电话 · 今天 14:20 · 已保存正式记录', 36, 650, 10, C.muted);
  label(f, '云启新能源', 36, 673, 12, C.ink, 'medium');
  label(f, '客户资料 · 昨天 · 已更新', 36, 695, 10, C.muted);
  bottomNav(f, '工作台');
  return f;
}

function searchBar(parent, placeholder, y) {
  glassBox(parent, 'Search glass', 20, y, 350, 42, 0.54, 14, 20);
  label(parent, '⌕', 34, y + 8, 20, C.muted);
  label(parent, placeholder, 64, y + 12, 13, C.muted);
}

function smallTag(parent, value, x, y, color = C.green) {
  const width = value.length * 11 + 16;
  box(parent, `Tag/${value}`, x, y, width, 23, color === C.ink ? C.action : color === C.amber ? '#FFF2D8' : color === C.red ? '#FFE8EA' : C.neonSoft, 12);
  label(parent, value, x, y + 5, 10, color === C.ink ? C.white : color, 'medium', width, 'CENTER');
  return width;
}

function screen(page, name, index, bg = C.surface) {
  const frame = makeFrame(page, name, index * (SCREEN_W + GAP), 0, SCREEN_W, SCREEN_H, bg, 20);
  if (bg === C.surface) frame.fills = iceGradient();
  frame.strokes = solid('#C5C9CE', 0.7);
  frame.strokeWeight = 0.6;
  return frame;
}

function customerRow(parent, y, customer, initials, meta, summary, next, tag, tagColor) {
  rule(parent, 34, y + 117, 322, '#D7DADF');
  avatar(parent, initials, 34, y + 18, initials === '王' ? C.neonSoft : initials === '陈' ? '#DCE8FF' : '#FFE6E8');
  label(parent, customer, 88, y + 16, 16, C.ink, 'bold');
  label(parent, meta, 88, y + 40, 11, C.muted, 'regular', 185);
  smallTag(parent, tag, 292, y + 16, tagColor);
  rule(parent, 34, y + 65, 322, '#E1E4E7');
  label(parent, summary, 34, y + 75, 12, C.ink, 'regular', 304);
  label(parent, next, 34, y + 97, 11, tagColor === C.red ? C.red : C.muted, 'medium', 300);
  label(parent, '›', 342, y + 82, 22, C.muted);
}

function customerTile(parent, x, y, customer, initials, contact, state, accent, next, progress) {
  notchedGlass(parent, `Customer node/${customer}`, x, y, 169, 128, 0.7);
  avatar(parent, initials, x + 14, y + 14, initials === '王' || initials === '刘' ? '#E8F4DF' : '#DCE9F5', 32);
  label(parent, customer, x + 14, y + 54, 13, C.ink, 'medium', 116);
  label(parent, contact, x + 14, y + 74, 9, C.muted, 'regular', 116);
  arcMetric(parent, x + 126, y + 12, 30, progress, accent, `${Math.round(progress * 100)}`);
  microFlow(parent, x + 14, y + 99, 62, accent);
  label(parent, state, x + 84, y + 96, 9, accent === C.red ? C.red : C.muted, 'medium', 66, 'RIGHT');
  label(parent, next, x + 14, y + 113, 9, C.muted, 'medium', 140);
}

function avatarRail(parent, y) {
  glassBox(parent, 'Customer activity rail', 20, y, 350, 58, 0.5, 22, 20);
  label(parent, '客户脉冲', 34, y + 9, 9, C.muted, 'medium');
  const people = [
    ['王', '#E8F4DF', '3'], ['陈', '#DCE9F5', '2'], ['赵', '#F9E4E7', '1'],
    ['林', '#E5E0F5', '4'], ['刘', '#E8F4DF', '2'], ['周', '#DCE9F5', '+']
  ];
  people.forEach((person, index) => {
    const x = 116 + index * 39;
    avatar(parent, person[0], x, y + 12, person[1], 30);
    ellipse(parent, 'Pulse badge', x + 20, y + 35, 14, index === 2 ? '#F5A5AD' : index === 5 ? C.white : '#A8C7E8');
    label(parent, person[2], x + 20, y + 38, 7, C.ink, 'medium', 14, 'CENTER');
  });
}

function timelineItem(parent, y, time, title, body, accent = C.neon) {
  if (accent === C.neon) neonDot(parent, 27, y + 4, 12);
  else ellipse(parent, 'Timeline dot', 27, y + 4, 12, accent);
  box(parent, 'Timeline line', 32, y + 18, 2, 62, C.line, 0);
  label(parent, time, 52, y, 11, C.muted, 'medium');
  label(parent, title, 110, y - 2, 14, C.ink, 'bold');
  label(parent, body, 52, y + 24, 12, C.muted, 'regular', 302);
}

function fieldRow(parent, y, title, value, flagged = false) {
  label(parent, title, 34, y, 11, C.muted);
  label(parent, value, 34, y + 20, 14, C.ink, 'medium', 270);
  if (flagged) smallTag(parent, '待确认', 292, y + 14, C.amber);
  rule(parent, 34, y + 48, 322, '#ECEEF0');
}

function buildCustomers(page) {
  const f = screen(page, '01 客户列表', 1);
  statusBar(f);
  topBar(f, '客户', false, false, '+');
  searchBar(f, '搜索客户名称、简称或联系人', 94);
  pill(f, '全部', 20, 148, C.ink, C.white, true, 54);
  pill(f, '行业', 82, 148, C.white, C.ink, false, 58);
  pill(f, '业务线', 148, 148, C.white, C.ink, false, 70);
  pill(f, '合作关系', 226, 148, C.white, C.ink, false, 90);
  avatarRail(f, 190);
  customerTile(f, 20, 264, '华东智造', '王', '王磊 · 采购总监', '跟进中', C.green, '资料完整 82%', 0.82);
  customerTile(f, 201, 264, '云启新能源', '陈', '陈静 · 总经理', '潜在', C.amber, '资料完整 64%', 0.64);
  customerTile(f, 20, 404, '星河供应链', '赵', '赵铭 · 运营负责人', '已流失', C.red, '资料完整 31%', 0.31);
  customerTile(f, 201, 404, '卓越医疗', '林', '林雅 · 信息总监', '潜在', C.blue, '资料完整 56%', 0.56);
  customerTile(f, 20, 544, '汇联数据', '刘', '刘博 · 业务总监', '已成交', C.green, '资料完整 74%', 0.74);
  customerTile(f, 201, 544, '北辰科技', '周', '周宁 · 创始人', '潜在', C.blue, '资料完整 42%', 0.42);
  bottomNav(f, '客户');
  return f;
}

function buildCustomerDetail(page) {
  const f = screen(page, '02 客户详情', 2);
  statusBar(f);
  topBar(f, '客户详情', true, false, '···');
  const hero = box(f, 'Floating mist blue summary', 20, 94, 350, 186, C.panelStrong, 24);
  hero.strokes = solid(C.white, 0.58);
  hero.strokeWeight = 1;
  hero.effects = [{ type: 'DROP_SHADOW', color: { r: 0.12, g: 0.2, b: 0.28, a: 0.1 }, offset: { x: 0, y: 20 }, radius: 42, spread: 0, visible: true, blendMode: 'NORMAL' }];
  avatar(f, '华', 36, 112, '#EDF4FA', 48);
  neonDot(f, 70, 148, 10);
  label(f, '华东智造科技', 100, 112, 21, C.ink, 'medium');
  label(f, '制造业 · 上海 · A级客户', 100, 145, 11, C.muted);
  label(f, '最近沟通', 36, 197, 10, C.muted);
  label(f, '今天 14:20', 36, 218, 15, C.ink, 'medium');
  label(f, '业务线关系', 198, 197, 10, C.muted);
  label(f, '制造业务 · 跟进中', 198, 218, 14, C.ink, 'medium');
  box(f, 'Neon indicator', 198, 247, 90, 2, C.neon, 1);
  glassBox(f, 'Tabs glass', 20, 300, 350, 42, 0.56, 14, 24);
  box(f, 'Active tab', 24, 304, 167, 34, C.action, 11);
  label(f, '动态', 24, 313, 13, C.white, 'medium', 167, 'CENTER');
  label(f, '资料', 195, 313, 13, C.muted, 'medium', 167, 'CENTER');
  label(f, '沟通动态', 24, 370, 17, C.ink, 'medium');
  label(f, '共 12 条', 302, 374, 11, C.muted);
  glassBox(f, 'Timeline glass', 20, 400, 350, 282, 0.48, 22, 30);
  timelineItem(f, 420, '今天 14:20', '电话沟通', '王总认可初步方案，希望补充实施周期与报价。');
  timelineItem(f, 510, '8月18日', '微信沟通', '确认预算范围，客户内部将在本周完成评审。', C.blue);
  timelineItem(f, 600, '8月12日', '客户拜访', '完成首次需求访谈，明确核心系统集成范围。', C.amber);
  glassBox(f, 'Sticky actions glass', 20, 704, 350, 54, 0.76, 18, 24);
  iconButton(f, '☎', 30, 713);
  iconButton(f, '···', 76, 713);
  box(f, 'Primary action', 126, 710, 234, 42, C.action, 14);
  neonDot(f, 150, 726, 9);
  label(f, '记录沟通', 126, 722, 14, C.white, 'medium', 234, 'CENTER');
  return f;
}

function buildQuickInput(page) {
  const f = screen(page, '03 快速记录', 3);
  statusBar(f);
  topBar(f, '记录沟通', false, false, '×');
  glassBox(f, 'Input glass panel', 20, 94, 350, 590, 0.55, 26, 32);
  label(f, '关联客户', 38, 116, 10, C.muted);
  box(f, 'Customer selector', 34, 138, 322, 50, C.panelStrong, 17);
  avatar(f, '王', 46, 147, '#F1F6FA', 32);
  neonDot(f, 69, 171, 8);
  label(f, '华东智造科技 · 王磊', 90, 154, 13, C.ink, 'medium');
  label(f, '更换  ›', 300, 155, 10, C.muted, 'medium');
  box(f, 'Segment', 34, 210, 322, 40, '#DDE0E3', 14);
  box(f, 'Segment active', 38, 214, 102, 32, C.white, 11);
  label(f, '语音', 38, 223, 12, C.ink, 'medium', 102, 'CENTER');
  label(f, '文字', 143, 223, 12, C.muted, 'medium', 102, 'CENTER');
  label(f, '拍照', 248, 223, 12, C.muted, 'medium', 102, 'CENTER');
  label(f, '正在聆听', 0, 292, 11, C.muted, 'medium', SCREEN_W, 'CENTER');
  label(f, '00:24', 0, 316, 28, C.ink, 'medium', SCREEN_W, 'CENTER');
  const heights = [22, 42, 68, 36, 82, 54, 30, 64, 44, 72, 28, 52, 34];
  heights.forEach((h, i) => box(f, 'Wave', 58 + i * 21, 394 - h / 2, 3, h, i === 6 ? C.neon : '#A8ADB2', 2));
  const halo = ellipse(f, 'Record glass halo', 143, 452, 104, C.white, '#FFFFFF');
  halo.opacity = 0.58;
  halo.effects = [{ type: 'BACKGROUND_BLUR', radius: 20, visible: true }];
  const record = ellipse(f, 'Record core', 158, 467, 74, C.action);
  record.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.18 }, offset: { x: 0, y: 12 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
  box(f, 'Stop', 184, 493, 22, 22, C.white, 5);
  neonDot(f, 221, 475, 9);
  label(f, '点击结束录音', 0, 568, 11, C.muted, 'regular', SCREEN_W, 'CENTER');
  box(f, 'Transcript preview', 34, 604, 322, 58, C.panelStrong, 16);
  label(f, '实时转写', 48, 617, 9, C.action, 'medium');
  label(f, '认可方案，希望补充实施周期和报价……', 48, 638, 11, C.ink, 'regular', 282);
  box(f, 'Primary action', 20, 710, 350, 50, C.action, 18);
  neonDot(f, 292, 730, 9);
  label(f, '整理记录  →', 20, 725, 14, C.white, 'medium', 350, 'CENTER');
  return f;
}

function buildConfirm(page) {
  const f = screen(page, '04 确认沟通记录', 4);
  statusBar(f);
  topBar(f, '确认沟通记录', true, false, '×');
  glassBox(f, 'AI status glass', 20, 92, 350, 44, 0.58, 14, 20);
  ellipse(f, 'AI dot', 32, 104, 20, C.action);
  label(f, 'AI', 32, 108, 8, C.white, 'bold', 20, 'CENTER');
  label(f, '已整理 9 个字段，2 个需要确认', 62, 105, 12, C.ink, 'regular');
  label(f, '查看原文⌄', 291, 105, 11, C.ink, 'medium');
  label(f, '关联对象', 20, 158, 15, C.ink, 'bold');
  glassBox(f, 'Section objects glass', 20, 184, 350, 110, 0.56, 18, 26);
  fieldRow(f, 199, '客户', '华东智造科技');
  fieldRow(f, 253, '联系人', '王磊 · 采购总监');
  label(f, '沟通信息', 20, 318, 15, C.ink, 'bold');
  glassBox(f, 'Section communication glass', 20, 344, 350, 164, 0.56, 18, 26);
  fieldRow(f, 359, '方式与时间', '电话 · 今天 14:20');
  fieldRow(f, 413, '沟通摘要', '认可初步方案，需要补充周期和报价');
  fieldRow(f, 467, '客户态度', '积极', true);
  label(f, '下一步', 20, 532, 15, C.ink, 'bold');
  glassBox(f, 'Section next glass', 20, 558, 350, 112, 0.56, 18, 26);
  fieldRow(f, 573, '行动', '发送实施周期与正式报价');
  fieldRow(f, 627, '创建人 · 草稿来源', '张伟 · 语音材料转写', false);
  glassBox(f, 'Secondary action glass', 20, 702, 112, 52, 0.7, 17, 20);
  label(f, '保存草稿', 20, 718, 14, C.ink, 'medium', 112, 'CENTER');
  box(f, 'Primary action', 142, 702, 228, 52, C.action, 17);
  neonDot(f, 322, 721, 9);
  label(f, '保存记录  →', 142, 718, 14, C.white, 'medium', 228, 'CENTER');
  return f;
}

function recordRow(parent, y, time, customer, method, summary, next, accent = C.neon) {
  label(parent, time, 20, y, 11, C.muted, 'medium');
  ellipse(parent, 'Record dot', 91, y + 2, 12, accent);
  box(parent, 'Record line', 96, y + 17, 2, 123, C.line, 0);
  notchedGlass(parent, `Record node/${customer}`, 116, y - 4, 254, 126, 0.64);
  label(parent, customer, 130, y + 10, 15, C.ink, 'bold');
  smallTag(parent, method, 300, y + 8, C.ink);
  label(parent, summary, 130, y + 42, 12, C.ink, 'regular', 220);
  rule(parent, 130, y + 81, 222, '#ECEEF0');
  label(parent, next, 130, y + 92, 11, accent === C.red ? C.red : C.muted, 'medium', 216);
  microFlow(parent, 290, y + 101, 54, accent);
}

function buildRecords(page) {
  const f = screen(page, '05 沟通记录', 5);
  statusBar(f);
  topBar(f, '沟通记录', false, false, '⌕');
  glassBox(f, 'Filter glass rail', 16, 88, 358, 48, 0.45, 18, 20);
  pill(f, '全部记录', 22, 97, C.ink, C.white, true, 78);
  pill(f, '电话', 108, 97, C.white, C.ink, false, 58);
  pill(f, '拜访', 174, 97, C.white, C.ink, false, 58);
  pill(f, '有后续', 240, 97, C.white, C.ink, false, 70);
  iconButton(f, '≡', 326, 94);
  label(f, '今天', 20, 158, 16, C.ink, 'bold');
  recordRow(f, 195, '14:20', '华东智造科技', '电话', '认可初步方案，希望补充实施周期和报价。', '下一步：周二前发送报价', C.green);
  recordRow(f, 341, '10:05', '云启新能源', '微信', '确认明天下午进行线上产品演示。', '明天 14:00 产品演示', C.blue);
  label(f, '昨天', 20, 492, 16, C.ink, 'bold');
  recordRow(f, 530, '16:40', '星河供应链', '拜访', '项目内部优先级下降，预算暂未释放。', '已逾期：确认是否继续', C.red);
  bottomNav(f, '记录');
  return f;
}

function buildRecordDetail(page) {
  const f = screen(page, '06 沟通记录详情', 6);
  statusBar(f);
  topBar(f, '沟通详情', true, false, '···');
  const summary = box(f, 'Floating mist blue summary', 20, 94, 350, 214, C.panelStrong, 24);
  summary.strokes = solid(C.white, 0.58);
  summary.strokeWeight = 1;
  summary.effects = [{ type: 'DROP_SHADOW', color: { r: 0.12, g: 0.2, b: 0.28, a: 0.1 }, offset: { x: 0, y: 20 }, radius: 42, spread: 0, visible: true, blendMode: 'NORMAL' }];
  neonDot(f, 34, 113, 9);
  label(f, '电话沟通', 54, 109, 11, C.muted, 'medium');
  label(f, '华东智造科技', 34, 142, 23, C.ink, 'medium');
  label(f, '今天 14:20 · 王磊 · 张伟记录', 34, 177, 11, C.muted);
  rule(f, 34, 206, 322, '#B7CADA');
  label(f, '沟通摘要', 34, 225, 10, C.muted);
  label(f, '客户认可初步方案，希望下周补充\n实施周期和正式报价。', 34, 248, 16, C.ink, 'regular', 314);
  label(f, '关键结论', 20, 336, 16, C.ink, 'medium');
  glassBox(f, 'Conclusion glass', 20, 362, 350, 92, 0.56, 18, 26);
  ellipse(f, 'Conclusion marker', 34, 370, 20, C.neon);
  label(f, '✓', 34, 373, 11, C.ink, 'bold', 20, 'CENTER');
  label(f, '方案方向获得认可', 66, 368, 14, C.ink, 'medium');
  label(f, '报价需包含实施周期与交付边界', 66, 398, 12, C.muted, 'regular', 278);
  label(f, '客户态度', 20, 478, 16, C.ink, 'medium');
  glassBox(f, 'Attitude glass', 20, 504, 350, 54, 0.56, 18, 26);
  smallTag(f, '积极', 34, 519, C.green);
  label(f, '决策意愿较强，关注交付确定性', 94, 522, 12, C.muted);
  label(f, '下一步行动', 20, 582, 16, C.ink, 'medium');
  glassBox(f, 'Next action glass', 20, 608, 350, 96, 0.62, 20, 28);
  box(f, 'Neon action line', 20, 608, 4, 96, C.neon, 2);
  label(f, '8月25日前', 38, 624, 10, C.muted, 'medium');
  label(f, '发送实施周期与正式报价', 38, 649, 15, C.ink, 'medium');
  avatar(f, '张', 320, 644, '#E3E6E9', 32);
  label(f, '负责人：张伟', 38, 680, 10, C.muted, 'medium');
  glassBox(f, 'Secondary action glass', 20, 724, 110, 44, 0.7, 16, 20);
  label(f, '编辑', 20, 736, 13, C.ink, 'medium', 110, 'CENTER');
  box(f, 'Primary action', 140, 724, 230, 44, C.action, 16);
  neonDot(f, 164, 741, 9);
  label(f, '继续记录', 140, 737, 13, C.white, 'medium', 230, 'CENTER');
  return f;
}

async function chooseFonts() {
  const fonts = await figma.listAvailableFontsAsync();
  const names = new Set(fonts.map(item => `${item.fontName.family}/${item.fontName.style}`));
  if (!names.has('PingFang SC/Regular')) FONT_REGULAR = { family: 'Arial', style: 'Regular' };
  if (!names.has('PingFang SC/Medium')) FONT_MEDIUM = names.has('PingFang SC/Regular') ? FONT_REGULAR : { family: 'Arial', style: 'Regular' };
  if (!names.has('PingFang SC/Semibold')) FONT_BOLD = names.has('PingFang SC/Medium') ? FONT_MEDIUM : { family: 'Arial', style: 'Bold' };
  await Promise.all([
    figma.loadFontAsync(FONT_REGULAR),
    figma.loadFontAsync(FONT_MEDIUM),
    figma.loadFontAsync(FONT_BOLD)
  ]);
}

async function linkPrototype(source, destination) {
  if (!source || !destination || typeof source.setReactionsAsync !== 'function') return;
  await source.setReactionsAsync([{
    trigger: { type: 'ON_CLICK' },
    actions: [{
      type: 'NODE',
      destinationId: destination.id,
      navigation: 'NAVIGATE',
      transition: {
        type: 'SMART_ANIMATE',
        easing: { type: 'GENTLE' },
        duration: 0.45
      },
      preserveScrollPosition: false
    }]
  }]);
}

async function main() {
  await chooseFonts();
  const page = figma.createPage();
  page.name = 'ZT CRM Mobile V5';
  await figma.setCurrentPageAsync(page);
  page.backgrounds = solid(C.canvas);

  label(page, 'ZT CRM · 客户与沟通记录 V5', 0, -96, 28, C.ink, 'bold');
  label(page, 'CRM workbench · facts first · 390 × 844', 0, -52, 14, C.muted);

  const frames = [
    buildWorkbench(page),
    buildCustomers(page),
    buildCustomerDetail(page),
    buildQuickInput(page),
    buildConfirm(page),
    buildRecords(page),
    buildRecordDetail(page)
  ];

  await Promise.all([
    linkPrototype(frames[0].findOne(node => node.name === 'Workbench item/电话记录待确认'), frames[4]),
    linkPrototype(frames[1].findOne(node => node.name === 'Customer node/华东智造'), frames[2]),
    linkPrototype(frames[2].findOne(node => node.name === 'Primary action'), frames[3]),
    linkPrototype(frames[3].findOne(node => node.name === 'Primary action'), frames[4]),
    linkPrototype(frames[4].findOne(node => node.name === 'Primary action'), frames[5]),
    linkPrototype(frames[5].findOne(node => node.name === 'Record node/华东智造科技'), frames[6])
  ]);

  figma.currentPage.selection = frames;
  figma.viewport.scrollAndZoomIntoView(frames);
  figma.closePlugin('已生成 ZT CRM Mobile V5：工作台与客户沟通事实底座');
}

main().catch(error => {
  figma.closePlugin(`生成失败：${error.message}`);
});
