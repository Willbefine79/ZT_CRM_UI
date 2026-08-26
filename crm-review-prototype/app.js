"use strict";

const { filterRows } = CrmPrototypeLogic;
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
    refs: ["FR-7", "FR-3 归档与恢复"],
    objective: "让用户在权限范围内搜索，并在明确业务线范围内按合作关系筛选客户。",
    reviews: ["搜索覆盖企业全称、简称和联系人姓名。", "先明确业务线范围，再按该业务线的合作关系筛选。", "卡片只显示客观资料、业务线关系和最近正式沟通。"],
    decisions: ["默认列表隐藏已归档客户；治理入口可授权查看。", "列表不显示等级、价值、风险、态度或下一步。"]
  },
  {
    id: "dedupe", group: "客户", nav: "重复客户提醒", title: "重复客户提醒",
    refs: ["FR-3 客户查重与新建", "UJ-1"],
    objective: "后台查重仅在发现重复候选时打断保存，让用户选择已有客户或说明继续新增。",
    reviews: ["正常新增不展示单独查重步骤。", "候选明确展示名称、联系人或信用代码等命中原因。", "名称近似候选继续新增时选择原因，必要时补充说明。"],
    decisions: ["社会信用代码仅作为选填的精确识别依据。", "代码完全相同仍为强阻断，不能填写理由绕过。"]
  },
  {
    id: "customer-form", group: "客户", nav: "客户表单", title: "新增 / 编辑客户",
    refs: ["FR-3 至 FR-6", "字段契约 §3"],
    objective: "首次只完成最小建档，保存后再在客户详情中逐步补充客观资料。",
    reviews: ["新增仅显示企业全称、简称、合作关系和可选联系人。", "编辑时再提供完整客观资料与可重复子对象。", "未知值保持为空，不用示例值或默认枚举代替。"],
    decisions: ["不接入工商自动补全或自助批量导入。", "联系人不提供决策人、财务联系人等销售角色。"]
  },
  {
    id: "customer-detail", group: "客户", nav: "客户详情", title: "客户详情",
    refs: ["FR-7", "FR-4 至 FR-6"],
    objective: "在同一客户上下文中查看资料、从属结构与正式沟通时间线。",
    reviews: ["一级页签收敛为概览、联系人和沟通，地址与业务线归入概览。", "已归档客户仍保留历史，但详情转为只读。", "新增联系人和新增沟通从当前客户上下文进入。"],
    decisions: ["沟通时间来自正式且未归档记录。", "业务线关系状态只允许潜在、跟进中、已成交、已流失。"]
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
    objective: "默认按实际沟通时间倒序浏览正式且未归档的沟通事实。",
    reviews: ["筛选只使用沟通渠道这一项明确依据。", "草稿使用独立入口，不混入默认正式列表。", "已归档记录默认隐藏，授权后从治理视图查询。"],
    decisions: ["排序使用 occurred_at 与 id 的稳定游标。", "列表不出现后续任务、负责人或逾期语义。"]
  },
  {
    id: "record-detail", group: "沟通", nav: "沟通详情", title: "沟通记录详情",
    refs: ["FR-9", "FR-8 参与人快照"],
    objective: "展示一条正式沟通的完整事实、附件、审计和版本。",
    reviews: ["双方参与人以结构化引用和历史姓名快照分区显示。", "版本历史可展开，旧版本不可变。", "遗漏信息通过补充记录生成新版本；归档必须填写原因。"],
    decisions: ["已归档引用可只读保留，但修改时只能选未归档值。", "正式记录不保存草稿状态。"]
  },
  {
    id: "ai-material", group: "AI 录入", nav: "AI 材料输入", title: "AI 整理材料",
    refs: ["FR-10", "UJ-3"],
    objective: "先安全保存原始文本、音频或会议纪要，再启动异步整理。",
    reviews: ["输入支持文本、音频、AI 听记文本和会议纪要文件。", "明确材料只用于生成未确认草稿。", "页面离开后材料与处理任务仍可恢复。"],
    decisions: ["不做实时录音、拍照 OCR 或外部企业补全。", "材料保留与录音告知未批准前只使用脱敏试点数据。"]
  },
  {
    id: "ai-processing", group: "AI 录入", nav: "处理与客户匹配", title: "材料处理",
    refs: ["FR-10 异步处理", "FR-11 客户候选"],
    objective: "透明展示异步阶段、失败恢复和客户不唯一时的人工选择。",
    reviews: ["原始材料、扫描、转写、抽取状态彼此清楚。", "失败保留材料，可重试或转手工录入。", "客户不唯一时停在 NEEDS_CUSTOMER，人工选择后才生成可审核草稿。"],
    decisions: ["材料处理状态不等于草稿状态。", "0 个候选要求搜索或新建；只有明确客户后才进入草稿审核。"]
  },
  {
    id: "ai-review", group: "AI 录入", nav: "AI 草稿审核", title: "未确认草稿",
    refs: ["FR-11 结构化草稿", "FR-12 草稿确认"],
    objective: "逐字段审核 AI 候选、证据和来源，明确确认后才创建正式记录。",
    reviews: ["草稿显著标记为未确认，不进入正式列表或统计。", "AI 值显示材料定位、提取方式和置信提示。", "确认按钮文案必须是“确认正式记录”。"],
    decisions: ["置信度仅供审核，不自动确认。", "失败、取消或处理中状态一律不能确认。"]
  },
  {
    id: "version-diff", group: "沟通", nav: "补充沟通记录", title: "补充沟通记录",
    refs: ["FR-12 补充已有记录", "UJ-4"],
    objective: "让销售补录首次沟通时遗漏的事实，并为原记录创建可追溯的新版本。",
    reviews: ["从沟通详情进入并带出原记录上下文。", "只补充主题、正文、结论、参与人或附件等遗漏信息。", "保存后创建新版本，原版本保持不变。"],
    decisions: ["补充记录是销售主动补录，不是 AI 差异建议。", "客户和实际沟通时间默认保持不变。"]
  },
  {
    id: "governance", group: "治理", nav: "归档与恢复", title: "归档数据管理",
    refs: ["UJ-5", "FR-3 / FR-9", "FR-14"],
    objective: "让授权管理员查看归档原因、历史引用并执行恢复。",
    reviews: ["客户与沟通记录分别归档管理。", "归档客户的联系人、关系、沟通和附件不级联删除。", "恢复不自动恢复已独立归档的子对象。"],
    decisions: ["无物理删除入口。", "恢复与归档都进入审计。"]
  },
  {
    id: "profile", group: "治理", nav: "我的", title: "我的",
    refs: ["§7 信息架构", "FR-14 权限"],
    objective: "提供克制的个人与所属企业上下文、私人草稿入口和退出登录。",
    reviews: ["显示所属企业、用户、角色和组织范围。", "私人草稿入口与正式沟通列表分离。", "不建设复杂个人配置或管理驾驶舱。"],
    decisions: ["销售管理者默认不能看他人私人草稿。", "退出登录是唯一会话操作。"]
  }
];

const screenById = Object.fromEntries(screens.map((screen) => [screen.id, screen]));

const initialState = () => ({
  activeScreen: "workbench",
  customerFiltersOpen: false,
  recordFiltersOpen: false,
  customerRelationFilter: "全部",
  recordChannelFilter: "全部",
  customerTab: "overview",
  customerFormMode: "edit",
  dedupeStage: "idle",
  dedupeOverrideOpen: false,
  dedupeOverrideReason: "",
  dedupeOverrideApproved: false,
  canOverrideDuplicates: true,
  dedupeError: "",
  customerName: "远见数字供应链有限公司",
  customerShortName: "远见供应链",
  customerRelation: "潜在",
  customerContactName: "陈嘉",
  customerFormError: "",
  customerDedupeStatus: "idle",
  customerPickerOpen: false,
  customerMinimalProfile: false,
  customerSaveConflict: false,
  contactRows: 1,
  addressRows: 1,
  ownerRows: 1,
  materialMode: "text",
  materialText: "8月21日下午与华东智造王磊电话沟通。客户认可初步方案，希望补充实施周期、交付边界和正式报价，约定下周继续沟通。",
  materialFile: "",
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
  archivedRecord: null,
  supplementContent: "",
  supplementConclusion: "",
  supplementAttachmentAdded: false,
  supplementParticipantAdded: false,
  recordSupplementAttachmentAdded: false,
  recordSupplementParticipantAdded: false,
  recordContent: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
  manualTime: "2026-08-21 14:20",
  manualChannel: "",
  manualSubject: "实施周期与报价方案沟通",
  manualConclusion: "双方确认下周继续沟通具体实施安排。",
  manualErrors: {},
  attachmentAdded: false,
  extraInternalParticipant: false,
  extraCustomerParticipant: false,
  recordVersion: 2,
  createdRecord: null,
  supplementedRecord: null,
  recordConclusion: "双方确认下周继续沟通具体实施安排。",
  selectedRecordIsExisting: true,
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
    body: `<div class="mobile-greeting"><strong>下午好，张雨</strong><span>按系统状态处理 CRM 事实</span></div>
      <div class="section-heading"><h3>需要我确认</h3><span>按更新时间</span></div>
      <div class="list-panel">
        <button class="system-item" type="button" data-action="open-ready-draft"><span class="item-dot"></span><span class="system-copy"><strong>沟通草稿待确认</strong><span>华东智造科技 · 8 月 25 日 09:31</span></span><span class="item-action">审核 ›</span></button>
        <button class="system-item" type="button" data-action="open-dedupe-candidate"><span class="item-dot warning"></span><span class="system-copy"><strong>客户名称存在近似候选</strong><span>华东智造 · 8 月 25 日 09:09</span></span><span class="item-action">处理 ›</span></button>
      </div>
      <details class="workbench-disclosure"><summary>其他状态 <span>2 项</span></summary><div class="list-panel"><button class="system-item" type="button" data-action="open-processing-failure"><span class="item-dot danger"></span><span class="system-copy"><strong>会议纪要整理失败</strong><span>原始材料已保留 · 8 月 25 日 08:40</span></span><span class="item-action">处理 ›</span></button><button class="system-item" type="button" data-action="select-customer" data-customer="华东智造科技"><span class="item-dot success"></span><span class="system-copy"><strong>客户资料待补充</strong><span>缺少主地址、公开电话 · 8 月 24 日 16:20</span></span><span class="item-action">补充 ›</span></button></div></details>
      <div class="section-heading"><h3>快速新增</h3><span>仅事实对象</span></div>
      <div class="quick-grid">
        <button class="quick-action" type="button" data-action="start-customer-create"><span>+</span>新增客户</button>
        <button class="quick-action" type="button" data-screen="manual-record"><span>+</span>新增沟通</button>
        <button class="quick-action" type="button" data-screen="ai-material"><span>+</span>AI 整理</button>
      </div>
      <div class="section-heading"><h3>最近事实</h3><span>正式数据</span></div>
      <div class="list-panel">
        <button class="system-item" type="button" data-action="select-customer" data-customer="华东智造科技"><span class="item-dot success"></span><span class="system-copy"><strong>华东智造科技</strong><span>上海 · 制造业务跟进中</span></span><span class="item-action">客户 ›</span></button>
        <button class="system-item" type="button" data-action="select-record" data-customer="华东智造科技" data-time="8 月 21 日 14:20" data-channel="电话" data-subject="实施周期与报价方案沟通"><span class="item-dot"></span><span class="system-copy"><strong>实施周期与报价方案沟通</strong><span>电话 · 8 月 21 日 14:20</span></span><span class="item-action">记录 ›</span></button>
      </div>`
  });
}

function customersScreen() {
  const customerRows = [
    ["华", "华东智造科技", "王磊 · 采购总监", "上海", "制造业务", "跟进中", "2 天前", "customer-detail"],
    ["远", "远见数字供应链", "陈嘉 · 运营经理", "杭州", "制造业务", "潜在", "5 天前", "customer-detail"],
    ["新", "新港工业设备", "暂无联系人", "苏州", "制造业务", "已成交", "8 天前", "customer-detail"],
    ["澄", "澄海精密制造", "赵敏 · 行政经理", "宁波", "制造业务", "已流失", "21 天前", "customer-detail"]
  ];
  if (state.restored["inactive-customer"]) customerRows.push(["北", "北辰工业系统", "暂无联系人", "北京", "制造业务", "潜在", "暂无", "customer-detail"]);
  const relations = ["全部", "潜在", "跟进中", "已成交", "已流失"];
  const filteredRows = filterRows(customerRows, 5, state.customerRelationFilter);
  return mobileFrame({
    title: "客户", subtitle: "按最近沟通排序", nav: "customers",
    action: `<button class="mobile-icon-button" type="button" data-action="start-customer-create" title="新增客户" aria-label="新增客户">+</button>`,
    body: `<div class="search-row"><input id="customerSearch" class="search-box" type="search" placeholder="搜索客户、简称或联系人" aria-label="搜索客户"><button class="icon-button" type="button" data-action="toggle-filters" data-scope="customer" title="筛选" aria-label="${state.customerFiltersOpen ? "收起筛选" : "展开筛选"}" aria-expanded="${state.customerFiltersOpen}">≡</button></div>
      ${state.customerFiltersOpen ? `<div class="filter-panel"><div class="filter-scope"><span>当前业务线</span><strong>制造业务</strong></div><strong class="filter-label">按该业务线的合作关系筛选</strong><div class="filter-row">${relations.map((relation) => `<button class="chip ${state.customerRelationFilter === relation ? "active" : ""}" type="button" data-action="set-customer-filter" data-value="${relation}" aria-pressed="${state.customerRelationFilter === relation}">${relation}</button>`).join("")}</div></div>` : ""}
      <div class="section-heading"><h3>客户列表</h3><span>按最近沟通</span></div>
      ${filteredRows.length ? `<div class="list-panel">${filteredRows.map((row) => customerRow(...row)).join("")}</div><div class="notice" data-search-empty hidden>没有找到匹配客户。</div>` : `<div class="notice">当前合作关系下没有客户。</div>`}
      `
  });
}

function customerRow(initial, name, contact, city, businessLine, relation, recent, screen) {
  return `<button class="customer-card" type="button" data-action="select-customer" data-customer="${name}" data-search-row data-search-text="${name} ${contact}"><span class="avatar">${initial}</span><span class="customer-copy"><strong>${name}</strong><span>${contact}<br>${city} · ${businessLine} / ${relation}</span></span><span class="customer-meta"><small>${recent}沟通</small></span></button>`;
}

function dedupeScreen() {
  const strong = state.dedupeStage === "strong";
  return mobileFrame({
    title: "发现重复客户", subtitle: "保存前后台校验", back: "customer-form",
    body: `${strong ? `<div class="notice danger">系统识别到相同企业，不能重复新增。请打开已有客户或返回修改企业全称。</div>` : `<div class="notice warning">系统发现 2 个名称近似客户。请先判断是否为同一企业。</div>`}
      <div class="list-panel">
        <button class="customer-card" type="button" data-action="select-duplicate" data-customer="华东智造科技有限公司"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span><b class="match-reason">${strong ? "信用代码一致" : "名称高度相似 · 联系人王磊相同"}</b><br>智能制造 · 上海浦东 · 021-5588****</span></span><span class="item-action">打开 ›</span></button>
        ${strong ? "" : `<button class="customer-card" type="button" data-action="select-duplicate" data-customer="华东智造装备（苏州）"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造装备（苏州）</strong><span><b class="match-reason">名称包含“华东智造”</b><br>工业设备 · 苏州园区</span></span><span class="item-action">打开 ›</span></button>`}
      </div>
      ${strong ? `<button class="secondary-button full-button" type="button" data-screen="customer-form">返回修改企业全称</button>` : state.dedupeOverrideOpen ? `<div class="glass-panel"><span class="field-label">选择继续新增原因</span><div class="filter-row">${["独立法人主体", "不同地区分公司", "名称相似但主体不同"].map((reason) => `<button class="chip ${state.dedupeOverrideReason === reason ? "active" : ""}" type="button" data-action="set-override-reason" data-value="${reason}">${reason === "名称相似但主体不同" ? "主体不同" : reason}</button>`).join("")}</div><label class="field"><span>补充说明（选填）</span><textarea id="overrideReason" maxlength="500" placeholder="必要时补充说明"></textarea></label>${state.dedupeError ? `<span class="field-error">${escapeHtml(state.dedupeError)}</span>` : ""}<button class="primary-button full-button" type="button" data-action="confirm-override">确认原因并保存客户</button></div>` : `<div class="button-row"><button class="secondary-button" type="button" data-screen="customer-form">返回修改</button><button class="primary-button" type="button" data-action="continue-new">仍要新增</button></div>`}`
  });
}

function customerFormScreen() {
  const createMode = state.customerFormMode === "create";
  return mobileFrame({
    title: createMode ? "新增客户" : "编辑客户", subtitle: createMode ? "先完成最小建档，资料可稍后补充" : "维护客户客观资料", back: "customers",
    body: `${state.customerFormError ? `<div class="notice danger">${escapeHtml(state.customerFormError)}</div>` : ""}
      <details class="form-section" open><summary>基础信息 <span class="status-chip formal">1 项必填</span></summary><div class="form-body">
        <label class="field ${state.customerFormError ? "has-error" : ""}"><span>企业全称 <em>*</em></span><div class="field-action-row"><input id="customerName" maxlength="200" value="${escapeHtml(state.customerName)}"><button class="secondary-button field-action-button" type="button" data-action="check-customer-duplicate">查重</button></div>${state.customerDedupeStatus === "clear" ? `<small class="dedupe-success" data-dedupe-status>暂未发现近似客户，保存时将再次校验 <strong>✓</strong></small>` : ""}</label>
        <label class="field"><span>企业简称</span><input id="customerShortName" value="${escapeHtml(state.customerShortName)}" placeholder="选填，便于搜索和识别"></label>
        <label class="field"><span>制造业务合作关系</span><select id="customerRelation"><option ${state.customerRelation === "潜在" ? "selected" : ""}>潜在</option><option ${state.customerRelation === "跟进中" ? "selected" : ""}>跟进中</option><option ${state.customerRelation === "已成交" ? "selected" : ""}>已成交</option><option ${state.customerRelation === "已流失" ? "selected" : ""}>已流失</option></select></label>
      </div></details>
      <details class="form-section"><summary>${createMode ? "联系人（选填）" : "联系人"}</summary><div class="form-body"><label class="field"><span>姓名</span><input id="customerContactName" placeholder="不知道可留空" value="${escapeHtml(state.customerContactName)}"></label>${createMode ? "" : `<div class="field-grid"><label class="field"><span>部门</span><input value="运营部"></label><label class="field"><span>职位</span><input value="运营经理"></label></div>`}</div></details>
      ${createMode ? "" : `<details class="form-section"><summary>客观资料与工商信息</summary><div class="form-body"><div class="field-grid"><label class="field"><span>企业性质</span><select><option>未知</option><option>民营企业</option></select></label><label class="field"><span>员工人数</span><input type="number" placeholder="未知留空"></label></div><label class="field"><span>统一社会信用代码（选填）</span><input placeholder="不清楚可留空"><small class="field-hint">仅用于精确识别同名企业。</small></label><label class="field"><span>官网</span><input type="url" placeholder="https://"></label></div></details><details class="form-section"><summary>地址与内部归属</summary><div class="form-body"><label class="field"><span>主地址</span><input placeholder="未知可留空"></label><div class="notice">内部负责人按业务线维护。</div></div></details>`}`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="customers">取消</button><button class="primary-button" type="button" data-action="save-customer"><span class="confirm-dot"></span>保存客户</button></div></div>`
  });
}

function customerDetailScreen() {
  const tabs = [
    ["overview", "概览"], ["contacts", "联系人"], ["timeline", "沟通记录"]
  ];
  const content = {
    overview: `<div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>企业简称</dt><dd>${escapeHtml(state.customerShortName || state.customerName.replace(/有限公司$/, ""))}</dd></div><div class="fact-row"><dt>客户编码</dt><dd>C-20260821017</dd></div><div class="fact-row"><dt>行业</dt><dd>${state.customerMinimalProfile ? "待补充" : "智能制造 / 工业设备"}</dd></div></dl></div><details class="form-section"><summary>地址</summary><div class="form-body">${state.customerMinimalProfile ? `<div class="notice">暂未填写地址。</div>` : `<div class="fact-row"><dt>主地址</dt><dd>上海市浦东新区张江路 88 号</dd></div>`}<button class="text-button" type="button" data-action="add-detail-subobject" data-kind="address">+ 添加地址</button></div></details><details class="form-section"><summary>业务线与内部负责人</summary><div class="form-body"><div class="fact-row"><dt>制造业务</dt><dd><span class="status-chip draft">${escapeHtml(state.customerRelation)}</span></dd></div>${state.customerMinimalProfile ? "" : `<div class="fact-row"><dt>数字化服务</dt><dd><span class="status-chip formal">已成交</span></dd></div>`}<div class="system-item"><span class="avatar compact-avatar">张</span><span class="system-copy"><strong>张雨 · 客户经理</strong><span>制造业务 · 华东销售部</span></span></div></div></details>`,
    contacts: `${state.customerMinimalProfile ? (state.customerContactName ? `<div class="list-panel"><div class="customer-card"><span class="avatar">${escapeHtml(state.customerContactName.slice(0, 1))}</span><span class="customer-copy"><strong>${escapeHtml(state.customerContactName)}</strong><span>其他资料待补充</span></span></div></div>` : `<div class="notice">暂未添加联系人。</div>`) : `<div class="list-panel"><div class="customer-card"><span class="avatar">王</span><span class="customer-copy"><strong>王磊</strong><span>采购部 · 采购总监<br>138****6621 · wang***@example.com</span></span></div><div class="customer-card"><span class="avatar">周</span><span class="customer-copy"><strong>周宁</strong><span>信息化部 · 项目经理<br>zhou***@example.com</span></span></div></div>`}<button class="secondary-button full-button" type="button" data-action="add-detail-subobject" data-kind="contact">新增联系人</button>`,
    timeline: `<div class="glass-panel"><div class="timeline">${state.createdRecord && state.createdRecord.customer === state.customerName ? `<div class="timeline-item"><strong>${escapeHtml(state.createdRecord.subject)}</strong><span>${escapeHtml(state.createdRecord.time)} · ${escapeHtml(state.createdRecord.channel)} · 正式记录</span></div>` : ""}<div class="timeline-item"><strong>实施周期与报价方案沟通</strong><span>8 月 21 日 14:20 · 电话 · 正式记录</span></div><div class="timeline-item"><strong>工厂现场需求访谈</strong><span>8 月 12 日 10:00 · 拜访 · 正式记录</span></div></div></div>`
  }[state.customerTab];
  return mobileFrame({
    title: "客户详情", subtitle: "事实资料与沟通历史", back: "customers",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>上海 · 智能制造</span></span><span class="status-chip draft">${escapeHtml(state.customerRelation)}</span></div><div class="button-row equal"><button class="secondary-button" type="button" data-action="edit-customer">编辑资料</button><button class="primary-button" type="button" data-screen="manual-record">+ 新增沟通</button></div></div>
      <div class="tab-row">${tabs.map(([id, label]) => `<button class="tab-button ${state.customerTab === id ? "active" : ""}" type="button" data-action="set-customer-tab" data-tab="${id}">${label}</button>`).join("")}</div>${content}`
  });
}

function manualRecordScreen() {
  return mobileFrame({
    title: "新增沟通记录", subtitle: "手工录入不依赖 AI", back: "records",
    body: `<div class="mobile-segmented"><button class="segment-button active" type="button">手工录入</button><button class="segment-button" type="button" data-screen="ai-material">AI 整理材料</button></div>
      ${Object.values(state.manualErrors).length ? `<div class="notice danger">请修正标记的正式必填字段。</div>` : ""}
      <div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>当前客户 · 可更换</span></span><button class="text-button" type="button" data-action="change-customer">更换 ›</button></div>${state.customerPickerOpen ? `<div class="customer-picker"><button type="button" data-action="choose-record-customer" data-customer="华东智造科技">华东智造科技</button><button type="button" data-action="choose-record-customer" data-customer="远见数字供应链">远见数字供应链</button></div>` : ""}<div class="filter-row"><button class="chip active" type="button">制造业务</button><button class="chip" type="button">数字化服务</button></div></div>
      <div class="glass-panel"><div class="field-grid"><label class="field ${state.manualErrors.time ? "has-error" : ""}" style="margin-top:0"><span>沟通时间 <em>*</em></span><input id="manualTime" value="${escapeHtml(state.manualTime)}">${state.manualErrors.time ? `<small class="field-error">${escapeHtml(state.manualErrors.time)}</small>` : ""}</label><label class="field ${state.manualErrors.channel ? "has-error" : ""}" style="margin-top:0"><span>渠道 <em>*</em></span><select id="manualChannel"><option value="">请选择</option><option ${state.manualChannel === "电话" ? "selected" : ""}>电话</option><option ${state.manualChannel === "拜访" ? "selected" : ""}>拜访</option><option ${state.manualChannel === "线上会议" ? "selected" : ""}>线上会议</option></select>${state.manualErrors.channel ? `<small class="field-error">${escapeHtml(state.manualErrors.channel)}</small>` : ""}</label></div>
        <label class="field ${state.manualErrors.content ? "has-error" : ""}"><span>沟通正文 <em>*</em></span><textarea id="recordContent">${escapeHtml(state.recordContent)}</textarea>${state.manualErrors.content ? `<small class="field-error">${escapeHtml(state.manualErrors.content)}</small>` : ""}</label>
      </div>
      <details class="form-section"><summary>主题、时长与地点</summary><div class="form-body"><label class="field"><span>主题</span><input id="manualSubject" value="${escapeHtml(state.manualSubject)}"></label><div class="field-grid"><label class="field"><span>时长（分钟）</span><input type="number" value="35"></label><label class="field"><span>地点</span><input placeholder="未知留空"></label></div></div></details>
      <details class="form-section"><summary>双方参与人 <span>分侧记录</span></summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">陈晓</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label></div></details>
      <details class="form-section"><summary>本次结论与附件</summary><div class="form-body"><label class="field"><span>本次结论</span><textarea id="manualConclusion">${escapeHtml(state.manualConclusion)}</textarea></label><label class="upload-zone" for="manualAttachment"><input class="file-input" id="manualAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.attachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>单文件 50 MB，最多 10 个；正式提交前须扫描通过</span></span></label></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-manual-draft">保存草稿</button><button class="primary-button" type="button" data-action="save-manual-formal"><span class="confirm-dot"></span>保存正式记录</button></div></div>`
  });
}

function recordsScreen() {
  const recordRows = [
    ["8 月 21 日 14:20", "华东智造科技", "电话", "制造业务", "实施周期与报价方案沟通", "张雨、李程 / 王磊", "record-detail"],
    ["8 月 18 日 09:30", "远见数字供应链", "线上会议", "数字化服务", "数据接口范围确认", "张雨 / 陈嘉", "record-detail"],
    ["8 月 12 日 10:00", "华东智造科技", "拜访", "制造业务", "工厂现场需求访谈", "张雨、李程 / 王磊、周宁", "record-detail"]
  ];
  if (state.createdRecord) recordRows.unshift([state.createdRecord.time, state.createdRecord.customer, state.createdRecord.channel, "制造业务", state.createdRecord.subject, "张雨 / 客户联系人", "record-detail"]);
  if (state.restored["inactive-record"]) recordRows.push(["8 月 5 日 15:10", "华东智造科技", "电话", "制造业务", "旧版报价口径沟通", "张雨 / 王磊", "record-detail"]);
  const channels = ["全部", "电话", "拜访", "线上会议"];
  const visibleRows = state.archivedRecord
    ? recordRows.filter((row) => row[4] !== state.archivedRecord.subject)
    : recordRows;
  const filteredRows = filterRows(visibleRows, 2, state.recordChannelFilter);
  return mobileFrame({
    title: "沟通记录", subtitle: "正式记录 · 时间倒序", nav: "records",
    action: `<button class="mobile-icon-button" type="button" data-screen="manual-record" title="新增沟通记录" aria-label="新增沟通记录">+</button>`,
    body: `<div class="search-row"><input id="recordSearch" class="search-box" type="search" placeholder="搜索客户或主题" aria-label="搜索沟通记录"><button class="icon-button" type="button" data-action="toggle-filters" data-scope="record" title="筛选" aria-label="${state.recordFiltersOpen ? "收起筛选" : "展开筛选"}" aria-expanded="${state.recordFiltersOpen}">≡</button></div>
      ${state.recordFiltersOpen ? `<div class="filter-panel"><strong class="filter-label">按沟通渠道筛选</strong><div class="filter-row">${channels.map((channel) => `<button class="chip ${state.recordChannelFilter === channel ? "active" : ""}" type="button" data-action="set-record-filter" data-value="${channel}" aria-pressed="${state.recordChannelFilter === channel}">${channel}</button>`).join("")}</div></div>` : ""}
      <button class="notice" type="button" data-action="open-ready-draft" style="width:100%;border:0;text-align:left">沟通草稿 · 2 条待继续编辑或确认 ›</button>
      <div class="section-heading"><h3>正式记录</h3><span>时间倒序</span></div>
      ${filteredRows.length ? `<div class="list-panel">${filteredRows.map((row) => recordRow(...row)).join("")}</div><div class="notice" data-search-empty hidden>没有找到匹配记录。</div>` : `<div class="notice">当前沟通渠道下没有记录。</div>`}`
  });
}

function recordRow(time, customer, channel, businessLine, subject, people, screen) {
  return `<button class="record-row" type="button" data-action="select-record" data-customer="${customer}" data-time="${time}" data-channel="${channel}" data-subject="${subject}" data-search-row data-search-text="${customer} ${subject}"><span class="record-row-top"><strong>${customer}</strong><span class="status-chip formal">正式</span></span><p>${subject}</p><small>${time} · ${channel} · ${businessLine}<br>参与人：${people}</small></button>`;
}

function recordDetailScreen() {
  return mobileFrame({
    title: "沟通详情", subtitle: `正式记录 · 版本 ${state.recordVersion}`, back: "records",
    body: `<div class="notice success">正式记录 · 版本 ${state.recordVersion}</div>
      <div class="glass-panel"><div class="section-heading"><h3>${escapeHtml(state.recordSnapshot.subject)}</h3><span>${escapeHtml(state.recordSnapshot.channel)}</span></div><dl class="fact-list"><div class="fact-row"><dt>客户</dt><dd>${escapeHtml(state.recordSnapshot.customer)}</dd></div><div class="fact-row"><dt>实际时间</dt><dd>${escapeHtml(state.recordSnapshot.time)}</dd></div><div class="fact-row"><dt>业务线</dt><dd>制造业务</dd></div><div class="fact-row"><dt>时长</dt><dd>35 分钟</dd></div></dl></div>
      <div class="glass-panel"><div class="section-heading"><h3>沟通正文</h3><span>人工确认</span></div><p class="record-body">${escapeHtml(state.recordSnapshot.content)}</p><div class="section-heading" style="margin-top:14px"><h3>本次结论</h3></div><p class="record-conclusion">${escapeHtml(state.recordConclusion)}</p></div>
      <details class="form-section" open><summary>参与人快照</summary><div class="form-body"><div class="fact-row"><dt>我方</dt><dd>张雨、李程${state.extraInternalParticipant ? "、陈晓" : ""}</dd></div><div class="fact-row"><dt>客户方</dt><dd>王磊${state.extraCustomerParticipant || state.recordSupplementParticipantAdded ? "、临时联系人" : ""}</dd></div></div></details>
      <details class="form-section"><summary>附件与来源</summary><div class="form-body">${state.selectedRecordIsExisting ? `<div class="system-item"><span class="item-dot success"></span><span class="system-copy"><strong>报价方案-v3.pdf</strong><span>原记录附件 · 安全扫描通过</span></span><span class="item-action">查看</span></div>` : state.attachmentAdded ? `<div class="system-item"><span class="item-dot success"></span><span class="system-copy"><strong>已上传附件</strong><span>正式创建时上传 · 安全扫描通过</span></span><span class="item-action">查看</span></div>` : ""}${state.recordSupplementAttachmentAdded ? `<div class="system-item"><span class="item-dot success"></span><span class="system-copy"><strong>补充附件</strong><span>补录遗漏信息时上传 · 安全扫描通过</span></span><span class="item-action">查看</span></div>` : ""}${!state.selectedRecordIsExisting && !state.attachmentAdded && !state.recordSupplementAttachmentAdded ? `<div class="notice">暂无附件。</div>` : ""}</div></details>
      <details class="form-section"><summary>版本与审计</summary><div class="form-body"><div class="timeline">${state.recordVersion > 1 ? `<div class="timeline-item"><strong>版本 ${state.recordVersion} · 补充遗漏信息</strong><span>张雨 · 8 月 26 日 10:20 · 手工补充</span></div>` : ""}${state.selectedRecordIsExisting ? `<div class="timeline-item"><strong>版本 1 · 正式创建</strong><span>张雨 · 8 月 21 日 15:02 · 手工录入</span></div>` : `<div class="timeline-item"><strong>版本 1 · 正式创建</strong><span>张雨 · 刚刚 · 手工录入</span></div>`}</div></div></details>
      <button class="primary-button full-button" type="button" data-action="open-supplement">补充记录</button><details class="form-section secondary-actions"><summary>更多操作</summary><div class="form-body"><button class="danger-button full-button" type="button" data-action="open-record-deactivate">归档记录</button></div></details>`
  });
}

function aiMaterialScreen() {
  const content = state.materialMode === "text"
    ? `<label class="field"><span>原始文本 <em>*</em></span><textarea id="materialText" style="min-height:150px">${escapeHtml(state.materialText)}</textarea></label>`
    : `<label class="upload-zone" for="materialFile"><input class="file-input" id="materialFile" type="file" accept="${state.materialMode === "audio" ? ".m4a,.mp3,.wav" : ".pdf,.docx,.txt"}"><span><strong>${state.materialFile ? escapeHtml(state.materialFile) : `+ 选择${state.materialMode === "audio" ? "音频" : "会议纪要"}文件`}</strong><span>${state.materialMode === "audio" ? "M4A / MP3 / WAV，单文件不超过 50 MB" : "PDF / DOCX / TXT，上传后先安全扫描"}</span></span></label>`;
  return mobileFrame({
    title: "AI 整理材料", subtitle: "只生成未确认草稿", back: "workbench",
    body: `<div class="notice warning">原始材料将先安全保存。AI 不会自动写入正式沟通记录。</div>${state.materialError ? `<div class="notice danger">${escapeHtml(state.materialError)}</div>` : ""}
      <div class="mobile-segmented"><button class="segment-button ${state.materialMode === "text" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="text">直接文本</button><button class="segment-button ${state.materialMode === "audio" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="audio">音频文件</button><button class="segment-button ${state.materialMode === "document" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="document">会议纪要</button></div>
      <div class="glass-panel">${content}</div>
      <div class="screen-actions"><button class="primary-button full-button" type="button" data-action="start-ai"><span class="confirm-dot"></span>保存材料并开始处理</button></div>`
  });
}

function aiProcessingScreen() {
  if (state.processState === "failed") {
    return mobileFrame({
      title: "处理失败", subtitle: "原始材料已保留", back: "ai-material",
      body: `<div class="notice danger">暂时无法整理这份材料，原始内容已经安全保留。</div><div class="glass-panel"><div class="process-steps"><div class="process-step done"><span class="step-node">✓</span><span><strong>材料已保存</strong><span>可以随时回来继续</span></span><small>完成</small></div><div class="process-step done"><span class="step-node">✓</span><span><strong>内容已准备</strong><span>文字内容可以读取</span></span><small>完成</small></div><div class="process-step"><span class="step-node">!</span><span><strong>整理沟通信息</strong><span>本次处理未完成</span></span><small>失败</small></div></div></div><div class="button-row equal"><button class="secondary-button" type="button" data-screen="manual-record">转手工录入</button><button class="primary-button" type="button" data-action="retry-process">重新处理</button></div>`
    });
  }
  if (state.processState === "needs-customer") {
    return mobileFrame({
      title: "确认客户", subtitle: "发现多个所属企业范围内候选", back: "ai-material",
      body: `<div class="notice warning">材料中的“华东智造”无法唯一匹配。选择前不会生成可确认草稿。</div><div class="list-panel"><button class="customer-card" type="button" data-action="choose-ai-customer" data-customer="华东智造科技有限公司"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span>上海 · 智能制造<br>材料命中：华东智造、王磊</span></span><span class="item-action">选择 ›</span></button><button class="customer-card" type="button" data-action="choose-ai-customer" data-customer="华东智造装备（苏州）"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造装备（苏州）</strong><span>苏州 · 工业设备<br>材料命中：华东智造</span></span><span class="item-action">选择 ›</span></button></div><div class="button-row equal"><button class="secondary-button" type="button" data-action="open-dedupe-candidate">搜索 / 新建客户</button><button class="secondary-button" type="button" data-screen="ai-material">取消处理</button></div>`
    });
  }
  return mobileFrame({
    title: "材料处理中", subtitle: "离开页面后任务继续", back: "workbench",
    body: `<div class="glass-panel"><div class="process-steps"><div class="process-step done"><span class="step-node">✓</span><span><strong>材料已保存</strong><span>离开页面也不会丢失</span></span><small>完成</small></div><div class="process-step done"><span class="step-node">✓</span><span><strong>内容已准备</strong><span>文字内容可以读取</span></span><small>完成</small></div><div class="process-step active"><span class="step-node">3</span><span><strong>整理沟通信息</strong><span>正在识别客户、时间和正文</span></span><small>处理中</small></div><div class="process-step"><span class="step-node">4</span><span><strong>确认所属客户</strong><span>等待整理结果</span></span><small>等待</small></div></div></div><div class="notice">整理完成后仍需你确认，不会自动生成正式记录。</div><button class="primary-button full-button" type="button" data-action="process-next">查看整理结果</button>`
  });
}

function aiReviewScreen() {
  const fields = [
    ["customer", "客户", "原文提到“华东智造”和联系人王磊", false],
    ["time", "实际时间", "原文：8 月 21 日下午", false],
    ["channel", "渠道", "原文：电话沟通", false],
    ["subject", "主题", "主题由正文概括，建议重点核对", true],
    ["content", "沟通正文", "来自原文主要沟通内容", false]
  ];
  const aiReady = state.processState === "ready" && state.aiDraftStatus === "ready";
  return mobileFrame({
    title: "审核 AI 草稿", subtitle: "待人工确认", back: "workbench",
    body: `<div class="notice warning"><strong>未确认草稿</strong><br>修改并明确确认前，不进入正式沟通记录。</div>${!aiReady ? `<div class="notice danger">材料尚未整理完成，暂时不能确认。</div>` : ""}${state.aiError ? `<div class="notice danger">${escapeHtml(state.aiError)}</div>` : ""}<div class="notice review-focus">建议重点核对：主题</div>
      <div class="glass-panel">${fields.map(([id, label, evidence, needsReview]) => `<div class="ai-field ${needsReview ? "needs-review" : ""}"><div class="ai-field-head"><label for="ai-${id}"><strong>${label}${["customer","time","channel","content"].includes(id) ? " *" : ""}</strong></label>${needsReview ? `<span class="source-chip warning">建议核对</span>` : ""}</div>${id === "customer" ? `<select id="ai-${id}" data-ai-field="${id}" aria-label="${label}"><option>${escapeHtml(state.aiDraft[id])}</option><option>华东智造装备（苏州）</option></select>` : id === "content" ? `<textarea id="ai-${id}" data-ai-field="${id}" aria-label="${label}">${escapeHtml(state.aiDraft[id])}</textarea>` : `<input id="ai-${id}" data-ai-field="${id}" aria-label="${label}" value="${escapeHtml(state.aiDraft[id])}">`}<button class="evidence-toggle" type="button" data-action="toggle-evidence" data-field="${id}">${state.evidenceOpen[id] ? "收起原文 −" : "查看原文 +"}</button>${state.evidenceOpen[id] ? `<div class="evidence">${evidence}</div>` : ""}</div>`).join("")}</div>
      <details class="form-section"><summary>参与人候选与本次结论</summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">临时姓名</button></div></label><label class="field"><span>本次结论</span><textarea>约定下周继续沟通具体实施安排。</textarea></label></div></details>
      `,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-ai-draft">保存草稿</button><button class="primary-button" type="button" data-action="confirm-ai" ${aiReady ? "" : "disabled"}><span class="confirm-dot"></span>确认正式记录</button></div><button class="text-button full-button" type="button" data-action="abandon-ai">放弃草稿</button></div>`
  });
}

function versionDiffScreen() {
  return mobileFrame({
    title: "补充沟通记录", subtitle: `补录遗漏信息 · 当前版本 ${state.recordVersion}`, back: "record-detail",
    body: `<div class="notice">想起遗漏内容时在这里补充。保存后生成版本 ${state.recordVersion + 1}，当前版本保持不变。</div><div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>客户</dt><dd>${escapeHtml(state.recordSnapshot.customer)}</dd></div><div class="fact-row"><dt>沟通时间</dt><dd>${escapeHtml(state.recordSnapshot.time)}</dd></div><div class="fact-row"><dt>当前主题</dt><dd>${escapeHtml(state.recordSnapshot.subject)}</dd></div></dl></div><div class="glass-panel"><label class="field" style="margin-top:0"><span>补充沟通正文 <em>*</em></span><textarea id="supplementContent" placeholder="输入上次遗漏的事实">${escapeHtml(state.supplementContent)}</textarea></label><label class="field"><span>补充本次结论</span><textarea id="supplementConclusion" placeholder="如有遗漏结论可补充">${escapeHtml(state.supplementConclusion)}</textarea></label></div><details class="form-section"><summary>补充参与人或附件</summary><div class="form-body"><label class="field"><span>补充客户方参与人</span><div class="filter-row"><button class="chip ${state.supplementParticipantAdded ? "active" : ""}" type="button" data-action="add-participant" data-side="customer">${state.supplementParticipantAdded ? "临时联系人已添加" : "+ 临时姓名"}</button></div></label><label class="upload-zone" for="supplementAttachment"><input class="file-input" id="supplementAttachment" type="file"><span><strong>${state.supplementAttachmentAdded ? "遗漏附件已选择" : "+ 添加遗漏附件"}</strong><span>保存前完成安全扫描</span></span></label></div></details>`,
    sticky: `<div class="screen-actions"><button class="primary-button full-button" type="button" data-action="save-supplement"><span class="confirm-dot"></span>保存为版本 ${state.recordVersion + 1}</button></div>`
  });
}

function governanceScreen() {
  if (state.governanceMode === "deactivate-record") {
    return mobileFrame({
      title: "归档沟通记录", subtitle: `当前记录 · 版本 ${state.recordVersion}`, back: "record-detail",
      body: `<div class="notice warning">归档后从默认列表隐藏，但客户时间线、附件和版本历史仍保留。</div><div class="glass-panel"><div class="identity-strip"><span class="avatar">华</span><span><strong>${escapeHtml(state.recordSnapshot.subject)}</strong><span>${escapeHtml(state.recordSnapshot.customer)} · 正式记录</span></span><span class="status-chip formal">正式</span></div><label class="field"><span>归档原因 <em>*</em></span><textarea id="governanceReason" maxlength="500" placeholder="请填写归档原因">${escapeHtml(state.governanceReason)}</textarea></label></div>`,
      sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="record-detail">取消</button><button class="danger-button" type="button" data-action="confirm-deactivate-record">确认归档</button></div></div>`
    });
  }
  const customerMode = state.governanceType === "customer";
  const currentArchivedRecord = !customerMode ? state.archivedRecord : null;
  const itemId = customerMode ? "inactive-customer" : currentArchivedRecord ? "current-record" : "inactive-record";
  const restored = state.restored[itemId];
  const itemName = customerMode ? "北辰工业系统" : currentArchivedRecord?.subject || "旧版报价口径沟通";
  const itemContext = customerMode ? "客户 · 已归档" : `${currentArchivedRecord?.customer || "华东智造科技"} · 沟通记录`;
  const archiveReason = customerMode ? "企业主体合并，停止新业务使用" : currentArchivedRecord?.reason || "内容重复，保留历史引用";
  const archiveTime = currentArchivedRecord?.archivedAt || "2026-08-18 11:40";
  return mobileFrame({
    title: "归档数据管理", subtitle: "仅管理员可恢复", back: customerMode ? "customers" : "records",
    body: `<div class="mobile-segmented"><button class="segment-button ${customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="customer">已归档客户</button><button class="segment-button ${!customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="record">已归档沟通</button></div>
      ${restored ? `<div class="notice success">对象已恢复到正常列表，操作已写入审计。</div>` : `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${customerMode ? "北" : "华"}</span><span><strong>${escapeHtml(itemName)}</strong><span>${escapeHtml(itemContext)}</span></span><span class="status-chip inactive">已归档</span></div><dl class="fact-list" style="margin-top:10px"><div class="fact-row"><dt>归档原因</dt><dd>${escapeHtml(archiveReason)}</dd></div><div class="fact-row"><dt>操作人</dt><dd>${currentArchivedRecord ? "张雨" : "陈管理员"}</dd></div><div class="fact-row"><dt>归档时间</dt><dd>${escapeHtml(archiveTime)}</dd></div><div class="fact-row"><dt>历史引用</dt><dd>${customerMode ? "3 位联系人 · 8 条沟通" : "2 个附件 · 版本 1"}</dd></div></dl></div><div class="notice">${customerMode ? "联系人、地址、业务线关系、沟通和附件仍保留；普通用户只读。" : "恢复前不可普通编辑；客户历史时间线仍保留此记录。"}</div><button class="primary-button full-button" type="button" data-action="restore-item" data-item="${itemId}">恢复到正常列表</button>`}
      <details class="form-section" style="margin-top:10px"><summary>归档规则</summary><div class="form-body"><ul class="governance-rules"><li>默认列表隐藏已归档对象</li><li>恢复不自动恢复单独归档的关联对象</li><li>不提供物理删除</li></ul></div></details>`
  });
}

function profileScreen() {
  return mobileFrame({
    title: "我的", subtitle: "身份、草稿与会话", nav: "profile",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">张</span><span><strong>张雨</strong><span>海天科技 · 华东销售部</span></span><span class="status-chip formal">销售人员</span></div></div><div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>所属企业</dt><dd>海天科技</dd></div><div class="fact-row"><dt>组织范围</dt><dd>华东销售部</dd></div><div class="fact-row"><dt>数据权限</dt><dd>本人创建或内部负责客户</dd></div></dl></div><div class="list-panel"><button class="system-item" type="button" data-action="open-ready-draft"><span class="item-dot warning"></span><span class="system-copy"><strong>沟通草稿</strong><span>2 条待继续编辑或确认</span></span><span class="item-action">查看 ›</span></button></div><button class="danger-button full-button" type="button" data-action="logout">退出登录</button>`
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
  state.manualConclusion = document.querySelector("#manualConclusion")?.value.trim() ?? state.manualConclusion;
}

function captureCustomerForm() {
  state.customerName = document.querySelector("#customerName")?.value.trim() ?? state.customerName;
  state.customerShortName = document.querySelector("#customerShortName")?.value.trim() ?? state.customerShortName;
  state.customerRelation = document.querySelector("#customerRelation")?.value ?? state.customerRelation;
  state.customerContactName = document.querySelector("#customerContactName")?.value.trim() ?? state.customerContactName;
}

function captureSupplementForm() {
  state.supplementContent = document.querySelector("#supplementContent")?.value.trim() ?? state.supplementContent;
  state.supplementConclusion = document.querySelector("#supplementConclusion")?.value.trim() ?? state.supplementConclusion;
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
}

function handleAction(target, action) {
  if (action === "open-ready-draft") {
    state.processState = "ready";
    state.aiDraftStatus = "ready";
    state.aiError = "";
    navigate("ai-review");
    return;
  }
  if (action === "open-dedupe-candidate") {
    state.customerName = "华东智造";
    state.customerShortName = "华东智造";
    state.customerFormMode = "create";
    state.dedupeStage = "candidate";
    state.dedupeOverrideOpen = false;
    state.dedupeOverrideReason = "";
    state.dedupeOverrideApproved = false;
    state.dedupeError = "";
    navigate("dedupe");
    return;
  }
  if (action === "select-customer") {
    const profiles = {
      "华东智造科技": ["华东智造", "跟进中", "王磊"],
      "远见数字供应链": ["远见供应链", "潜在", "陈嘉"],
      "新港工业设备": ["新港工业", "已成交", ""],
      "澄海精密制造": ["澄海精密", "已流失", "赵敏"],
      "北辰工业系统": ["北辰工业", "潜在", ""]
    };
    state.customerName = target.dataset.customer || "华东智造科技";
    [state.customerShortName, state.customerRelation, state.customerContactName] = profiles[state.customerName] || [state.customerName, "潜在", ""];
    state.customerMinimalProfile = false;
    state.customerFormMode = "edit";
    state.customerTab = "overview";
    navigate("customer-detail");
    return;
  }
  if (action === "select-record") {
    const selectedCreatedRecord = state.createdRecord && target.dataset.subject === state.createdRecord.subject && target.dataset.customer === state.createdRecord.customer;
    const selectedSupplementedRecord = state.supplementedRecord && target.dataset.subject === state.supplementedRecord.subject && target.dataset.customer === state.supplementedRecord.customer;
    const knownContent = {
      "实施周期与报价方案沟通": "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
      "数据接口范围确认": "双方确认首期对接客户、订单和库存三类数据，具体字段由技术人员进一步核对。",
      "工厂现场需求访谈": "现场走访生产与仓储环节，记录设备联网和工单流转现状。",
      "旧版报价口径沟通": "双方核对了旧版报价的服务范围与计费口径。"
    };
    state.recordSnapshot = selectedCreatedRecord
      ? { ...state.createdRecord }
      : selectedSupplementedRecord
        ? { ...state.supplementedRecord }
      : {
          customer: target.dataset.customer || "华东智造科技",
          time: target.dataset.time || "8 月 21 日 14:20",
          channel: target.dataset.channel || "电话",
          subject: target.dataset.subject || "实施周期与报价方案沟通",
          content: knownContent[target.dataset.subject] || "已记录本次沟通的客观事实。"
        };
    state.recordConclusion = selectedCreatedRecord
      ? state.createdRecord.conclusion || "暂未填写本次结论。"
      : selectedSupplementedRecord?.conclusion || "双方已确认本次沟通内容。";
    state.selectedRecordIsExisting = !selectedCreatedRecord;
    state.recordVersion = selectedCreatedRecord
      ? state.createdRecord.version || 1
      : selectedSupplementedRecord?.version || (state.recordSnapshot.subject === "实施周期与报价方案沟通" ? 2 : 1);
    state.recordSupplementAttachmentAdded = Boolean(selectedCreatedRecord?.supplementAttachmentAdded || selectedSupplementedRecord?.supplementAttachmentAdded);
    state.recordSupplementParticipantAdded = Boolean(selectedCreatedRecord?.supplementParticipantAdded || selectedSupplementedRecord?.supplementParticipantAdded);
    state.supplementContent = "";
    state.supplementConclusion = "";
    state.supplementAttachmentAdded = false;
    navigate("record-detail");
    return;
  }
  if (action === "toggle-filters") {
    if (target.dataset.scope === "customer") state.customerFiltersOpen = !state.customerFiltersOpen;
    if (target.dataset.scope === "record") state.recordFiltersOpen = !state.recordFiltersOpen;
  }
  if (action === "set-customer-filter") state.customerRelationFilter = target.dataset.value;
  if (action === "set-record-filter") state.recordChannelFilter = target.dataset.value;
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
  if (action === "start-customer-create") {
    state.customerFormMode = "create";
    state.customerName = "";
    state.customerShortName = "";
    state.customerRelation = "潜在";
    state.customerContactName = "";
    state.customerFormError = "";
    state.customerDedupeStatus = "idle";
    state.dedupeStage = "idle";
    state.dedupeOverrideOpen = false;
    navigate("customer-form");
    return;
  }
  if (action === "edit-customer") {
    state.customerFormMode = "edit";
    navigate("customer-form");
    return;
  }
  if (action === "open-governance") {
    state.governanceMode = "list";
    state.governanceType = target.dataset.type;
    navigate("governance");
    return;
  }
  if (action === "continue-new") {
    if (state.dedupeStage === "candidate" && !state.canOverrideDuplicates) state.dedupeError = "当前账号没有继续新增近似客户的权限。";
    else if (state.dedupeStage === "candidate") state.dedupeOverrideOpen = true;
  }
  if (action === "set-override-reason") {
    state.dedupeOverrideReason = target.dataset.value;
  }
  if (action === "select-duplicate") {
    state.customerName = target.dataset.customer;
    state.customerShortName = state.customerName.replace(/有限公司$/, "");
    state.customerRelation = "跟进中";
    state.customerContactName = "王磊";
    state.customerFormMode = "edit";
    state.customerMinimalProfile = false;
    navigate("customer-detail");
    return;
  }
  if (action === "check-customer-duplicate") {
    captureCustomerForm();
    state.customerDedupeStatus = "idle";
    if (state.customerName.length < 2 || state.customerName.length > 200) {
      state.customerFormError = "请先输入 2–200 字的企业全称。";
    } else if (state.customerName === "华东智造科技有限公司") {
      state.customerFormError = "";
      state.dedupeStage = "strong";
      navigate("dedupe");
      return;
    } else if (state.customerName.includes("华东智造")) {
      state.customerFormError = "";
      state.dedupeStage = "candidate";
      state.dedupeOverrideOpen = false;
      navigate("dedupe");
      return;
    } else {
      state.customerFormError = "";
      state.customerDedupeStatus = "clear";
    }
  }
  if (action === "confirm-override") {
    const detail = document.querySelector("#overrideReason")?.value.trim() || "";
    if (!state.dedupeOverrideReason) state.dedupeError = "请选择继续新增原因。";
    else if (detail.length > 500) state.dedupeError = "补充说明不能超过 500 字。";
    else {
      state.dedupeOverrideApproved = true;
      state.customerFormError = "";
      state.customerMinimalProfile = true;
      navigate("customer-detail");
      showToast("客户已保存，继续新增理由已写入审计");
      return;
    }
  }
  if (action === "save-customer") {
    captureCustomerForm();
    if (state.customerName.length < 2 || state.customerName.length > 200) state.customerFormError = "企业全称为必填项，请输入 2–200 字。";
    else if (state.customerFormMode === "create" && state.customerName === "华东智造科技有限公司") {
      state.dedupeStage = "strong";
      navigate("dedupe");
      showToast("后台查重发现相同企业");
      return;
    }
    else if (state.customerFormMode === "create" && state.customerName.includes("华东智造")) {
      state.dedupeStage = "candidate";
      state.dedupeOverrideOpen = false;
      navigate("dedupe");
      showToast("后台查重发现名称近似客户");
      return;
    }
    else {
      state.customerFormError = "";
      state.customerMinimalProfile = state.customerFormMode === "create";
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
    state.customerFormMode = "edit";
    navigate("customer-form");
    showToast("已新增一行，请补齐必填字段后保存");
    return;
  }
  if (action === "change-customer") state.customerPickerOpen = !state.customerPickerOpen;
  if (action === "choose-record-customer") {
    state.customerName = target.dataset.customer;
    state.customerPickerOpen = false;
  }
  if (action === "add-participant") {
    if (state.activeScreen === "version-diff") captureSupplementForm();
    if (state.activeScreen === "version-diff") state.supplementParticipantAdded = true;
    else if (target.dataset.side === "internal") state.extraInternalParticipant = true;
    else if (target.dataset.side === "customer") state.extraCustomerParticipant = true;
  }
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
      state.createdRecord = { ...state.recordSnapshot, conclusion: state.manualConclusion, version: 1 };
      state.recordConclusion = state.manualConclusion || "暂未填写本次结论。";
      state.recordVersion = 1;
      state.selectedRecordIsExisting = false;
      state.supplementContent = "";
      state.supplementConclusion = "";
      state.supplementAttachmentAdded = false;
      state.recordSupplementAttachmentAdded = false;
      state.recordSupplementParticipantAdded = false;
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
  if (action === "open-processing-failure") {
    state.processState = "failed";
    navigate("ai-processing");
    return;
  }
  if (action === "retry-process") state.processState = "processing";
  if (action === "choose-ai-customer") {
    state.aiDraft.customer = target.dataset.customer || "华东智造科技有限公司";
    state.processState = "ready";
    state.aiDraftStatus = "ready";
    navigate("ai-review");
    showToast("客户已确认，生成未确认草稿");
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
      state.aiError = "材料尚未整理完成，暂时不能确认。";
      renderPhone();
      return;
    }
    if (!validateAiDraft()) {
      renderPhone();
      return;
    }
    state.recordSnapshot = { ...state.aiDraft };
    state.createdRecord = { ...state.recordSnapshot, conclusion: "约定下周继续沟通具体实施安排。", version: 1 };
    state.recordConclusion = state.createdRecord.conclusion;
    state.recordVersion = 1;
    state.selectedRecordIsExisting = false;
    state.supplementContent = "";
    state.supplementConclusion = "";
    state.supplementAttachmentAdded = false;
    state.recordSupplementAttachmentAdded = false;
    state.recordSupplementParticipantAdded = false;
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
  if (action === "open-supplement") {
    state.supplementContent = "";
    state.supplementConclusion = "";
    state.supplementAttachmentAdded = false;
    state.supplementParticipantAdded = false;
    navigate("version-diff");
    return;
  }
  if (action === "save-supplement") {
    captureSupplementForm();
    if (!state.supplementContent) {
      showToast("请填写需要补充的沟通内容");
      return;
    }
    state.recordSnapshot.content = `${state.recordSnapshot.content}\n补充：${state.supplementContent}`;
    if (state.supplementConclusion) state.recordConclusion = `${state.recordConclusion}\n补充：${state.supplementConclusion}`;
    state.recordVersion += 1;
    const savedVersion = state.recordVersion;
    state.recordSupplementAttachmentAdded = state.recordSupplementAttachmentAdded || state.supplementAttachmentAdded;
    state.recordSupplementParticipantAdded = state.recordSupplementParticipantAdded || state.supplementParticipantAdded;
    state.supplementedRecord = {
      ...state.recordSnapshot,
      conclusion: state.recordConclusion,
      version: state.recordVersion,
      supplementAttachmentAdded: state.recordSupplementAttachmentAdded,
      supplementParticipantAdded: state.recordSupplementParticipantAdded
    };
    if (state.createdRecord && state.createdRecord.subject === state.recordSnapshot.subject && state.createdRecord.customer === state.recordSnapshot.customer) {
      state.createdRecord = { ...state.supplementedRecord };
    }
    state.supplementContent = "";
    state.supplementConclusion = "";
    state.supplementParticipantAdded = false;
    navigate("record-detail");
    showToast(`补充内容已保存为版本 ${savedVersion}，原版本保持不变`);
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
      showToast("归档原因不能为空");
      return;
    }
    state.archivedRecord = {
      ...state.recordSnapshot,
      reason: state.governanceReason,
      archivedAt: "2026-08-25 10:15"
    };
    state.governanceMode = "list";
    state.governanceType = "record";
    showToast("记录已归档，历史与附件仍保留");
    return;
  }
  if (action === "restore-item") {
    if (target.dataset.item === "current-record") {
      state.archivedRecord = null;
      navigate("records");
      showToast("记录已恢复到正式列表，审计事件已记录");
      return;
    }
    state.restored[target.dataset.item] = true;
    showToast("恢复成功，审计事件已记录");
    return;
  }
  if (action === "logout") showToast("原型模式：未执行真实退出");

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
  if (event.target.id === "materialFile") {
    state.materialFile = event.target.files?.[0]?.name || "";
    state.materialError = "";
    renderPhone();
  }
  if (event.target.id === "manualAttachment") {
    captureManualForm();
    state.attachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
  if (event.target.id === "supplementAttachment") {
    captureSupplementForm();
    state.supplementAttachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "customerName") {
    state.customerDedupeStatus = "idle";
    document.querySelector("[data-dedupe-status]")?.remove();
    return;
  }
  if (!["customerSearch", "recordSearch"].includes(event.target.id)) return;
  const query = event.target.value.trim().toLocaleLowerCase("zh-CN");
  let visible = 0;
  document.querySelectorAll("[data-search-row]").forEach((row) => {
    const matches = row.dataset.searchText.toLocaleLowerCase("zh-CN").includes(query);
    row.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = document.querySelector("[data-search-empty]");
  if (empty) empty.hidden = visible > 0;
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
