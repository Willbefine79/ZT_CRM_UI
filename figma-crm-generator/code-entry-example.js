const C = {
  surface: '#E6EFF8',
  surfaceDeep: '#D6E5F2',
  white: '#FFFFFF',
  ink: '#1A2733',
  muted: '#6D7D8B',
  line: '#C5D3DF',
  panel: '#D4E3F0',
  action: '#6986A3',
  neon: '#C4FF62',
  amber: '#F2AB45'
};

let regular = { family: 'PingFang SC', style: 'Regular' };
let medium = { family: 'PingFang SC', style: 'Medium' };
let semibold = { family: 'PingFang SC', style: 'Semibold' };

function rgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16) / 255,
    g: parseInt(v.slice(2, 4), 16) / 255,
    b: parseInt(v.slice(4, 6), 16) / 255
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
      { position: 0, color: { ...rgb('#F3F8FC'), a: 1 } },
      { position: 0.55, color: { ...rgb(C.surface), a: 1 } },
      { position: 1, color: { ...rgb(C.surfaceDeep), a: 1 } }
    ]
  }];
}

function rect(parent, name, x, y, w, h, fill, radius = 12, stroke = null) {
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

function glass(parent, name, x, y, w, h, opacity = 0.62, radius = 20) {
  const node = rect(parent, name, x, y, w, h, C.white, radius, C.white);
  node.opacity = opacity;
  node.effects = [
    { type: 'BACKGROUND_BLUR', radius: 26, visible: true },
    {
      type: 'DROP_SHADOW',
      color: { r: 0.1, g: 0.18, b: 0.26, a: 0.07 },
      offset: { x: 0, y: 16 },
      radius: 38,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL'
    }
  ];
  return node;
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

function text(parent, value, x, y, size = 13, color = C.ink, weight = 'regular', width = null, align = 'LEFT') {
  const node = figma.createText();
  node.name = value.slice(0, 24);
  node.fontName = weight === 'semibold' ? semibold : weight === 'medium' ? medium : regular;
  node.characters = value;
  node.fontSize = size;
  node.fills = solid(color);
  node.x = x;
  node.y = y;
  node.textAlignHorizontal = align;
  node.textAutoResize = width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  if (width) node.resize(width, Math.max(node.height, size * 1.5));
  parent.appendChild(node);
  return node;
}

function divider(parent, x, y, w) {
  rect(parent, 'Divider', x, y, w, 1, C.line, 0);
}

function fieldLabel(parent, value, x, y, required = false) {
  text(parent, value, x, y, 10, C.muted, 'medium');
  if (required) text(parent, '*', x + value.length * 11 + 3, y - 1, 11, C.amber, 'medium');
}

function avatar(parent, value, x, y, fill) {
  ellipse(parent, `Avatar/${value}`, x, y, 28, fill);
  text(parent, value, x, y + 7, 10, C.ink, 'medium', 28, 'CENTER');
}

function chip(parent, value, x, y, selected = false, width = null) {
  const w = width || Math.max(52, value.length * 13 + 24);
  rect(parent, `Chip/${value}`, x, y, w, 30, selected ? C.action : C.white, 15, selected ? null : C.line);
  text(parent, value, x, y + 8, 11, selected ? C.white : C.ink, 'medium', w, 'CENTER');
  return w;
}

function input(parent, name, value, x, y, w, h = 42, multiline = false) {
  rect(parent, `Input/${name}`, x, y, w, h, '#F8FBFD', 12, '#D1DEE8');
  text(parent, value, x + 13, y + (multiline ? 12 : 12), 12, value.startsWith('请输入') ? '#98A7B4' : C.ink, 'regular', w - 26);
}

function notchedPanel(parent, name, x, y, w, h) {
  glass(parent, name, x, y, w, h, 0.68, 22);
  ellipse(parent, `${name}/left notch`, x - 7, y + h / 2 - 8, 16, C.surface);
  ellipse(parent, `${name}/right notch`, x + w - 9, y + h / 2 - 8, 16, C.surface);
  ellipse(parent, `${name}/left node`, x - 1, y + h / 2 - 2, 5, '#91AFC8');
  ellipse(parent, `${name}/right node`, x + w - 4, y + h / 2 - 2, 5, '#91AFC8');
}

async function loadFonts() {
  const fonts = await figma.listAvailableFontsAsync();
  const names = new Set(fonts.map(item => `${item.fontName.family}/${item.fontName.style}`));
  if (!names.has('PingFang SC/Regular')) regular = { family: 'Arial', style: 'Regular' };
  if (!names.has('PingFang SC/Medium')) medium = regular;
  if (!names.has('PingFang SC/Semibold')) semibold = names.has('Arial/Bold') ? { family: 'Arial', style: 'Bold' } : medium;
  await Promise.all([figma.loadFontAsync(regular), figma.loadFontAsync(medium), figma.loadFontAsync(semibold)]);
}

function referenceFrame() {
  return figma.currentPage.selection.find(node => node.type === 'FRAME') || null;
}

async function main() {
  await loadFonts();
  const reference = referenceFrame();
  const width = reference ? Math.round(reference.width) : 390;
  const height = reference ? Math.round(reference.height) : 844;
  const screenWidth = Math.max(375, Math.min(width, 430));
  const screenHeight = Math.max(760, Math.min(height, 932));
  const margin = 20;

  const frame = figma.createFrame();
  frame.name = '新增沟通记录 · 示例';
  frame.resize(screenWidth, screenHeight);
  frame.cornerRadius = 20;
  frame.clipsContent = true;
  frame.fills = iceGradient();
  frame.strokes = solid('#BFCFDC');
  frame.strokeWeight = 1;
  frame.x = reference ? reference.x + reference.width + 72 : Math.max(0, ...figma.currentPage.children.map(node => node.x + node.width)) + 72;
  frame.y = reference ? reference.y : 0;

  text(frame, '9:41', 20, 14, 12, C.ink, 'medium');
  text(frame, '●●●  5G  ▰', screenWidth - 104, 14, 10, C.ink, 'medium');
  text(frame, '‹', 18, 45, 30, C.ink);
  text(frame, '新增沟通记录', 52, 53, 23, C.ink, 'semibold');
  ellipse(frame, 'More', screenWidth - 56, 45, 36, C.white, C.line);
  text(frame, '···', screenWidth - 56, 54, 14, C.ink, 'medium', 36, 'CENTER');

  rect(frame, 'Mode rail', margin, 92, screenWidth - margin * 2, 40, '#D8E5EF', 14);
  rect(frame, 'Mode active', margin + 4, 96, (screenWidth - margin * 2 - 8) / 2, 32, C.white, 11);
  text(frame, '手工录入', margin + 4, 105, 12, C.ink, 'medium', (screenWidth - margin * 2 - 8) / 2, 'CENTER');
  text(frame, 'AI 整理材料', screenWidth / 2, 105, 12, C.muted, 'medium', (screenWidth - margin * 2 - 8) / 2, 'CENTER');

  notchedPanel(frame, 'Association panel', margin, 150, screenWidth - margin * 2, 114);
  fieldLabel(frame, '关联客户', 36, 165, true);
  avatar(frame, '华', 36, 190, '#E7F1F8');
  text(frame, '华东智造科技', 76, 190, 14, C.ink, 'medium');
  text(frame, '王磊 · 采购总监', 76, 213, 10, C.muted);
  text(frame, '更换  ›', screenWidth - 90, 199, 10, C.action, 'medium');
  divider(frame, 36, 232, screenWidth - 72);
  fieldLabel(frame, '业务线', 36, 242);
  chip(frame, '制造业务', 92, 236, true, 78);
  chip(frame, '数字化服务', 178, 236, false, 88);

  glass(frame, 'Communication form', margin, 282, screenWidth - margin * 2, 350, 0.6, 22);
  fieldLabel(frame, '沟通时间', 36, 298, true);
  fieldLabel(frame, '渠道', screenWidth / 2 + 8, 298, true);
  input(frame, 'time', '8月21日 14:20', 36, 316, 148);
  input(frame, 'channel', '电话  ⌄', screenWidth / 2 + 8, 316, screenWidth / 2 - 44);

  fieldLabel(frame, '双方参与人', 36, 370, true);
  avatar(frame, '张', 36, 392, '#DCE9F5');
  avatar(frame, '李', 68, 392, '#E7F1F8');
  text(frame, '我方 2 人', 104, 399, 10, C.muted);
  avatar(frame, '王', 184, 392, '#E8F4DF');
  avatar(frame, '+', 216, 392, C.white);
  text(frame, '客户方 1 人', 252, 399, 10, C.muted);

  fieldLabel(frame, '主题', 36, 438, true);
  input(frame, 'subject', '实施周期与报价方案沟通', 36, 456, screenWidth - 72);

  fieldLabel(frame, '沟通内容', 36, 508, true);
  input(frame, 'content', '客户认可初步方案，希望补充实施周期、\n交付边界和正式报价。', 36, 526, screenWidth - 72, 72, true);

  fieldLabel(frame, '结论 / 后续推进', 36, 608);
  input(frame, 'conclusion', '双方确认下周继续沟通具体实施安排。', 36, 626, screenWidth - 72, 54, true);

  notchedPanel(frame, 'Attachment row', margin, 698, screenWidth - margin * 2, 52);
  ellipse(frame, 'Attachment icon', 34, 708, 32, '#E5EEF5');
  text(frame, '+', 34, 713, 17, C.action, 'medium', 32, 'CENTER');
  text(frame, '添加附件', 78, 710, 12, C.ink, 'medium');
  text(frame, 'PDF / 图片 / 文档，最多 10 个', 78, 730, 9, C.muted);
  text(frame, '›', screenWidth - 50, 713, 20, C.muted);

  const actionY = screenHeight - 72;
  glass(frame, 'Save draft', margin, actionY, 108, 48, 0.74, 16);
  text(frame, '保存草稿', margin, actionY + 15, 13, C.ink, 'medium', 108, 'CENTER');
  rect(frame, 'Save formal record', 138, actionY, screenWidth - 158, 48, C.action, 16);
  ellipse(frame, 'Formal status point', screenWidth - 184, actionY + 18, 10, C.neon);
  text(frame, '保存正式记录', 138, actionY + 15, 13, C.white, 'medium', screenWidth - 158, 'CENTER');

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
  figma.closePlugin('已在 V3 参考画板右侧添加“新增沟通记录”示例页');
}

main().catch(error => figma.closePlugin(`生成失败：${error.message}`));
