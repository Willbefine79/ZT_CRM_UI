"use strict";

const STORAGE_KEY = "zt-crm-review-notes-v1";
const REVIEW_KEY = "zt-crm-review-status-v1";

const screens = [
  {
    id: "workbench", group: "总览", nav: "工作台", title: "事实工作台",
    refs: ["FR-13", "§7 信息架构", "UJ-1 / UJ-3"],
    objective: "聚合需要用户处理的系统状态，不包装成销售任务或经营驾驶舱。",
    reviews: ["待确认草稿、待处理查重和处理失败直接融合在待处理列表。", "待处理项按系统状态与更新时间排序，每项回到事实流程。", "最近客户、最近正式沟通和三个全局新增入口可达。"],
    decisions: ["不显示销售额、漏斗、评分、优先级或逾期。", "资料待补充只列缺失的客观字段，不显示百分比。"]
  },
  {
    id: "customers", group: "客户", nav: "客户列表", title: "客户列表",
    refs: ["FR-7", "FR-3 停用与恢复"],
    objective: "让用户在权限范围内搜索、筛选并打开启用客户。",
    reviews: ["搜索覆盖企业全称、简称和联系人姓名。", "筛选覆盖行业、业务线、合作关系和客户来源。", "卡片只显示客观资料、业务线关系和最近正式沟通。"],
    decisions: ["默认隐藏停用客户；治理入口可授权查看。", "列表不显示等级、价值、风险、态度或下一步。"]
  },
  {
    id: "dedupe", group: "客户", nav: "客户查重", title: "新增客户 · 查重",
    refs: ["FR-3 客户查重与新建", "UJ-1"],
    objective: "在进入客户表单前完成租户内查重，并让用户明确选择已有客户或继续新增。",
    reviews: ["查询覆盖查询中、无匹配、候选和失败状态。", "候选展示名称、代码后四位、行业、主地址与公开联系方式。", "名称近似候选继续新增时需要权限和 10–500 字理由。"],
    decisions: ["统一社会信用代码完全相同为强阻断。", "保存前仍需服务端二次查重和并发冲突处理。"]
  },
  {
    id: "customer-form", group: "客户", nav: "客户表单", title: "新增 / 编辑客户",
    refs: ["FR-3 至 FR-6", "字段契约 §3"],
    objective: "以企业全称为唯一用户必填业务字段，其他客观资料按组渐进展开。",
    reviews: ["首屏只展开基础信息，其余字段折叠。", "行业、地址、联系人、业务线关系与内部负责人使用可重复子对象。", "未知值保持为空，不用 0、否或默认枚举代替。"],
    decisions: ["不接入工商自动补全或自助批量导入。", "联系人不提供决策人、财务联系人等销售角色。"]
  },
  {
    id: "customer-detail", group: "客户", nav: "客户详情", title: "客户详情",
    refs: ["FR-7", "FR-4 至 FR-6"],
    objective: "在同一客户上下文中查看资料、从属结构与正式沟通时间线。",
    reviews: ["资料、联系人、地址、业务线和沟通记录可切换。", "停用客户仍保留历史，但详情转为只读。", "新增联系人和新增沟通从当前客户上下文进入。"],
    decisions: ["沟通时间来自正式且启用记录。", "业务线关系状态只允许潜在、跟进中、已成交、已流失。"]
  },
  {
    id: "manual-record", group: "沟通", nav: "手工沟通", title: "新增沟通记录",
    refs: ["FR-8", "字段契约 §4.1", "UJ-2"],
    objective: "在 AI 完全不可用时，独立保存沟通草稿或正式事实。",
    reviews: ["正式必填客户、实际时间、渠道和正文。", "我方与客户方参与人分别选择，均可为空和多选。", "可选字段与附件折叠，保存操作在小屏仍可达。"],
    decisions: ["结论只记录本次共识，不创建任务、提醒或日程。", "正式保存使用幂等键；CLEAN 附件才可提交。"]
  },
  {
    id: "records", group: "沟通", nav: "沟通记录列表", title: "沟通记录",
    refs: ["FR-9", "FR-7 最近沟通"],
    objective: "默认按实际沟通时间倒序浏览正式且启用的沟通事实。",
    reviews: ["筛选支持客户、业务线、时间区间、创建人和生命周期。", "草稿使用独立入口，不混入默认正式列表。", "停用记录默认隐藏，授权后从治理视图查询。"],
    decisions: ["排序使用 occurred_at 与 id 的稳定游标。", "列表不出现后续任务、负责人或逾期语义。"]
  },
  {
    id: "record-detail", group: "沟通", nav: "沟通详情", title: "沟通记录详情",
    refs: ["FR-9", "FR-8 参与人快照"],
    objective: "展示一条正式沟通的完整事实、附件、审计和版本。",
    reviews: ["双方参与人以结构化引用和历史姓名快照分区显示。", "版本历史可展开，旧版本不可变。", "补充材料走差异确认；停用必须填写原因。"],
    decisions: ["已停用引用可只读保留，但修改时只能选启用值。", "正式记录不保存草稿状态。"]
  },
  {
    id: "ai-material", group: "AI 录入", nav: "AI 材料输入", title: "AI 整理材料",
    refs: ["FR-10", "UJ-3"],
    objective: "先持久化原始文本、音频或会议纪要，再启动异步处理。",
    reviews: ["输入支持文本、音频、AI 听记文本和会议纪要文件。", "明确材料只用于生成未确认草稿。", "页面离开后材料与处理任务仍可恢复。"],
    decisions: ["不做实时录音、拍照 OCR 或外部企业补全。", "材料保留与录音告知未批准前只使用脱敏试点数据。"]
  },
  {
    id: "ai-processing", group: "AI 录入", nav: "处理与客户匹配", title: "材料处理",
    refs: ["FR-10 异步处理", "FR-11 客户候选"],
    objective: "透明展示异步阶段、失败恢复和客户不唯一时的人工选择。",
    reviews: ["原始材料、扫描、转写、抽取状态彼此清楚。", "失败保留材料，可重试或转手工录入。", "客户不唯一时停在 NEEDS_CUSTOMER，人工选择后才生成可审核草稿。"],
    decisions: ["AI Job 状态不等于草稿状态。", "0 个候选要求搜索或新建；1 个高置信候选仍可修改。"]
  },
  {
    id: "ai-review", group: "AI 录入", nav: "AI 草稿审核", title: "未确认草稿",
    refs: ["FR-11 结构化草稿", "FR-12 草稿确认"],
    objective: "逐字段审核 AI 候选、证据和来源，明确确认后才创建正式记录。",
    reviews: ["草稿显著标记为未确认，不进入正式列表或统计。", "AI 值显示材料定位、提取方式和置信提示。", "确认按钮文案必须是“确认正式记录”。"],
    decisions: ["置信度仅供审核，不自动确认。", "失败、取消或处理中状态一律不能确认。"]
  },
  {
    id: "version-diff", group: "AI 录入", nav: "补充记录差异", title: "补充已有记录",
    refs: ["FR-12 补充已有记录", "UJ-4"],
    objective: "让用户逐字段接受或拒绝新材料建议，并创建正式记录新版本。",
    reviews: ["处理前或确认前明确选择补充已有记录。", "当前正式值与建议值并排展示，每个字段独立接受。", "版本冲突时要求刷新并重新生成差异。"],
    decisions: ["默认不覆盖已有记录。", "确认后创建新版本，旧版本与来源材料不可变。"]
  },
  {
    id: "governance", group: "治理", nav: "停用与恢复", title: "停用数据治理",
    refs: ["UJ-5", "FR-3 / FR-9", "FR-14"],
    objective: "让授权管理员查看停用原因、历史引用并执行恢复。",
    reviews: ["客户与沟通的停用状态分别治理。", "停用客户的联系人、关系、沟通和附件不级联删除。", "恢复不自动恢复已独立停用的子对象。"],
    decisions: ["无物理删除入口。", "恢复与停用都进入审计。"]
  },
  {
    id: "profile", group: "治理", nav: "我的", title: "我的",
    refs: ["§7 信息架构", "FR-14 权限"],
    objective: "提供克制的个人与租户上下文、私人草稿入口和退出登录。",
    reviews: ["显示当前租户、用户、角色和组织范围。", "私人草稿入口与正式沟通列表分离。", "不建设复杂个人配置或管理驾驶舱。"],
    decisions: ["销售管理者默认不能看他人私人草稿。", "退出登录是唯一会话操作。"]
  }
];

const screenById = Object.fromEntries(screens.map((screen) => [screen.id, screen]));

const initialState = () => ({
  activeScreen: "workbench",
  filtersOpen: false,
  customerTab: "facts",
  dedupeStage: "idle",
  dedupeName: "华东智造",
  dedupeUscc: "",
  dedupeRequestId: 0,
  dedupeOverrideOpen: false,
  dedupeOverrideApproved: false,
  canOverrideDuplicates: true,
  dedupeError: "",
  customerName: "远见数字供应链有限公司",
  customerFormError: "",
  customerSaveConflict: false,
  contactRows: 1,
  addressRows: 1,
  ownerRows: 1,
  materialMode: "text",
  materialText: "8月21日下午与华东智造王磊电话沟通。客户认可初步方案，希望补充实施周期、交付边界和正式报价，约定下周继续沟通。",
  materialFile: "",
  materialIntent: "new",
  materialError: "",
  processState: "processing",
  aiDraftStatus: "editing",
  aiError: "",
  aiDraft: {
    customer: "华东智造科技",
    time: "2026-08-21 14:20",
    channel: "电话",
    subject: "实施周期与报价方案沟通",
    content: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。"
  },
  evidenceOpen: {},
  governanceType: "customer",
  governanceMode: "list",
  governanceReason: "",
  restored: {},
  diffAccepted: { subject: true, content: true, conclusion: false },
  versionConflict: false,
  recordContent: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
  manualTime: "2026-08-21 14:20",
  manualChannel: "",
  manualSubject: "实施周期与报价方案沟通",
  manualErrors: {},
  attachmentAdded: false,
  recordSnapshot: {
    customer: "华东智造科技",
    time: "2026-08-21 14:20",
    channel: "电话",
    subject: "实施周期与报价方案沟通",
    content: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。"
  },
  toast: ""
});

let state = initialState();
let notes = readStorage(STORAGE_KEY, {}, (value) => isPlainMap(value) && Object.values(value).every((item) => typeof item === "string"));
let reviewStatus = readStorage(REVIEW_KEY, {}, (value) => isPlainMap(value) && Object.values(value).every((item) => typeof item === "boolean"));
let noteTimer = null;
let toastTimer = null;

const els = {
  screenNav: document.querySelector("#screenNav"),
  stageTitle: document.querySelector("#stageTitle"),
  phoneShell: document.querySelector("#phoneShell"),
  phoneScreen: document.querySelector("#phoneScreen"),
  reviewTitle: document.querySelector("#reviewTitle"),
  reviewContent: document.querySelector("#reviewContent"),
  reviewNotes: document.querySelector("#reviewNotes"),
  reviewDone: document.querySelector("#reviewDone"),
  saveState: document.querySelector("#saveState"),
  commentCount: document.querySelector("#commentCount"),
  reviewProgress: document.querySelector("#reviewProgress"),
  deviceSize: document.querySelector("#deviceSize")
};

function isPlainMap(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStorage(key, fallback, validator = isPlainMap) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return validator(parsed) ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);
}

function renderNav() {
  let previousGroup = "";
  els.screenNav.innerHTML = screens.map((screen, index) => {
    const group = screen.group !== previousGroup ? `<div class="nav-group">${escapeHtml(screen.group)}</div>` : "";
    previousGroup = screen.group;
    return `${group}<button class="screen-link ${screen.id === state.activeScreen ? "active" : ""}" type="button" data-screen="${screen.id}">
      <span class="screen-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="screen-name">${escapeHtml(screen.nav)}</span>
      <span class="review-dot ${reviewStatus[screen.id] ? "done" : ""}" aria-hidden="true"></span>
    </button>`;
  }).join("");
  const done = screens.filter((screen) => reviewStatus[screen.id]).length;
  els.reviewProgress.textContent = `${done} / ${screens.length} 已评审`;
}

function renderReview() {
  const screen = screenById[state.activeScreen];
  els.stageTitle.textContent = screen.nav;
  els.reviewTitle.textContent = screen.title;
  els.reviewDone.checked = Boolean(reviewStatus[screen.id]);
  els.reviewContent.innerHTML = `
    <section class="review-block">
      <h2>评审目标</h2>
      <p>${escapeHtml(screen.objective)}</p>
    </section>
    <section class="review-block">
      <h2>PRD 对照</h2>
      <div class="reference-tags">${screen.refs.map((ref) => `<span class="reference-tag">${escapeHtml(ref)}</span>`).join("")}</div>
    </section>
    <section class="review-block">
      <h2>需要确认</h2>
      <ul class="review-list">${screen.reviews.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    <details class="review-details" open>
      <summary>关键边界与决定</summary>
      <div class="details-body"><ul class="review-list">${screen.decisions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </details>
    <details class="review-details">
      <summary>视觉参考</summary>
      <div class="details-body"><img class="reference-image" src="assets/entry-example-preview.jpg" alt="现有 ZT CRM 手机端视觉参考"></div>
    </details>`;
  const currentNote = notes[screen.id] || "";
  els.reviewNotes.value = currentNote;
  els.commentCount.textContent = `${currentNote.length} 字`;
  els.saveState.textContent = currentNote ? "已从本地载入" : "尚未填写";
}

function bottomNav(active) {
  const items = [
    ["workbench", "工作台", "workbench"],
    ["customers", "客户", "customers"],
    ["records", "沟通记录", "records"],
    ["profile", "我的", "profile"]
  ];
  return `<nav class="mobile-bottom-nav" aria-label="手机底部导航">${items.map(([id, label, key]) => `
    <button class="bottom-nav-button ${active === key ? "active" : ""}" type="button" data-screen="${id}">${label}</button>`).join("")}</nav>`;
}

function mobileFrame({ title, subtitle = "", body, back = "", action = "", nav = "", sticky = "" }) {
  return `<div class="mobile-app">
    <div class="mobile-status"><span>9:41</span><span class="signal">●●● 5G ▰</span></div>
    <header class="mobile-header">
      ${back ? `<button class="mobile-icon-button" type="button" data-screen="${back}" title="返回" aria-label="返回">‹</button>` : ""}
      <div class="mobile-header-copy"><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>
      ${action}
    </header>
    <div class="mobile-scroll">${body}${sticky}</div>
    ${nav ? bottomNav(nav) : ""}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
  </div>`;
}

function workbenchScreen() {
  return mobileFrame({
    title: "工作台", subtitle: "海天科技 · 张雨", nav: "workbench",
    action: `<button class="mobile-icon-button" type="button" data-action="open-global-add" title="新增" aria-label="打开新增菜单">+</button>`,
    body: `<div class="mobile-greeting"><strong>下午好，张雨</strong><span>按系统状态处理 CRM 事实</span></div>
      <div class="section-heading"><h3>待处理</h3><span>按更新时间</span></div>
      <div class="list-panel">
        <button class="system-item" type="button" data-screen="ai-review"><span class="item-dot"></span><span class="system-copy"><strong>电话记录待确认</strong><span>华东智造科技 · 10 分钟前</span></span><span class="item-action">审核 ›</span></button>
        <button class="system-item" type="button" data-screen="dedupe"><span class="item-dot warning"></span><span class="system-copy"><strong>客户名称存在近似候选</strong><span>华东智造 · 32 分钟前</span></span><span class="item-action">处理 ›</span></button>
        <button class="system-item" type="button" data-screen="ai-processing"><span class="item-dot danger"></span><span class="system-copy"><strong>会议纪要处理失败</strong><span>扫描通过，结构化抽取失败</span></span><span class="item-action">重试 ›</span></button>
        <button class="system-item" type="button" data-screen="customer-detail"><span class="item-dot success"></span><span class="system-copy"><strong>客户资料待补充</strong><span>缺少主地址、公开电话</span></span><span class="item-action">补充 ›</span></button>
      </div>
      <div class="section-heading"><h3>快速新增</h3><span>仅事实对象</span></div>
      <div class="quick-grid">
        <button class="quick-action" type="button" data-screen="dedupe"><span>+</span>新增客户</button>
        <button class="quick-action" type="button" data-screen="manual-record"><span>+</span>新增沟通</button>
        <button class="quick-action" type="button" data-screen="ai-material"><span>+</span>AI 整理</button>
      </div>
      <div class="section-heading"><h3>最近事实</h3><span>正式数据</span></div>
      <div class="list-panel">
        <button class="system-item" type="button" data-screen="customer-detail"><span class="item-dot success"></span><span class="system-copy"><strong>华东智造科技</strong><span>上海 · 制造业务跟进中</span></span><span class="item-action">客户 ›</span></button>
        <button class="system-item" type="button" data-screen="record-detail"><span class="item-dot"></span><span class="system-copy"><strong>实施周期与报价方案沟通</strong><span>电话 · 8 月 21 日 14:20</span></span><span class="item-action">记录 ›</span></button>
      </div>`
  });
}

function customersScreen() {
  return mobileFrame({
    title: "客户", subtitle: "默认仅显示启用客户", nav: "customers",
    action: `<button class="mobile-icon-button" type="button" data-screen="dedupe" title="新增客户" aria-label="新增客户">+</button>`,
    body: `<div class="search-row"><input class="search-box" type="search" placeholder="搜索客户、简称或联系人" aria-label="搜索客户"><button class="icon-button" type="button" data-action="toggle-filters" title="筛选" aria-label="展开筛选">≡</button></div>
      ${state.filtersOpen ? `<div class="filter-panel"><strong style="font-size:10px">筛选</strong><div class="filter-row"><button class="chip active" type="button">制造业</button><button class="chip" type="button">数字化服务</button><button class="chip" type="button">跟进中</button><button class="chip" type="button">客户转介绍</button></div></div>` : ""}
      <div class="section-heading"><h3>客户列表</h3><span>更新倒序</span></div>
      <div class="list-panel">
        ${customerRow("华", "华东智造科技", "王磊 · 采购总监", "上海 · 制造业务 / 跟进中", "2 天前", "customer-detail")}
        ${customerRow("远", "远见数字供应链", "陈嘉 · 运营经理", "杭州 · 数字化服务 / 潜在", "5 天前", "customer-detail")}
        ${customerRow("新", "新港工业设备", "暂无联系人", "苏州 · 制造业务 / 已成交", "8 天前", "customer-detail")}
        ${customerRow("澄", "澄海精密制造", "赵敏 · 行政经理", "宁波 · 制造业务 / 已流失", "21 天前", "customer-detail")}
      </div>
      <button class="secondary-button full-button" type="button" data-screen="governance">查看停用数据治理</button>`
  });
}

function customerRow(initial, name, contact, meta, recent, screen) {
  return `<button class="customer-card" type="button" data-screen="${screen}"><span class="avatar">${initial}</span><span class="customer-copy"><strong>${name}</strong><span>${contact}<br>${meta}</span></span><span class="customer-meta"><span class="status-chip formal">启用</span><small>${recent}沟通</small></span></button>`;
}

function dedupeScreen() {
  let result = "";
  if (state.dedupeStage === "checking") {
    result = `<div class="glass-panel"><div class="process-step active"><span class="step-node">…</span><span><strong>正在当前租户内查重</strong><span>名称规范化与近似匹配</span></span><small>查询中</small></div></div>`;
  } else if (state.dedupeStage === "candidate") {
    result = `<div class="notice warning">发现 2 个名称近似候选。请先判断是否为同一企业。</div>
      <div class="list-panel">
        <button class="customer-card" type="button" data-screen="customer-detail"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span>信用代码尾号 7281<br>智能制造 · 上海浦东 · 021-5588****</span></span><span class="item-action">已有 ›</span></button>
        <button class="customer-card" type="button" data-screen="customer-detail"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造装备（苏州）</strong><span>信用代码尾号 1946<br>工业设备 · 苏州园区</span></span><span class="item-action">已有 ›</span></button>
      </div>
      ${state.dedupeOverrideOpen ? `<div class="glass-panel"><label class="field"><span>继续新增理由 <em>*</em></span><textarea id="overrideReason" maxlength="500" placeholder="请填写 10–500 字理由">业务主体不同，拟新增的是独立签约公司。</textarea></label>${state.dedupeError ? `<span class="field-error">${escapeHtml(state.dedupeError)}</span>` : ""}<button class="primary-button full-button" type="button" data-action="confirm-override">确认理由并进入表单</button></div>` : `<div class="button-row"><button class="secondary-button" type="button" data-screen="customers">取消</button><button class="primary-button" type="button" data-action="continue-new">仍要新增</button></div>`}`;
  } else if (state.dedupeStage === "strong") {
    result = `<div class="notice danger">统一社会信用代码完全相同，已阻止新建。该强重复不能填写理由绕过。</div><div class="list-panel"><button class="customer-card" type="button" data-screen="customer-detail"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span>信用代码尾号 XQ7A<br>智能制造 · 上海浦东</span></span><span class="item-action">打开已有客户 ›</span></button></div><button class="secondary-button full-button" type="button" data-action="clear-strong-duplicate">修改查重条件</button>`;
  } else if (state.dedupeStage === "none") {
    result = `<div class="notice success">当前租户内未发现匹配客户，已完成查重。</div><button class="primary-button full-button" type="button" data-action="continue-new">进入客户表单</button>`;
  } else if (state.dedupeStage === "error") {
    result = `<div class="notice danger">查重服务暂时不可用，未进入客户表单。</div><button class="secondary-button full-button" type="button" data-action="run-dedupe">重新查询</button>`;
  }
  return mobileFrame({
    title: "新增客户", subtitle: "第一步 · 租户内查重", back: "customers",
    body: `<div class="glass-panel"><label class="field" style="margin-top:0"><span>企业全称或简称 <em>*</em></span><input id="dedupeName" type="text" maxlength="200" value="${escapeHtml(state.dedupeName)}" placeholder="输入 2–200 字"></label><label class="field"><span>统一社会信用代码（可选）</span><input id="dedupeUscc" type="text" maxlength="18" value="${escapeHtml(state.dedupeUscc)}" placeholder="18 位；完全相同将阻止新建"></label>${state.dedupeError && state.dedupeStage === "idle" ? `<span class="field-error">${escapeHtml(state.dedupeError)}</span>` : ""}<button class="primary-button full-button" type="button" data-action="run-dedupe" style="margin-top:10px">开始查重</button></div>${result}`
  });
}

function customerFormScreen() {
  return mobileFrame({
    title: "客户资料", subtitle: "企业全称为唯一必填业务字段", back: "dedupe",
    body: `${state.customerFormError ? `<div class="notice danger">${escapeHtml(state.customerFormError)}</div>` : ""}
      <details class="form-section" open><summary>基础信息 <span class="status-chip formal">1 项必填</span></summary><div class="form-body">
        <label class="field ${state.customerFormError ? "has-error" : ""}"><span>企业全称 <em>*</em></span><input id="customerName" maxlength="200" value="${escapeHtml(state.customerName)}"></label>
        <label class="field"><span>企业简称</span><input value="远见供应链"></label>
        <label class="field"><span>上级客户</span><select><option>不设置</option><option>海天科技集团</option></select></label>
      </div></details>
      <details class="form-section"><summary>客观资料</summary><div class="form-body"><div class="field-grid"><label class="field"><span>企业性质</span><select><option>未知</option><option>民营企业</option></select></label><label class="field"><span>员工人数</span><input type="number" placeholder="未知留空"></label></div><div class="field-grid"><label class="field"><span>营收区间</span><select><option>未知</option><option>1–5 亿元</option></select></label><label class="field"><span>是否上市</span><select><option>未知</option><option>是</option><option>否</option></select></label></div><label class="field"><span>客户来源</span><select><option>请选择</option><option>客户转介绍</option></select></label></div></details>
      <details class="form-section"><summary>工商与公开联系</summary><div class="form-body"><label class="field"><span>统一社会信用代码</span><input placeholder="18 位，未知留空"></label><label class="field"><span>企业邮箱</span><input type="email" placeholder="name@example.com"></label><label class="field"><span>官网</span><input type="url" placeholder="https://"></label></div></details>
      <details class="form-section"><summary>行业与地址 <span class="status-chip draft">${state.addressRows} 条地址</span></summary><div class="form-body"><label class="field"><span>行业</span><select><option>智能制造</option></select></label><label class="field"><span>主地址</span><input value="浙江省杭州市滨江区"></label>${state.addressRows > 1 ? `<label class="field"><span>其他地址</span><input value="江苏省苏州市工业园区"></label>` : ""}<button class="text-button" type="button" data-action="add-subobject" data-kind="address">+ 添加地址</button></div></details>
      <details class="form-section"><summary>联系人 <span class="status-chip draft">${state.contactRows} 位联系人</span></summary><div class="form-body"><label class="field"><span>姓名</span><input value="陈嘉"></label><div class="field-grid"><label class="field"><span>部门</span><input value="运营部"></label><label class="field"><span>职位</span><input value="运营经理"></label></div>${state.contactRows > 1 ? `<div class="notice success">已新增联系人行，姓名为空时不能保存。</div><label class="field"><span>联系人姓名 <em>*</em></span><input placeholder="联系人姓名"></label>` : ""}<button class="text-button" type="button" data-action="add-subobject" data-kind="contact">+ 添加联系人</button></div></details>
      <details class="form-section"><summary>业务线关系与内部归属</summary><div class="form-body"><div class="field-grid"><label class="field"><span>业务线</span><select><option>数字化服务</option></select></label><label class="field"><span>合作关系</span><select><option>潜在</option><option>跟进中</option></select></label></div><div class="notice">内部负责人按“业务线 + 人员 + 角色”逐条维护。当前 ${state.ownerRows} 条。</div><button class="text-button" type="button" data-action="add-subobject" data-kind="owner">+ 添加内部负责人</button></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="customers">取消</button><button class="primary-button" type="button" data-action="save-customer"><span class="confirm-dot"></span>保存客户</button></div></div>`
  });
}

function customerDetailScreen() {
  const tabs = [
    ["facts", "资料"], ["contacts", "联系人"], ["addresses", "地址"], ["lines", "业务线"], ["timeline", "沟通记录"]
  ];
  const content = {
    facts: `<div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>企业简称</dt><dd>${escapeHtml(state.customerName.replace(/有限公司$/, ""))}</dd></div><div class="fact-row"><dt>客户编码</dt><dd>C-20260821017</dd></div><div class="fact-row"><dt>主地址</dt><dd>上海市浦东新区张江路 88 号</dd></div><div class="fact-row"><dt>公开电话</dt><dd>021-5588 6721</dd></div><div class="fact-row"><dt>行业</dt><dd>智能制造 / 工业设备</dd></div></dl></div>`,
    contacts: `<div class="list-panel"><div class="customer-card"><span class="avatar">王</span><span class="customer-copy"><strong>王磊</strong><span>采购部 · 采购总监<br>138****6621 · wang***@example.com</span></span><span class="status-chip formal">启用</span></div><div class="customer-card"><span class="avatar">周</span><span class="customer-copy"><strong>周宁</strong><span>信息化部 · 项目经理<br>zhou***@example.com</span></span><span class="status-chip formal">启用</span></div></div><button class="secondary-button full-button" type="button" data-action="add-detail-subobject" data-kind="contact">新增联系人</button>`,
    addresses: `<div class="list-panel"><div class="system-item"><span class="item-dot success"></span><span class="system-copy"><strong>上海市浦东新区张江路 88 号</strong><span>主地址 · 中国 / 上海 / 上海市</span></span><span class="status-chip formal">主</span></div><div class="system-item"><span class="item-dot"></span><span class="system-copy"><strong>苏州市工业园区星海街 18 号</strong><span>中国 / 江苏 / 苏州市</span></span></div></div><button class="secondary-button full-button" type="button" data-action="add-detail-subobject" data-kind="address">新增地址</button>`,
    lines: `<div class="glass-panel"><div class="fact-row"><dt>制造业务</dt><dd><span class="status-chip draft">跟进中</span></dd></div><div class="fact-row"><dt>数字化服务</dt><dd><span class="status-chip formal">已成交</span></dd></div></div><div class="section-heading"><h3>内部负责人</h3><span>按业务线</span></div><div class="list-panel"><div class="system-item"><span class="avatar" style="width:30px;height:30px">张</span><span class="system-copy"><strong>张雨 · 客户经理</strong><span>制造业务 · 华东销售部 · 60%</span></span></div><div class="system-item"><span class="avatar" style="width:30px;height:30px">李</span><span class="system-copy"><strong>李程 · 解决方案顾问</strong><span>数字化服务 · 方案部</span></span></div></div>`,
    timeline: `<div class="glass-panel"><div class="timeline"><div class="timeline-item"><strong>实施周期与报价方案沟通</strong><span>8 月 21 日 14:20 · 电话 · 正式记录</span></div><div class="timeline-item"><strong>工厂现场需求访谈</strong><span>8 月 12 日 10:00 · 拜访 · 正式记录</span></div><div class="timeline-item"><strong>首次需求沟通</strong><span>7 月 28 日 16:30 · 线上会议 · 正式记录</span></div></div></div>`
  }[state.customerTab];
  return mobileFrame({
    title: "客户详情", subtitle: "事实资料与沟通历史", back: "customers",
    action: `<button class="mobile-icon-button small" type="button" data-action="open-customer-menu" title="更多操作" aria-label="客户更多操作">···</button>`,
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>上海 · 智能制造</span></span><span class="status-chip formal">启用</span></div><div class="button-row equal"><button class="secondary-button" type="button" data-screen="customer-form">编辑资料</button><button class="primary-button" type="button" data-screen="manual-record">+ 新增沟通</button></div></div>
      <div class="tab-row">${tabs.map(([id, label]) => `<button class="tab-button ${state.customerTab === id ? "active" : ""}" type="button" data-action="set-customer-tab" data-tab="${id}">${label}</button>`).join("")}</div>${content}`
  });
}

function manualRecordScreen() {
  return mobileFrame({
    title: "新增沟通记录", subtitle: "手工录入不依赖 AI", back: "records",
    body: `<div class="mobile-segmented"><button class="segment-button active" type="button">手工录入</button><button class="segment-button" type="button" data-screen="ai-material">AI 整理材料</button></div>
      ${Object.values(state.manualErrors).length ? `<div class="notice danger">请修正标记的正式必填字段。</div>` : ""}
      <div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>启用客户 · 可更换</span></span><button class="text-button" type="button" data-action="change-customer">更换 ›</button></div><div class="filter-row"><button class="chip active" type="button">制造业务</button><button class="chip" type="button">数字化服务</button></div></div>
      <div class="glass-panel"><div class="field-grid"><label class="field ${state.manualErrors.time ? "has-error" : ""}" style="margin-top:0"><span>沟通时间 <em>*</em></span><input id="manualTime" value="${escapeHtml(state.manualTime)}">${state.manualErrors.time ? `<small class="field-error">${escapeHtml(state.manualErrors.time)}</small>` : ""}</label><label class="field ${state.manualErrors.channel ? "has-error" : ""}" style="margin-top:0"><span>渠道 <em>*</em></span><select id="manualChannel"><option value="">请选择</option><option ${state.manualChannel === "电话" ? "selected" : ""}>电话</option><option ${state.manualChannel === "拜访" ? "selected" : ""}>拜访</option><option ${state.manualChannel === "线上会议" ? "selected" : ""}>线上会议</option></select>${state.manualErrors.channel ? `<small class="field-error">${escapeHtml(state.manualErrors.channel)}</small>` : ""}</label></div>
        <label class="field ${state.manualErrors.content ? "has-error" : ""}"><span>沟通正文 <em>*</em></span><textarea id="recordContent">${escapeHtml(state.recordContent)}</textarea>${state.manualErrors.content ? `<small class="field-error">${escapeHtml(state.manualErrors.content)}</small>` : ""}</label>
      </div>
      <details class="form-section"><summary>主题、时长与地点</summary><div class="form-body"><label class="field"><span>主题</span><input id="manualSubject" value="${escapeHtml(state.manualSubject)}"></label><div class="field-grid"><label class="field"><span>时长（分钟）</span><input type="number" value="35"></label><label class="field"><span>地点</span><input placeholder="未知留空"></label></div></div></details>
      <details class="form-section"><summary>双方参与人 <span>分侧记录</span></summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button><button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button><button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label></div></details>
      <details class="form-section"><summary>结论与附件</summary><div class="form-body"><label class="field"><span>结论 / 后续推进</span><textarea>双方确认下周继续沟通具体实施安排。</textarea></label><label class="upload-zone" for="manualAttachment"><input class="file-input" id="manualAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.attachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>单文件 50 MB，最多 10 个；正式提交前须扫描通过</span></span></label></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-manual-draft">保存草稿</button><button class="primary-button" type="button" data-action="save-manual-formal"><span class="confirm-dot"></span>保存正式记录</button></div></div>`
  });
}

function recordsScreen() {
  return mobileFrame({
    title: "沟通记录", subtitle: "正式且启用 · 时间倒序", nav: "records",
    action: `<button class="mobile-icon-button" type="button" data-screen="manual-record" title="新增沟通记录" aria-label="新增沟通记录">+</button>`,
    body: `<div class="search-row"><input class="search-box" type="search" placeholder="搜索客户或主题" aria-label="搜索沟通记录"><button class="icon-button" type="button" data-action="toggle-filters" title="筛选" aria-label="展开筛选">≡</button></div>
      ${state.filtersOpen ? `<div class="filter-panel"><strong style="font-size:10px">筛选</strong><div class="filter-row"><button class="chip active" type="button">华东智造</button><button class="chip" type="button">制造业务</button><button class="chip" type="button">本月</button><button class="chip" type="button">我创建的</button></div></div>` : ""}
      <button class="notice" type="button" data-screen="ai-review" style="width:100%;border:0;text-align:left">另有 2 条私人草稿待处理，前往草稿入口 ›</button>
      <div class="list-panel">
        ${recordRow("8 月 21 日 14:20", "华东智造科技", "电话 · 制造业务", "实施周期与报价方案沟通", "张雨、李程 / 王磊", "record-detail")}
        ${recordRow("8 月 18 日 09:30", "远见数字供应链", "线上会议 · 数字化服务", "数据接口范围确认", "张雨 / 陈嘉", "record-detail")}
        ${recordRow("8 月 12 日 10:00", "华东智造科技", "拜访 · 制造业务", "工厂现场需求访谈", "张雨、李程 / 王磊、周宁", "record-detail")}
      </div><button class="secondary-button full-button" type="button" data-screen="governance">查询停用记录</button>`
  });
}

function recordRow(time, customer, channel, subject, people, screen) {
  return `<button class="record-row" type="button" data-screen="${screen}"><span class="record-row-top"><strong>${customer}</strong><span class="status-chip formal">正式</span></span><p>${subject}</p><small>${time} · ${channel}<br>参与人：${people}</small></button>`;
}

function recordDetailScreen() {
  return mobileFrame({
    title: "沟通详情", subtitle: "正式记录 · 版本 2", back: "records",
    action: `<button class="mobile-icon-button small" type="button" data-action="open-record-menu" title="更多操作" aria-label="沟通记录更多操作">···</button>`,
    body: `<div class="notice success">正式记录 · 已启用 · 最近更新于 8 月 22 日 09:10</div>
      <div class="glass-panel"><div class="section-heading"><h3>${escapeHtml(state.recordSnapshot.subject)}</h3><span>${escapeHtml(state.recordSnapshot.channel)}</span></div><dl class="fact-list"><div class="fact-row"><dt>客户</dt><dd>${escapeHtml(state.recordSnapshot.customer)}</dd></div><div class="fact-row"><dt>实际时间</dt><dd>${escapeHtml(state.recordSnapshot.time)}</dd></div><div class="fact-row"><dt>业务线</dt><dd>制造业务</dd></div><div class="fact-row"><dt>时长</dt><dd>35 分钟</dd></div></dl></div>
      <div class="glass-panel"><div class="section-heading"><h3>沟通正文</h3><span>人工确认</span></div><p style="margin:0;font-size:11px;line-height:1.65">${escapeHtml(state.recordSnapshot.content)}</p><div class="section-heading" style="margin-top:14px"><h3>结论</h3></div><p style="margin:0;font-size:10px;line-height:1.6;color:var(--muted)">双方确认下周继续沟通具体实施安排。</p></div>
      <details class="form-section" open><summary>参与人快照</summary><div class="form-body"><div class="fact-row"><dt>我方</dt><dd>张雨、李程</dd></div><div class="fact-row"><dt>客户方</dt><dd>王磊</dd></div></div></details>
      <details class="form-section"><summary>附件与来源</summary><div class="form-body"><div class="system-item"><span class="item-dot success"></span><span class="system-copy"><strong>报价方案-v3.pdf</strong><span>2.4 MB · 扫描通过</span></span><span class="item-action">查看</span></div></div></details>
      <details class="form-section"><summary>版本与审计</summary><div class="form-body"><div class="timeline"><div class="timeline-item"><strong>版本 2 · 补充结论</strong><span>张雨 · 8 月 22 日 09:10 · 来源：会议纪要</span></div><div class="timeline-item"><strong>版本 1 · 正式创建</strong><span>张雨 · 8 月 21 日 15:02 · 手工录入</span></div></div></div></details>
      <div class="button-row equal"><button class="secondary-button" type="button" data-screen="version-diff">补充材料</button><button class="danger-button" type="button" data-action="open-record-deactivate">停用记录</button></div>`
  });
}

function aiMaterialScreen() {
  const content = state.materialMode === "text"
    ? `<label class="field"><span>原始文本 <em>*</em></span><textarea id="materialText" style="min-height:150px">${escapeHtml(state.materialText)}</textarea></label>`
    : `<label class="upload-zone" for="materialFile"><input class="file-input" id="materialFile" type="file" accept="${state.materialMode === "audio" ? ".m4a,.mp3,.wav" : ".pdf,.docx,.txt"}"><span><strong>${state.materialFile ? escapeHtml(state.materialFile) : `+ 选择${state.materialMode === "audio" ? "音频" : "会议纪要"}文件`}</strong><span>${state.materialMode === "audio" ? "M4A / MP3 / WAV，单文件不超过 50 MB" : "PDF / DOCX / TXT，上传后先安全扫描"}</span></span></label>`;
  return mobileFrame({
    title: "AI 整理材料", subtitle: "只生成未确认草稿", back: "workbench",
    body: `<div class="notice warning">原始材料将先持久化。AI 不会自动写入正式沟通记录。</div>${state.materialError ? `<div class="notice danger">${escapeHtml(state.materialError)}</div>` : ""}
      <div class="mobile-segmented"><button class="segment-button ${state.materialMode === "text" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="text">直接文本</button><button class="segment-button ${state.materialMode === "audio" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="audio">音频文件</button><button class="segment-button ${state.materialMode === "document" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="document">会议纪要</button></div>
      <div class="glass-panel">${content}</div>
      <details class="form-section" ${state.materialIntent === "supplement" ? "open" : ""}><summary>记录方式</summary><div class="form-body"><label class="field"><span>如何使用材料</span><select id="materialIntent"><option value="new" ${state.materialIntent === "new" ? "selected" : ""}>新建沟通记录</option><option value="supplement" ${state.materialIntent === "supplement" ? "selected" : ""}>补充已有记录</option></select></label>${state.materialIntent === "supplement" ? `<label class="field"><span>目标正式记录 <em>*</em></span><select id="targetRecord"><option>实施周期与报价方案沟通 · 版本 2</option></select></label>` : ""}<div class="notice">补充已有记录将在确认前展示逐字段差异。</div></div></details>
      <div class="screen-actions"><button class="primary-button full-button" type="button" data-action="start-ai"><span class="confirm-dot"></span>保存材料并开始处理</button></div>`
  });
}

function aiProcessingScreen() {
  if (state.processState === "failed") {
    return mobileFrame({
      title: "处理失败", subtitle: "原始材料已保留", back: "ai-material",
      body: `<div class="notice danger">结构化抽取服务暂时不可用。材料 ID MAT-0821-006 未丢失。</div><div class="glass-panel"><div class="process-steps"><div class="process-step done"><span class="step-node">✓</span><span><strong>材料已持久化</strong><span>内容哈希已记录</span></span><small>完成</small></div><div class="process-step done"><span class="step-node">✓</span><span><strong>文件扫描 / 转写</strong><span>扫描通过，文本可用</span></span><small>完成</small></div><div class="process-step"><span class="step-node">!</span><span><strong>结构化抽取</strong><span>服务暂时不可用</span></span><small>失败</small></div></div></div><div class="button-row equal"><button class="secondary-button" type="button" data-screen="manual-record">转手工录入</button><button class="primary-button" type="button" data-action="retry-process">重新处理</button></div>`
    });
  }
  if (state.processState === "needs-customer") {
    return mobileFrame({
      title: "确认客户", subtitle: "发现多个当前租户候选", back: "ai-material",
      body: `<div class="notice warning">材料中的“华东智造”无法唯一匹配。选择前不会生成可确认草稿。</div><div class="list-panel"><button class="customer-card" type="button" data-action="choose-ai-customer" data-customer="华东智造科技有限公司"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span>上海 · 智能制造<br>材料命中：华东智造、王磊</span></span><span class="item-action">选择 ›</span></button><button class="customer-card" type="button" data-action="choose-ai-customer" data-customer="华东智造装备（苏州）"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造装备（苏州）</strong><span>苏州 · 工业设备<br>材料命中：华东智造</span></span><span class="item-action">选择 ›</span></button></div><div class="button-row equal"><button class="secondary-button" type="button" data-screen="dedupe">搜索 / 新建客户</button><button class="secondary-button" type="button" data-screen="ai-material">取消处理</button></div>`
    });
  }
  return mobileFrame({
    title: "材料处理中", subtitle: "离开页面后任务继续", back: "workbench",
    body: `<div class="glass-panel"><div class="process-steps"><div class="process-step done"><span class="step-node">✓</span><span><strong>材料已持久化</strong><span>MAT-0821-006</span></span><small>完成</small></div><div class="process-step done"><span class="step-node">✓</span><span><strong>扫描与转写</strong><span>原始文本可用</span></span><small>完成</small></div><div class="process-step active"><span class="step-node">3</span><span><strong>结构化抽取</strong><span>正在识别事实字段</span></span><small>处理中</small></div><div class="process-step"><span class="step-node">4</span><span><strong>客户匹配</strong><span>等待抽取结果</span></span><small>等待</small></div></div></div><div class="notice">AI 处理不会阻塞手工录入，也不会自动创建正式记录。</div><div class="button-row equal"><button class="secondary-button" type="button" data-action="fail-process">模拟失败</button><button class="primary-button" type="button" data-action="process-next">查看处理结果</button></div>`
  });
}

function aiReviewScreen() {
  const fields = [
    ["customer", "客户", "材料文本 0–6 字 · 规则匹配 · 92%"],
    ["time", "实际时间", "材料文本 0–8 字 · 模型提取 · 88%"],
    ["channel", "渠道", "材料文本 15–17 字 · 模型提取 · 96%"],
    ["subject", "主题", "根据正文候选生成 · 模型提取 · 78%"],
    ["content", "沟通正文", "材料文本 20–52 字 · 模型提取 · 91%"]
  ];
  const aiReady = state.processState === "ready" && state.aiDraftStatus === "ready";
  return mobileFrame({
    title: "审核 AI 草稿", subtitle: "草稿版本 3", back: "workbench",
    body: `<div class="notice warning"><strong>未确认草稿</strong><br>修改并明确确认前，不进入正式列表、最近沟通或任何统计。</div>${!aiReady ? `<div class="notice danger">AI Job 与草稿尚未同时进入 READY_FOR_REVIEW，当前不能确认。</div>` : ""}${state.aiError ? `<div class="notice danger">${escapeHtml(state.aiError)}</div>` : ""}
      <div class="glass-panel">${fields.map(([id, label, evidence]) => `<div class="ai-field"><div class="ai-field-head"><label for="ai-${id}"><strong>${label}${["customer","time","channel","content"].includes(id) ? " *" : ""}</strong></label><span class="source-chip">AI 候选</span></div>${id === "content" ? `<textarea id="ai-${id}" data-ai-field="${id}" aria-label="${label}">${escapeHtml(state.aiDraft[id])}</textarea>` : `<input id="ai-${id}" data-ai-field="${id}" aria-label="${label}" value="${escapeHtml(state.aiDraft[id])}">`}<button class="evidence-toggle" type="button" data-action="toggle-evidence" data-field="${id}">${state.evidenceOpen[id] ? "收起来源 −" : "查看来源 +"}</button>${state.evidenceOpen[id] ? `<div class="evidence">${evidence}<br>置信度仅供审核，不决定是否转正式。</div>` : ""}</div>`).join("")}</div>
      <details class="form-section"><summary>参与人候选与结论</summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">临时姓名</button></div></label><label class="field"><span>结论 / 后续推进</span><textarea>约定下周继续沟通具体实施安排。</textarea></label></div></details>
      <button class="text-button full-button" type="button" data-screen="version-diff">改为补充已有记录</button>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-ai-draft">保存草稿</button><button class="primary-button" type="button" data-action="confirm-ai" ${aiReady ? "" : "disabled"}><span class="confirm-dot"></span>确认正式记录</button></div><button class="text-button full-button" type="button" data-action="abandon-ai">放弃草稿</button></div>`
  });
}

function versionDiffScreen() {
  const rows = [
    ["subject", "主题", "实施周期与报价方案沟通", "实施周期、交付边界及报价确认"],
    ["content", "沟通正文", "客户认可初步方案，希望补充实施周期。", "客户认可初步方案，希望补充实施周期、交付边界和正式报价。"],
    ["conclusion", "结论", "下周继续沟通。", "下周三发送正式报价并继续沟通。"]
  ];
  return mobileFrame({
    title: "补充已有记录", subtitle: "目标记录 · 版本 2", back: "ai-review",
    body: `<div class="notice warning">逐字段接受或拒绝建议。确认后创建版本 3，不覆盖版本 2。</div>${state.versionConflict ? `<div class="notice danger">目标记录已更新。必须刷新并重新生成差异后才能确认。</div><button class="secondary-button full-button" type="button" data-action="refresh-diff">刷新并重新生成差异</button>` : ""}<div class="glass-panel">${rows.map(([id, label, current, suggested]) => `<div class="diff-row"><div class="diff-title"><span>${label}</span><label class="switch" title="接受建议"><input type="checkbox" data-action="toggle-diff" data-field="${id}" ${state.diffAccepted[id] ? "checked" : ""}><span></span></label></div><div class="diff-columns"><div class="diff-value"><strong>当前正式值</strong><br>${current}</div><div class="diff-value suggested"><strong>建议值</strong><br>${suggested}</div></div></div>`).join("")}</div><details class="form-section"><summary>版本与来源</summary><div class="form-body"><div class="fact-row"><dt>目标版本</dt><dd>2</dd></div><div class="fact-row"><dt>来源材料</dt><dd>MAT-0821-006</dd></div><div class="fact-row"><dt>确认后</dt><dd>创建版本 3</dd></div></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="simulate-conflict">模拟版本冲突</button><button class="primary-button" type="button" data-action="confirm-diff" ${state.versionConflict ? "disabled" : ""}><span class="confirm-dot"></span>确认新版本</button></div></div>`
  });
}

function governanceScreen() {
  if (state.governanceMode === "deactivate-record") {
    return mobileFrame({
      title: "停用沟通记录", subtitle: "当前记录 · 版本 2", back: "record-detail",
      body: `<div class="notice warning">停用后默认列表隐藏，但客户时间线、附件和版本历史仍保留。</div><div class="glass-panel"><div class="identity-strip"><span class="avatar">华</span><span><strong>${escapeHtml(state.recordSnapshot.subject)}</strong><span>${escapeHtml(state.recordSnapshot.customer)} · 正式记录</span></span><span class="status-chip formal">启用</span></div><label class="field"><span>停用原因 <em>*</em></span><textarea id="governanceReason" maxlength="500" placeholder="请填写停用原因">${escapeHtml(state.governanceReason)}</textarea></label></div>`,
      sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="record-detail">取消</button><button class="danger-button" type="button" data-action="confirm-deactivate-record">确认停用</button></div></div>`
    });
  }
  const customerMode = state.governanceType === "customer";
  const itemId = customerMode ? "inactive-customer" : "inactive-record";
  const restored = state.restored[itemId];
  return mobileFrame({
    title: "停用数据治理", subtitle: "管理员评审身份", back: customerMode ? "customers" : "records",
    body: `<div class="mobile-segmented"><button class="segment-button ${customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="customer">停用客户</button><button class="segment-button ${!customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="record">停用沟通</button></div>
      ${restored ? `<div class="notice success">对象已恢复启用，恢复操作已写入审计。</div>` : `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${customerMode ? "北" : "华"}</span><span><strong>${customerMode ? "北辰工业系统" : "旧版报价口径沟通"}</strong><span>${customerMode ? "客户 · 停用" : "华东智造科技 · 沟通记录"}</span></span><span class="status-chip inactive">停用</span></div><dl class="fact-list" style="margin-top:10px"><div class="fact-row"><dt>停用原因</dt><dd>${customerMode ? "企业主体合并，停止新业务使用" : "内容重复，保留历史引用"}</dd></div><div class="fact-row"><dt>操作人</dt><dd>陈管理员</dd></div><div class="fact-row"><dt>停用时间</dt><dd>2026-08-18 11:40</dd></div><div class="fact-row"><dt>历史引用</dt><dd>${customerMode ? "3 位联系人 · 8 条沟通" : "2 个附件 · 版本 1"}</dd></div></dl></div><div class="notice">${customerMode ? "联系人、地址、业务线关系、沟通和附件仍保留；普通用户只读。" : "恢复前不可普通编辑；客户历史时间线仍保留此记录。"}</div><button class="primary-button full-button" type="button" data-action="restore-item" data-item="${itemId}">恢复启用</button>`}
      <details class="form-section" style="margin-top:10px"><summary>治理规则</summary><div class="form-body"><ul style="margin:10px 0 0;padding-left:18px;color:var(--muted);font-size:9px;line-height:1.7"><li>默认列表隐藏停用对象</li><li>恢复不自动恢复独立停用的子对象</li><li>不提供物理删除</li></ul></div></details>`
  });
}

function profileScreen() {
  return mobileFrame({
    title: "我的", subtitle: "身份、草稿与会话", nav: "profile",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">张</span><span><strong>张雨</strong><span>海天科技 · 华东销售部</span></span><span class="status-chip formal">销售人员</span></div></div><div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>当前租户</dt><dd>海天科技</dd></div><div class="fact-row"><dt>组织范围</dt><dd>华东销售部</dd></div><div class="fact-row"><dt>数据权限</dt><dd>本人创建或内部负责客户</dd></div></dl></div><div class="list-panel"><button class="system-item" type="button" data-screen="ai-review"><span class="item-dot warning"></span><span class="system-copy"><strong>我的沟通草稿</strong><span>2 条待继续编辑或确认</span></span><span class="item-action">查看 ›</span></button><button class="system-item" type="button" data-action="show-governance-forbidden"><span class="item-dot"></span><span class="system-copy"><strong>数据治理入口</strong><span>当前账号无管理员操作权限</span></span><span class="item-action">无权限</span></button></div><button class="danger-button full-button" type="button" data-action="logout">退出登录</button>`
  });
}

function renderPhone() {
  const renderers = {
    workbench: workbenchScreen,
    customers: customersScreen,
    dedupe: dedupeScreen,
    "customer-form": customerFormScreen,
    "customer-detail": customerDetailScreen,
    "manual-record": manualRecordScreen,
    records: recordsScreen,
    "record-detail": recordDetailScreen,
    "ai-material": aiMaterialScreen,
    "ai-processing": aiProcessingScreen,
    "ai-review": aiReviewScreen,
    "version-diff": versionDiffScreen,
    governance: governanceScreen,
    profile: profileScreen
  };
  els.phoneScreen.innerHTML = renderers[state.activeScreen]();
}

function render() {
  renderNav();
  renderReview();
  renderPhone();
}

function navigate(screenId) {
  if (!screenById[screenId]) return;
  saveCurrentNote(false);
  state.activeScreen = screenId;
  state.toast = "";
  render();
}

function showToast(message) {
  clearTimeout(toastTimer);
  state.toast = message;
  renderPhone();
  toastTimer = setTimeout(() => {
    state.toast = "";
    renderPhone();
  }, 2200);
}

function saveCurrentNote(explicit = true) {
  const id = state.activeScreen;
  const value = els.reviewNotes.value;
  notes[id] = value;
  const ok = writeStorage(STORAGE_KEY, notes);
  els.saveState.textContent = ok ? (explicit ? "已保存到本地" : "已自动保存") : "浏览器存储不可用，当前输入仍保留";
  els.commentCount.textContent = `${value.length} 字`;
  return ok;
}

function exportNotes() {
  saveCurrentNote(false);
  const payload = {
    prototype: "在途 CRM 手机端 PRD 评审",
    prdVersion: "2.1",
    exportedAt: new Date().toISOString(),
    screens: screens.map((screen, index) => ({
      index: index + 1,
      id: screen.id,
      title: screen.title,
      reviewed: Boolean(reviewStatus[screen.id]),
      note: notes[screen.id] || ""
    }))
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `zt-crm-review-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyCurrent() {
  saveCurrentNote(false);
  const screen = screenById[state.activeScreen];
  const text = `【${screen.title}】\n${notes[screen.id] || "（暂无意见）"}`;
  try {
    await navigator.clipboard.writeText(text);
    els.saveState.textContent = "本页意见已复制";
  } catch (_error) {
    els.reviewNotes.focus();
    els.reviewNotes.select();
    els.saveState.textContent = "已选中文本，请手动复制";
  }
}

function captureManualForm() {
  state.manualTime = document.querySelector("#manualTime")?.value.trim() ?? state.manualTime;
  state.manualChannel = document.querySelector("#manualChannel")?.value ?? state.manualChannel;
  state.manualSubject = document.querySelector("#manualSubject")?.value.trim() ?? state.manualSubject;
  state.recordContent = document.querySelector("#recordContent")?.value.trim() ?? state.recordContent;
}

function validateManualFormal() {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.manualTime)) errors.time = "请输入 YYYY-MM-DD HH:mm 格式的实际时间。";
  if (!state.manualChannel) errors.channel = "请选择沟通渠道。";
  if (!state.recordContent) errors.content = "请输入沟通正文。";
  state.manualErrors = errors;
  return Object.keys(errors).length === 0;
}

function captureAiDraft() {
  document.querySelectorAll("[data-ai-field]").forEach((field) => {
    state.aiDraft[field.dataset.aiField] = field.value.trim();
  });
}

function validateAiDraft() {
  const required = ["customer", "time", "channel", "content"];
  const missing = required.filter((key) => !state.aiDraft[key]);
  if (missing.length) {
    state.aiError = `正式必填仍缺少：${missing.map((key) => ({ customer: "客户", time: "实际时间", channel: "渠道", content: "沟通正文" })[key]).join("、")}。`;
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.aiDraft.time)) {
    state.aiError = "实际时间格式应为 YYYY-MM-DD HH:mm。";
    return false;
  }
  state.aiError = "";
  return true;
}

function captureMaterial() {
  state.materialText = document.querySelector("#materialText")?.value.trim() ?? state.materialText;
  state.materialIntent = document.querySelector("#materialIntent")?.value ?? state.materialIntent;
}

function handleAction(target, action) {
  if (action === "toggle-filters") state.filtersOpen = !state.filtersOpen;
  if (action === "set-customer-tab") state.customerTab = target.dataset.tab;
  if (action === "set-material-mode") {
    captureMaterial();
    state.materialMode = target.dataset.mode;
    state.materialError = "";
  }
  if (action === "set-governance-type") {
    state.governanceMode = "list";
    state.governanceType = target.dataset.type;
  }
  if (action === "toggle-evidence") {
    captureAiDraft();
    state.evidenceOpen[target.dataset.field] = !state.evidenceOpen[target.dataset.field];
  }
  if (action === "toggle-diff") state.diffAccepted[target.dataset.field] = target.checked;

  if (action === "run-dedupe") {
    const input = document.querySelector("#dedupeName");
    state.dedupeName = input ? input.value.trim() : state.dedupeName;
    state.dedupeUscc = document.querySelector("#dedupeUscc")?.value.trim().toUpperCase() || "";
    state.dedupeError = "";
    if (state.dedupeName.length < 2 || state.dedupeName.length > 200) {
      state.dedupeStage = "idle";
      state.dedupeError = "请输入 2–200 字的企业名称或简称。";
    } else if (state.dedupeUscc && state.dedupeUscc.length !== 18) {
      state.dedupeStage = "idle";
      state.dedupeError = "统一社会信用代码必须为 18 位。";
    } else {
      const requestId = ++state.dedupeRequestId;
      const queryName = state.dedupeName;
      const queryUscc = state.dedupeUscc;
      state.dedupeStage = "checking";
      renderPhone();
      setTimeout(() => {
        if (state.activeScreen !== "dedupe" || requestId !== state.dedupeRequestId) return;
        if (queryUscc === "91310000MA1K39XQ7A") state.dedupeStage = "strong";
        else state.dedupeStage = queryName.includes("远见") ? "none" : "candidate";
        renderPhone();
      }, 650);
      return;
    }
  }
  if (action === "clear-strong-duplicate") {
    state.dedupeStage = "idle";
    state.dedupeUscc = "";
  }
  if (action === "continue-new") {
    if (state.dedupeStage === "candidate" && !state.canOverrideDuplicates) state.dedupeError = "当前账号没有 CUSTOMER_DEDUPE_OVERRIDE 权限。";
    else if (state.dedupeStage === "candidate") state.dedupeOverrideOpen = true;
    else navigate("customer-form");
  }
  if (action === "confirm-override") {
    const reason = document.querySelector("#overrideReason")?.value.trim() || "";
    if (reason.length < 10 || reason.length > 500) state.dedupeError = "继续新增理由需为 10–500 字。";
    else {
      state.dedupeOverrideApproved = true;
      state.customerName = state.dedupeName.includes("有限公司") ? state.dedupeName : `${state.dedupeName}有限公司`;
      navigate("customer-form");
      return;
    }
  }
  if (action === "save-customer") {
    state.customerName = document.querySelector("#customerName")?.value.trim() || "";
    if (state.customerName.length < 2 || state.customerName.length > 200) state.customerFormError = "企业全称为必填项，请输入 2–200 字。";
    else if (state.dedupeUscc === "91310000MA1K39XQ7A") {
      state.dedupeStage = "strong";
      navigate("dedupe");
      showToast("保存前二次查重命中强重复，已返回候选");
      return;
    }
    else {
      state.customerFormError = "";
      navigate("customer-detail");
      showToast("客户已保存，系统生成客户编码");
      return;
    }
  }
  if (action === "add-subobject") {
    if (target.dataset.kind === "address") state.addressRows = Math.min(state.addressRows + 1, 2);
    if (target.dataset.kind === "contact") state.contactRows = Math.min(state.contactRows + 1, 2);
    if (target.dataset.kind === "owner") state.ownerRows = Math.min(state.ownerRows + 1, 2);
  }
  if (action === "add-detail-subobject") {
    if (target.dataset.kind === "address") state.addressRows = Math.min(state.addressRows + 1, 2);
    if (target.dataset.kind === "contact") state.contactRows = Math.min(state.contactRows + 1, 2);
    navigate("customer-form");
    showToast("已新增一行，请补齐必填字段后保存");
    return;
  }
  if (action === "change-customer") showToast("客户选择器仅显示启用且有权限的客户");
  if (action === "add-participant") showToast(`${target.dataset.side === "internal" ? "我方" : "客户方"}参与人已新增一行`);
  if (action === "save-manual-draft") {
    captureManualForm();
    state.manualErrors = {};
    showToast("草稿已保存，编辑内容已保留且未进入正式列表");
    return;
  }
  if (action === "save-manual-formal") {
    captureManualForm();
    if (validateManualFormal()) {
      state.recordSnapshot = { customer: state.customerName, time: state.manualTime, channel: state.manualChannel, subject: state.manualSubject || "未填写主题", content: state.recordContent };
      navigate("record-detail");
      showToast("正式记录已保存，重复提交将返回同一记录");
      return;
    }
  }
  if (action === "start-ai") {
    captureMaterial();
    if (state.materialMode === "text" && !state.materialText) {
      state.materialError = "请输入原始文本后再开始处理。";
      renderPhone();
      return;
    }
    if (state.materialMode !== "text" && !state.materialFile) {
      state.materialError = "请选择符合类型与大小限制的材料文件。";
      renderPhone();
      return;
    }
    state.materialError = "";
    state.processState = "processing";
    state.aiDraftStatus = "editing";
    navigate("ai-processing");
    return;
  }
  if (action === "process-next") state.processState = "needs-customer";
  if (action === "fail-process") state.processState = "failed";
  if (action === "retry-process") state.processState = "processing";
  if (action === "choose-ai-customer") {
    state.aiDraft.customer = target.dataset.customer || "华东智造科技有限公司";
    state.processState = "ready";
    state.aiDraftStatus = "ready";
    navigate(state.materialIntent === "supplement" ? "version-diff" : "ai-review");
    showToast(state.materialIntent === "supplement" ? "客户已确认，请审核补充差异" : "客户已确认，生成未确认草稿");
    return;
  }
  if (action === "save-ai-draft") {
    captureAiDraft();
    showToast("未确认草稿已保存，编辑内容已保留");
    return;
  }
  if (action === "confirm-ai") {
    captureAiDraft();
    if (state.processState !== "ready" || state.aiDraftStatus !== "ready") {
      state.aiError = "AI Job 与草稿尚未同时 READY_FOR_REVIEW。";
      renderPhone();
      return;
    }
    if (!validateAiDraft()) {
      renderPhone();
      return;
    }
    state.recordSnapshot = { ...state.aiDraft };
    state.aiDraftStatus = "confirmed";
    navigate("record-detail");
    showToast("已确认并创建正式记录");
    return;
  }
  if (action === "abandon-ai") {
    if (window.confirm("放弃后草稿不可恢复，但原始材料按治理策略保留。确认放弃？")) {
      navigate("workbench");
      showToast("草稿已放弃，未创建正式记录");
      return;
    }
  }
  if (action === "confirm-diff") {
    if (state.versionConflict) {
      showToast("版本冲突未解决，不能确认新版本");
      return;
    }
    if (!Object.values(state.diffAccepted).some(Boolean)) {
      showToast("未接受任何字段，不能创建空版本");
      return;
    }
    navigate("record-detail");
    showToast("已创建版本 3，版本 2 保持不变");
    return;
  }
  if (action === "simulate-conflict") state.versionConflict = true;
  if (action === "refresh-diff") {
    state.versionConflict = false;
    showToast("已刷新目标版本并重新生成差异");
    return;
  }
  if (action === "open-record-deactivate") {
    state.governanceMode = "deactivate-record";
    state.governanceReason = "";
    navigate("governance");
    return;
  }
  if (action === "confirm-deactivate-record") {
    state.governanceReason = document.querySelector("#governanceReason")?.value.trim() || "";
    if (!state.governanceReason) {
      showToast("停用原因不能为空");
      return;
    }
    state.governanceMode = "list";
    state.governanceType = "record";
    showToast("记录已停用，历史与附件仍保留");
    return;
  }
  if (action === "restore-item") {
    state.restored[target.dataset.item] = true;
    showToast("恢复成功，审计事件已记录");
    return;
  }
  if (action === "show-governance-forbidden") showToast("当前销售账号无数据治理操作权限");
  if (action === "logout") showToast("原型模式：未执行真实退出");
  if (action === "open-global-add") showToast("新增入口：客户 / 沟通记录 / AI 整理材料");
  if (action === "open-customer-menu") showToast("更多操作：编辑 / 停用 / 查看审计");
  if (action === "open-record-menu") showToast("更多操作：编辑新版本 / 停用 / 恢复");

  renderPhone();
}

document.addEventListener("click", (event) => {
  const screenTarget = event.target.closest("[data-screen]");
  if (screenTarget) {
    if (screenTarget.dataset.screen === "governance") state.governanceMode = "list";
    navigate(screenTarget.dataset.screen);
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) handleAction(actionTarget, actionTarget.dataset.action);
});

document.addEventListener("change", (event) => {
  if (event.target.id === "materialIntent") {
    captureMaterial();
    renderPhone();
  }
  if (event.target.id === "materialFile") {
    state.materialFile = event.target.files?.[0]?.name || "";
    state.materialError = "";
    renderPhone();
  }
  if (event.target.id === "manualAttachment") {
    state.attachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
});

els.reviewNotes.addEventListener("input", () => {
  els.commentCount.textContent = `${els.reviewNotes.value.length} 字`;
  els.saveState.textContent = "正在编辑…";
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => saveCurrentNote(false), 500);
});

els.reviewDone.addEventListener("change", () => {
  reviewStatus[state.activeScreen] = els.reviewDone.checked;
  const ok = writeStorage(REVIEW_KEY, reviewStatus);
  if (!ok) els.saveState.textContent = "评审状态未能写入浏览器，本次会话仍保留";
  renderNav();
});

els.deviceSize.addEventListener("change", () => {
  els.phoneShell.dataset.size = els.deviceSize.value;
});

document.querySelector("#saveCurrent").addEventListener("click", () => saveCurrentNote(true));
document.querySelector("#copyCurrent").addEventListener("click", copyCurrent);
document.querySelector("#exportAll").addEventListener("click", exportNotes);
document.querySelector("#resetPrototype").addEventListener("click", () => {
  saveCurrentNote(false);
  state = initialState();
  els.deviceSize.value = "390x844";
  els.phoneShell.dataset.size = "390x844";
  render();
  showToast("原型状态已重置，评审意见未清除");
});

window.addEventListener("pagehide", () => saveCurrentNote(false));

render();
