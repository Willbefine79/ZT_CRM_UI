"use strict";

const { filterRows } = CrmPrototypeLogic;
const STORAGE_KEY = "zt-crm-review-notes-v1";
const REVIEW_KEY = "zt-crm-review-status-v1";
const BUSINESS_LINES = ["商旅", "会奖服务", "企业用车"];

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
    objective: "在所属企业全量客户中阻止重复建档，同时不泄露销售无权查看的客户资料。",
    reviews: ["正常新增不展示单独查重步骤。", "有权候选展示客观命中依据；无权候选只显示脱敏名称和命中类型。", "无权命中不能直接打开客户，可申请协作或返回修改。"],
    decisions: ["查重范围仅限当前所属企业，不跨企业泄露客户存在性。", "信用代码或企业全称强命中始终阻止重复新增。"]
  },
  {
    id: "customer-form", group: "客户", nav: "客户表单", title: "新增 / 编辑客户",
    refs: ["FR-3 至 FR-6", "字段契约 §3"],
    objective: "按字段字典完整承载客户业务字段，并通过分组折叠控制手机端录入负担。",
    reviews: ["基础信息和业务线直接展示，业务线与合作关系分别选择。", "联系人覆盖姓名、部门、职位、手机号、邮箱和微信。", "客户跟进负责人角色由销售管理员配置，普通销售只选择人员；后端负责人可暂时待分配。"],
    decisions: ["企业资料、工商、公开联系、地址和备注按组折叠，未知值保持为空。", "业绩分配不在客户表单维护，统一在合同阶段确认。"]
  },
  {
    id: "customer-detail", group: "客户", nav: "客户详情", title: "客户详情",
    refs: ["FR-7", "FR-4 至 FR-6"],
    objective: "在同一客户上下文中查看资料、从属结构与正式沟通时间线。",
    reviews: ["一级页签收敛为概览、联系人和沟通，地址与业务线归入概览。", "客户跟进负责人按管理员配置的角色分别展示人员、加入时机和待分配状态。", "新增联系人和新增沟通从当前客户上下文进入。"],
    decisions: ["负责人指派按客户与业务线生效，前端和后端销售可在不同阶段加入。", "单角色组织只配置一个负责人角色，页面结构无需改变。"]
  },
  {
    id: "manual-record", group: "沟通", nav: "手工沟通", title: "新增沟通记录",
    refs: ["FR-8", "字段契约 §4.1", "UJ-2"],
    objective: "在 AI 完全不可用时，独立保存沟通草稿或正式事实。",
    reviews: ["正式必填客户、实际时间、渠道、业务线和正文。", "主题、时长、地点、结论、备注及双方参与人完整覆盖字段字典。", "可选字段与附件折叠，保存操作在小屏仍可达。"],
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
    id: "governance", group: "治理", nav: "我的归档", title: "我的归档",
    refs: ["UJ-5", "FR-3 / FR-9", "FR-14"],
    objective: "让销售查看自己归档的客户和沟通，并在恢复后继续编辑。",
    reviews: ["客户与沟通记录分开查看，只显示本人归档或仍有维护权限的对象。", "归档状态可查看完整资料和历史，但保持只读。", "点击恢复并编辑时先恢复、记录审计，再进入标准编辑页。"],
    decisions: ["不允许直接覆盖归档对象。", "恢复不自动恢复已独立归档的子对象。"]
  },
  {
    id: "profile", group: "治理", nav: "我的", title: "我的",
    refs: ["§7 信息架构", "FR-14 权限"],
    objective: "提供个人与所属企业上下文，集中进入本人草稿和本人归档数据。",
    reviews: ["显示所属企业、用户、角色和组织范围。", "私人草稿入口与正式沟通列表分离。", "我的归档只展示本人归档或仍有维护权限的数据。"],
    decisions: ["销售管理者默认不能看他人私人草稿。", "销售的我的归档不等于管理员全量归档治理。"]
  }
];

const screenById = Object.fromEntries(screens.map((screen) => [screen.id, screen]));

const initialState = () => ({
  activeScreen: "workbench",
  customerFiltersOpen: false,
  recordFiltersOpen: false,
  customerRelationFilter: "全部",
  customerBusinessLineFilter: "商旅",
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
  customerParentName: "",
  customerIndustry: "企业服务 / 商旅管理",
  customerBusinessLine: "商旅",
  customerRelation: "潜在",
  customerContactName: "陈嘉",
  customerContactDepartment: "运营部",
  customerContactTitle: "运营经理",
  customerContactMobile: "138****6621",
  customerContactEmail: "chenjia@example.com",
  customerContactWechat: "chenjia_work",
  customerContactRemark: "",
  customerNature: "民营企业",
  customerEmployeeCount: "",
  customerRevenueRange: "",
  customerListed: "",
  customerSource: "销售自拓",
  customerUscc: "",
  customerRegistrationNo: "",
  customerEstablishedDate: "",
  customerRegisteredCapital: "",
  customerCapitalCurrency: "CNY",
  customerWebsite: "",
  customerOfficialAccount: "",
  customerPublicEmail: "contact@example.com",
  customerMainPhone: "021-5588****",
  customerCountry: "中国",
  customerProvince: "浙江省",
  customerCity: "杭州市",
  customerDetailAddress: "滨江区江南大道 88 号",
  customerRemark: "",
  customerOwnerName: "张雨",
  customerOwnerRole: "销售",
  customerFrontendSales: "张雨",
  customerBackendSales: "李程",
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
    businessLine: "商旅",
    duration: "35",
    location: "",
    subject: "实施周期与报价方案沟通",
    content: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
    conclusion: "约定下周继续沟通具体实施安排。",
    remark: ""
  },
  evidenceOpen: {},
  governanceType: "customer",
  governanceMode: "list",
  governanceScope: "self",
  governanceReason: "",
  dedupeAccessRequested: false,
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
  manualBusinessLine: "商旅",
  manualDuration: "35",
  manualLocation: "",
  manualSubject: "实施周期与报价方案沟通",
  manualConclusion: "双方确认下周继续沟通具体实施安排。",
  manualRemark: "",
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
    businessLine: "商旅",
    duration: "35",
    location: "",
    subject: "实施周期与报价方案沟通",
    content: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
    remark: ""
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
        <button class="system-item" type="button" data-action="select-customer" data-customer="华东智造科技"><span class="item-dot success"></span><span class="system-copy"><strong>华东智造科技</strong><span>上海 · 商旅 / 跟进中</span></span><span class="item-action">客户 ›</span></button>
        <button class="system-item" type="button" data-action="select-record" data-customer="华东智造科技" data-time="8 月 21 日 14:20" data-channel="电话" data-business-line="商旅" data-subject="实施周期与报价方案沟通"><span class="item-dot"></span><span class="system-copy"><strong>实施周期与报价方案沟通</strong><span>电话 · 商旅 · 8 月 21 日 14:20</span></span><span class="item-action">记录 ›</span></button>
      </div>`
  });
}

function customersScreen() {
  const customerRows = [
    ["华", "华东智造科技", "王磊 · 采购总监", "上海", "商旅", "跟进中", "2 天前", "customer-detail"],
    ["远", "远见数字供应链", "陈嘉 · 运营经理", "杭州", "商旅", "潜在", "5 天前", "customer-detail"],
    ["新", "新港工业设备", "暂无联系人", "苏州", "企业用车", "已成交", "8 天前", "customer-detail"],
    ["澄", "澄海精密制造", "赵敏 · 行政经理", "宁波", "会奖服务", "已流失", "21 天前", "customer-detail"]
  ];
  if (state.restored["inactive-customer"]) customerRows.push(["北", "北辰工业系统", "暂无联系人", "北京", "商旅", "潜在", "暂无", "customer-detail"]);
  const relations = ["全部", "潜在", "跟进中", "已成交", "已流失"];
  const lineRows = filterRows(customerRows, 4, state.customerBusinessLineFilter);
  const filteredRows = filterRows(lineRows, 5, state.customerRelationFilter);
  return mobileFrame({
    title: "客户", subtitle: `${state.customerBusinessLineFilter} · 按最近沟通排序`, nav: "customers",
    action: `<button class="mobile-icon-button" type="button" data-action="start-customer-create" title="新增客户" aria-label="新增客户">+</button>`,
    body: `<div class="search-row"><input id="customerSearch" class="search-box" type="search" placeholder="搜索客户、简称或联系人" aria-label="搜索客户"><button class="icon-button" type="button" data-action="toggle-filters" data-scope="customer" title="筛选" aria-label="${state.customerFiltersOpen ? "收起筛选" : "展开筛选"}" aria-expanded="${state.customerFiltersOpen}">≡</button></div>
      ${state.customerFiltersOpen ? `<div class="filter-panel"><strong class="filter-label">选择业务线</strong><div class="filter-row">${BUSINESS_LINES.map((line) => `<button class="chip ${state.customerBusinessLineFilter === line ? "active" : ""}" type="button" data-action="set-customer-line-filter" data-value="${line}" aria-pressed="${state.customerBusinessLineFilter === line}">${line}</button>`).join("")}</div><strong class="filter-label filter-label-spaced">按所选业务线的合作关系筛选</strong><div class="filter-row">${relations.map((relation) => `<button class="chip ${state.customerRelationFilter === relation ? "active" : ""}" type="button" data-action="set-customer-filter" data-value="${relation}" aria-pressed="${state.customerRelationFilter === relation}">${relation}</button>`).join("")}</div></div>` : ""}
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
  const restricted = state.dedupeStage === "restricted";
  if (restricted) {
    return mobileFrame({
      title: "发现已有客户", subtitle: "所属企业全量查重", back: "customer-form",
      body: `<div class="notice warning"><strong>客户已在系统中</strong><br>你暂无该客户的资料权限，系统仅展示查重所需的脱敏结果。</div>
        <div class="glass-panel"><div class="identity-strip"><span class="avatar">远</span><span><strong>远航国际商旅****</strong><span><b class="match-reason">企业全称强命中</b><br>客户详情、联系人、地址和负责人已隐藏</span></span><span class="status-chip inactive">无权限</span></div></div>
        ${state.dedupeAccessRequested ? `<div class="notice success">协作申请已提交给客户负责人和业务管理员。权限未开通前不会重复新增。</div>` : `<div class="notice">强命中客户不允许继续新增。如需跟进，请申请加入该客户的协作范围。</div>`}
        <div class="button-row"><button class="secondary-button" type="button" data-screen="customer-form">返回修改</button><button class="primary-button" type="button" data-action="request-restricted-access" ${state.dedupeAccessRequested ? "disabled" : ""}>${state.dedupeAccessRequested ? "已申请协作" : "申请协作"}</button></div>`
    });
  }
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
    title: createMode ? "新增客户" : "编辑客户", subtitle: "基础与业务线优先，其他资料按需补充", back: "customers",
    body: `${state.customerFormError ? `<div class="notice danger">${escapeHtml(state.customerFormError)}</div>` : ""}
      <details class="form-section" open><summary>基础信息 <span class="status-chip formal">企业全称必填</span></summary><div class="form-body">
        <label class="field ${state.customerFormError ? "has-error" : ""}"><span>企业全称 <em>*</em></span><div class="field-action-row"><input id="customerName" maxlength="200" value="${escapeHtml(state.customerName)}"><button class="secondary-button field-action-button" type="button" data-action="check-customer-duplicate">查重</button></div>${state.customerDedupeStatus === "clear" ? `<small class="dedupe-success" data-dedupe-status>暂未发现近似客户，保存时将再次校验 <strong>✓</strong></small>` : ""}</label>
        <label class="field"><span>企业简称</span><input id="customerShortName" value="${escapeHtml(state.customerShortName)}" placeholder="选填，便于搜索和识别"></label>
        <label class="field"><span>上级客户</span><input id="customerParentName" value="${escapeHtml(state.customerParentName)}" placeholder="集团或母公司，选填"></label>
        <label class="field"><span>行业</span><select id="customerIndustry"><option value="">请选择</option>${["企业服务 / 商旅管理", "制造业", "信息技术", "其他"].map((item) => `<option ${state.customerIndustry === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>
      </div></details>
      <details class="form-section" open><summary>业务线信息 <span class="status-chip formal">明确选择</span></summary><div class="form-body"><div class="field-grid"><label class="field"><span>业务线 <em>*</em></span><select id="customerBusinessLine">${BUSINESS_LINES.map((line) => `<option ${state.customerBusinessLine === line ? "selected" : ""}>${line}</option>`).join("")}</select></label><label class="field"><span>合作关系 <em>*</em></span><select id="customerRelation">${["潜在", "跟进中", "已成交", "已流失"].map((relation) => `<option ${state.customerRelation === relation ? "selected" : ""}>${relation}</option>`).join("")}</select></label></div></div></details>
      <details class="form-section"><summary>${createMode ? "联系人（选填）" : "联系人"} <span>含电话与邮箱</span></summary><div class="form-body"><label class="field"><span>姓名</span><input id="customerContactName" placeholder="不知道可留空" value="${escapeHtml(state.customerContactName)}"></label><div class="field-grid"><label class="field"><span>手机号</span><input id="customerContactMobile" type="tel" value="${escapeHtml(state.customerContactMobile)}" placeholder="如 13800000000"></label><label class="field"><span>微信</span><input id="customerContactWechat" value="${escapeHtml(state.customerContactWechat)}" placeholder="选填"></label><label class="field"><span>部门</span><input id="customerContactDepartment" value="${escapeHtml(state.customerContactDepartment)}" placeholder="选填"></label><label class="field"><span>职位</span><input id="customerContactTitle" value="${escapeHtml(state.customerContactTitle)}" placeholder="客观职位"></label></div><label class="field"><span>邮箱</span><input id="customerContactEmail" type="email" value="${escapeHtml(state.customerContactEmail)}" placeholder="name@example.com"></label><label class="field"><span>联系人备注</span><textarea id="customerContactRemark" placeholder="标准字段之外的简短补充">${escapeHtml(state.customerContactRemark)}</textarea></label></div></details>
      <details class="form-section"><summary>企业规模与来源</summary><div class="form-body"><div class="field-grid"><label class="field"><span>企业性质</span><select id="customerNature"><option value="">未知</option>${["国有企业", "民营企业", "外资企业", "其他"].map((item) => `<option ${state.customerNature === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>客户来源</span><select id="customerSource"><option value="">未知</option>${["销售自拓", "客户转介绍", "市场活动", "其他"].map((item) => `<option ${state.customerSource === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>员工人数</span><input id="customerEmployeeCount" type="number" min="0" value="${escapeHtml(state.customerEmployeeCount)}" placeholder="未知留空"></label><label class="field"><span>营收区间</span><select id="customerRevenueRange"><option value="">未知</option>${["5000 万以下", "5000 万–1 亿", "1 亿–5 亿", "5 亿以上"].map((item) => `<option ${state.customerRevenueRange === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div><label class="field"><span>是否上市</span><select id="customerListed"><option value="">未知</option><option value="是" ${state.customerListed === "是" ? "selected" : ""}>是</option><option value="否" ${state.customerListed === "否" ? "selected" : ""}>否</option></select></label></div></details>
      <details class="form-section"><summary>工商信息</summary><div class="form-body"><label class="field"><span>统一社会信用代码</span><input id="customerUscc" value="${escapeHtml(state.customerUscc)}" placeholder="不清楚可留空"><small class="field-hint">仅用于精确识别同名企业。</small></label><label class="field"><span>工商注册号</span><input id="customerRegistrationNo" value="${escapeHtml(state.customerRegistrationNo)}" placeholder="选填"></label><label class="field"><span>成立日期</span><input id="customerEstablishedDate" type="date" value="${escapeHtml(state.customerEstablishedDate)}"></label><div class="field-grid"><label class="field"><span>注册资本</span><input id="customerRegisteredCapital" type="number" min="0" value="${escapeHtml(state.customerRegisteredCapital)}" placeholder="未知留空"></label><label class="field"><span>币种</span><select id="customerCapitalCurrency">${["CNY", "USD", "HKD"].map((item) => `<option ${state.customerCapitalCurrency === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div></div></details>
      <details class="form-section"><summary>公开联系</summary><div class="form-body"><div class="field-grid"><label class="field"><span>总机电话</span><input id="customerMainPhone" type="tel" value="${escapeHtml(state.customerMainPhone)}" placeholder="区号和分机可保留"></label><label class="field"><span>企业邮箱</span><input id="customerPublicEmail" type="email" value="${escapeHtml(state.customerPublicEmail)}" placeholder="contact@example.com"></label></div><label class="field"><span>官网</span><input id="customerWebsite" type="url" value="${escapeHtml(state.customerWebsite)}" placeholder="https://"></label><label class="field"><span>公众号</span><input id="customerOfficialAccount" value="${escapeHtml(state.customerOfficialAccount)}" placeholder="名称或账号"></label></div></details>
      <details class="form-section"><summary>主地址</summary><div class="form-body"><div class="field-grid"><label class="field"><span>国家</span><input id="customerCountry" value="${escapeHtml(state.customerCountry)}" placeholder="中国"></label><label class="field"><span>省份</span><input id="customerProvince" value="${escapeHtml(state.customerProvince)}" placeholder="选填"></label><label class="field"><span>城市</span><input id="customerCity" value="${escapeHtml(state.customerCity)}" placeholder="选填"></label></div><label class="field"><span>详细地址</span><input id="customerDetailAddress" value="${escapeHtml(state.customerDetailAddress)}" placeholder="街道、门牌号、园区或楼宇"></label></div></details>
      <details class="form-section" open><summary>客户跟进负责人 <span>销售管理员配置</span></summary><div class="form-body"><div class="filter-scope"><span>负责人模式</span><strong>双角色 · ${escapeHtml(state.customerBusinessLine)}</strong></div><div class="collaboration-role-row"><div class="collaboration-role-head"><span><strong>客户拓展</strong><small>前端销售 · 建档时加入</small></span><span class="status-chip formal">建档必填</span></div><label class="field"><span>负责人员</span><select id="customerFrontendSales">${["张雨", "李程", "陈晓"].map((item) => `<option ${state.customerFrontendSales === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div><div class="collaboration-role-row"><div class="collaboration-role-head"><span><strong>方案与合同</strong><small>后端销售 · 可稍后指派</small></span><span class="status-chip draft">建档选填</span></div><label class="field"><span>负责人员</span><select id="customerBackendSales"><option value="">待分配</option>${["李程", "陈晓", "周舟"].map((item) => `<option ${state.customerBackendSales === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div><small class="field-hint">角色名称由销售管理员统一维护；业绩分配在合同阶段单独确认。</small></div></details>
      <details class="form-section"><summary>客户备注</summary><div class="form-body"><label class="field"><span>备注</span><textarea id="customerRemark" maxlength="1000" placeholder="标准字段之外的简短补充">${escapeHtml(state.customerRemark)}</textarea></label></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="customers">取消</button><button class="primary-button" type="button" data-action="save-customer"><span class="confirm-dot"></span>保存客户</button></div></div>`
  });
}

function customerDetailScreen() {
  const tabs = [
    ["overview", "概览"], ["contacts", "联系人"], ["timeline", "沟通记录"]
  ];
  const address = [state.customerCountry, state.customerProvince, state.customerCity, state.customerDetailAddress].filter(Boolean).join(" ");
  const content = {
    overview: `<div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>企业简称</dt><dd>${escapeHtml(state.customerShortName || state.customerName.replace(/有限公司$/, ""))}</dd></div><div class="fact-row"><dt>客户编码</dt><dd>C-20260821017</dd></div><div class="fact-row"><dt>上级客户</dt><dd>${escapeHtml(state.customerParentName || "未设置")}</dd></div><div class="fact-row"><dt>行业</dt><dd>${escapeHtml(state.customerIndustry || "待补充")}</dd></div><div class="fact-row"><dt>客户来源</dt><dd>${escapeHtml(state.customerSource || "待补充")}</dd></div></dl></div><details class="form-section" open><summary>业务线与客户跟进负责人</summary><div class="form-body"><div class="fact-row"><dt>业务线</dt><dd>${escapeHtml(state.customerBusinessLine)}</dd></div><div class="fact-row"><dt>合作关系</dt><dd><span class="status-chip draft">${escapeHtml(state.customerRelation)}</span></dd></div><div class="system-item"><span class="avatar compact-avatar">${escapeHtml(state.customerFrontendSales.slice(0, 1))}</span><span class="system-copy"><strong>${escapeHtml(state.customerFrontendSales)}</strong><span>客户拓展 · 前端销售 · 建档时加入</span></span><span class="status-chip formal">进行中</span></div>${state.customerBackendSales ? `<div class="system-item"><span class="avatar compact-avatar">${escapeHtml(state.customerBackendSales.slice(0, 1))}</span><span class="system-copy"><strong>${escapeHtml(state.customerBackendSales)}</strong><span>方案与合同 · 后端销售 · 8 月 26 日加入</span></span><span class="status-chip formal">已加入</span></div>` : `<div class="system-item"><span class="avatar compact-avatar">待</span><span class="system-copy"><strong>待分配</strong><span>方案与合同 · 后端销售</span></span><button class="text-button" type="button" data-action="assign-backend-sales">指派 ›</button></div>`}</div></details><details class="form-section"><summary>企业与工商资料</summary><div class="form-body"><div class="fact-row"><dt>企业性质</dt><dd>${escapeHtml(state.customerNature || "待补充")}</dd></div><div class="fact-row"><dt>员工人数</dt><dd>${escapeHtml(state.customerEmployeeCount || "待补充")}</dd></div><div class="fact-row"><dt>营收区间</dt><dd>${escapeHtml(state.customerRevenueRange || "待补充")}</dd></div><div class="fact-row"><dt>是否上市</dt><dd>${escapeHtml(state.customerListed || "未知")}</dd></div><div class="fact-row"><dt>信用代码</dt><dd>${escapeHtml(state.customerUscc || "待补充")}</dd></div><div class="fact-row"><dt>成立日期</dt><dd>${escapeHtml(state.customerEstablishedDate || "待补充")}</dd></div><div class="fact-row"><dt>注册资本</dt><dd>${state.customerRegisteredCapital ? `${escapeHtml(state.customerRegisteredCapital)} ${escapeHtml(state.customerCapitalCurrency)}` : "待补充"}</dd></div></div></details><details class="form-section"><summary>公开联系</summary><div class="form-body"><div class="fact-row"><dt>总机电话</dt><dd>${escapeHtml(state.customerMainPhone || "待补充")}</dd></div><div class="fact-row"><dt>企业邮箱</dt><dd>${escapeHtml(state.customerPublicEmail || "待补充")}</dd></div><div class="fact-row"><dt>官网</dt><dd>${escapeHtml(state.customerWebsite || "待补充")}</dd></div><div class="fact-row"><dt>公众号</dt><dd>${escapeHtml(state.customerOfficialAccount || "待补充")}</dd></div></div></details><details class="form-section"><summary>主地址</summary><div class="form-body">${address ? `<div class="fact-row"><dt>地址</dt><dd>${escapeHtml(address)}</dd></div>` : `<div class="notice">暂未填写地址。</div>`}<button class="text-button" type="button" data-action="add-detail-subobject" data-kind="address">+ 添加地址</button></div></details>${state.customerRemark ? `<div class="notice">备注：${escapeHtml(state.customerRemark)}</div>` : ""}`,
    contacts: `${state.customerContactName ? `<div class="list-panel"><div class="customer-card"><span class="avatar">${escapeHtml(state.customerContactName.slice(0, 1))}</span><span class="customer-copy"><strong>${escapeHtml(state.customerContactName)}</strong><span>${escapeHtml([state.customerContactDepartment, state.customerContactTitle].filter(Boolean).join(" · ") || "部门和职位待补充")}<br>${escapeHtml(state.customerContactMobile || "手机号待补充")}${state.customerContactEmail ? ` · ${escapeHtml(state.customerContactEmail)}` : ""}${state.customerContactWechat ? `<br>微信：${escapeHtml(state.customerContactWechat)}` : ""}</span></span></div></div>` : `<div class="notice">暂未添加联系人。</div>`}<button class="secondary-button full-button" type="button" data-action="add-detail-subobject" data-kind="contact">新增联系人</button>`,
    timeline: `<div class="glass-panel"><div class="timeline">${state.createdRecord && state.createdRecord.customer === state.customerName ? `<div class="timeline-item"><strong>${escapeHtml(state.createdRecord.subject)}</strong><span>${escapeHtml(state.createdRecord.time)} · ${escapeHtml(state.createdRecord.channel)} · 正式记录</span></div>` : ""}<div class="timeline-item"><strong>实施周期与报价方案沟通</strong><span>8 月 21 日 14:20 · 电话 · 正式记录</span></div><div class="timeline-item"><strong>工厂现场需求访谈</strong><span>8 月 12 日 10:00 · 拜访 · 正式记录</span></div></div></div>`
  }[state.customerTab];
  return mobileFrame({
    title: "客户详情", subtitle: "事实资料与沟通历史", back: "customers",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>${escapeHtml(state.customerCity || "地区待补充")} · ${escapeHtml(state.customerBusinessLine)}</span></span><span class="status-chip draft">${escapeHtml(state.customerRelation)}</span></div><div class="button-row equal"><button class="secondary-button" type="button" data-action="edit-customer">编辑资料</button><button class="primary-button" type="button" data-screen="manual-record">+ 新增沟通</button></div></div>
      <div class="tab-row">${tabs.map(([id, label]) => `<button class="tab-button ${state.customerTab === id ? "active" : ""}" type="button" data-action="set-customer-tab" data-tab="${id}">${label}</button>`).join("")}</div>${content}`
  });
}

function manualRecordScreen() {
  return mobileFrame({
    title: "新增沟通记录", subtitle: "手工录入不依赖 AI", back: "records",
    body: `<div class="mobile-segmented"><button class="segment-button active" type="button">手工录入</button><button class="segment-button" type="button" data-screen="ai-material">AI 整理材料</button></div>
      ${Object.values(state.manualErrors).length ? `<div class="notice danger">请修正标记的正式必填字段。</div>` : ""}
      <div class="glass-panel"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong><span>当前客户 · 可更换</span></span><button class="text-button" type="button" data-action="change-customer">更换 ›</button></div>${state.customerPickerOpen ? `<div class="customer-picker"><button type="button" data-action="choose-record-customer" data-customer="华东智造科技">华东智造科技</button><button type="button" data-action="choose-record-customer" data-customer="远见数字供应链">远见数字供应链</button></div>` : ""}<label class="field ${state.manualErrors.businessLine ? "has-error" : ""}"><span>关联业务线 <em>*</em></span><select id="manualBusinessLine"><option value="">请选择业务线</option>${BUSINESS_LINES.map((line) => `<option ${state.manualBusinessLine === line ? "selected" : ""}>${line}</option>`).join("")}</select>${state.manualErrors.businessLine ? `<small class="field-error">${escapeHtml(state.manualErrors.businessLine)}</small>` : ""}</label></div>
      <div class="glass-panel"><div class="field-grid"><label class="field ${state.manualErrors.time ? "has-error" : ""}" style="margin-top:0"><span>实际沟通时间 <em>*</em></span><input id="manualTime" value="${escapeHtml(state.manualTime)}">${state.manualErrors.time ? `<small class="field-error">${escapeHtml(state.manualErrors.time)}</small>` : ""}</label><label class="field ${state.manualErrors.channel ? "has-error" : ""}" style="margin-top:0"><span>沟通渠道 <em>*</em></span><select id="manualChannel"><option value="">请选择</option><option ${state.manualChannel === "电话" ? "selected" : ""}>电话</option><option ${state.manualChannel === "拜访" ? "selected" : ""}>拜访</option><option ${state.manualChannel === "线上会议" ? "selected" : ""}>线上会议</option></select>${state.manualErrors.channel ? `<small class="field-error">${escapeHtml(state.manualErrors.channel)}</small>` : ""}</label></div>
        <label class="field ${state.manualErrors.content ? "has-error" : ""}"><span>沟通正文 <em>*</em></span><textarea id="recordContent">${escapeHtml(state.recordContent)}</textarea>${state.manualErrors.content ? `<small class="field-error">${escapeHtml(state.manualErrors.content)}</small>` : ""}</label>
      </div>
      <details class="form-section"><summary>主题、时长与地点</summary><div class="form-body"><label class="field"><span>沟通主题</span><input id="manualSubject" maxlength="300" value="${escapeHtml(state.manualSubject)}"></label><div class="field-grid"><label class="field"><span>沟通时长（分钟）</span><input id="manualDuration" type="number" min="0" value="${escapeHtml(state.manualDuration)}"></label><label class="field"><span>沟通地点</span><input id="manualLocation" value="${escapeHtml(state.manualLocation)}" placeholder="线上沟通可留空"></label></div></div></details>
      <details class="form-section"><summary>双方参与人 <span>分侧记录</span></summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">陈晓</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label></div></details>
      <details class="form-section"><summary>结论、备注与附件</summary><div class="form-body"><label class="field"><span>结论 / 后续推进</span><textarea id="manualConclusion">${escapeHtml(state.manualConclusion)}</textarea><small class="field-hint">只记录本次共识，不自动创建任务。</small></label><label class="field"><span>备注</span><textarea id="manualRemark" maxlength="1000" placeholder="标准字段之外的简短补充">${escapeHtml(state.manualRemark)}</textarea></label><label class="upload-zone" for="manualAttachment"><input class="file-input" id="manualAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.attachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>单文件 50 MB，最多 10 个；正式提交前须扫描通过</span></span></label></div></details>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-manual-draft">保存草稿</button><button class="primary-button" type="button" data-action="save-manual-formal"><span class="confirm-dot"></span>保存正式记录</button></div></div>`
  });
}

function recordsScreen() {
  const recordRows = [
    ["8 月 21 日 14:20", "华东智造科技", "电话", "商旅", "实施周期与报价方案沟通", "张雨、李程 / 王磊", "record-detail"],
    ["8 月 18 日 09:30", "远见数字供应链", "线上会议", "会奖服务", "数据接口范围确认", "张雨 / 陈嘉", "record-detail"],
    ["8 月 12 日 10:00", "华东智造科技", "拜访", "企业用车", "工厂现场需求访谈", "张雨、李程 / 王磊、周宁", "record-detail"]
  ];
  if (state.createdRecord) recordRows.unshift([state.createdRecord.time, state.createdRecord.customer, state.createdRecord.channel, state.createdRecord.businessLine, state.createdRecord.subject, "张雨 / 客户联系人", "record-detail"]);
  if (state.restored["inactive-record"]) recordRows.push(["8 月 5 日 15:10", "华东智造科技", "电话", "商旅", "旧版报价口径沟通", "张雨 / 王磊", "record-detail"]);
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
  return `<button class="record-row" type="button" data-action="select-record" data-customer="${customer}" data-time="${time}" data-channel="${channel}" data-business-line="${businessLine}" data-subject="${subject}" data-search-row data-search-text="${customer} ${subject} ${businessLine}"><span class="record-row-top"><strong>${customer}</strong><span class="status-chip formal">正式</span></span><p>${subject}</p><small>${time} · ${channel} · ${businessLine}<br>参与人：${people}</small></button>`;
}

function recordDetailScreen() {
  return mobileFrame({
    title: "沟通详情", subtitle: `正式记录 · 版本 ${state.recordVersion}`, back: "records",
    body: `<div class="notice success">正式记录 · 版本 ${state.recordVersion}</div>
      <div class="glass-panel"><div class="section-heading"><h3>${escapeHtml(state.recordSnapshot.subject)}</h3><span>${escapeHtml(state.recordSnapshot.channel)}</span></div><dl class="fact-list"><div class="fact-row"><dt>客户</dt><dd>${escapeHtml(state.recordSnapshot.customer)}</dd></div><div class="fact-row"><dt>实际时间</dt><dd>${escapeHtml(state.recordSnapshot.time)}</dd></div><div class="fact-row"><dt>业务线</dt><dd>${escapeHtml(state.recordSnapshot.businessLine || "待补充")}</dd></div><div class="fact-row"><dt>时长</dt><dd>${state.recordSnapshot.duration ? `${escapeHtml(state.recordSnapshot.duration)} 分钟` : "未填写"}</dd></div><div class="fact-row"><dt>地点</dt><dd>${escapeHtml(state.recordSnapshot.location || "未填写")}</dd></div></dl></div>
      <div class="glass-panel"><div class="section-heading"><h3>沟通正文</h3><span>人工确认</span></div><p class="record-body">${escapeHtml(state.recordSnapshot.content)}</p><div class="section-heading" style="margin-top:14px"><h3>本次结论</h3></div><p class="record-conclusion">${escapeHtml(state.recordConclusion)}</p></div>
      ${state.recordSnapshot.remark ? `<div class="notice">备注：${escapeHtml(state.recordSnapshot.remark)}</div>` : ""}<details class="form-section" open><summary>参与人快照</summary><div class="form-body"><div class="fact-row"><dt>我方</dt><dd>张雨、李程${state.extraInternalParticipant ? "、陈晓" : ""}</dd></div><div class="fact-row"><dt>客户方</dt><dd>王磊${state.extraCustomerParticipant || state.recordSupplementParticipantAdded ? "、临时联系人" : ""}</dd></div></div></details>
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
    ["businessLine", "业务线", "根据客户已建立的业务线关系匹配", true],
    ["duration", "时长（分钟）", "原材料未明确时可留空", false],
    ["location", "地点", "线上沟通可留空", false],
    ["subject", "主题", "主题由正文概括，建议重点核对", true],
    ["content", "沟通正文", "来自原文主要沟通内容", false]
  ];
  const aiReady = state.processState === "ready" && state.aiDraftStatus === "ready";
  return mobileFrame({
    title: "审核 AI 草稿", subtitle: "待人工确认", back: "workbench",
    body: `<div class="notice warning"><strong>未确认草稿</strong><br>修改并明确确认前，不进入正式沟通记录。</div>${!aiReady ? `<div class="notice danger">材料尚未整理完成，暂时不能确认。</div>` : ""}${state.aiError ? `<div class="notice danger">${escapeHtml(state.aiError)}</div>` : ""}<div class="notice review-focus">建议重点核对：主题</div>
      <div class="glass-panel">${fields.map(([id, label, evidence, needsReview]) => `<div class="ai-field ${needsReview ? "needs-review" : ""}"><div class="ai-field-head"><label for="ai-${id}"><strong>${label}${["customer","time","channel","businessLine","content"].includes(id) ? " *" : ""}</strong></label>${needsReview ? `<span class="source-chip warning">建议核对</span>` : ""}</div>${id === "customer" ? `<select id="ai-${id}" data-ai-field="${id}" aria-label="${label}"><option>${escapeHtml(state.aiDraft[id])}</option><option>华东智造装备（苏州）</option></select>` : id === "businessLine" ? `<select id="ai-${id}" data-ai-field="${id}" aria-label="${label}">${BUSINESS_LINES.map((line) => `<option ${state.aiDraft[id] === line ? "selected" : ""}>${line}</option>`).join("")}</select>` : id === "content" ? `<textarea id="ai-${id}" data-ai-field="${id}" aria-label="${label}">${escapeHtml(state.aiDraft[id])}</textarea>` : `<input id="ai-${id}" data-ai-field="${id}" aria-label="${label}" value="${escapeHtml(state.aiDraft[id])}">`}<button class="evidence-toggle" type="button" data-action="toggle-evidence" data-field="${id}">${state.evidenceOpen[id] ? "收起原文 −" : "查看原文 +"}</button>${state.evidenceOpen[id] ? `<div class="evidence">${evidence}</div>` : ""}</div>`).join("")}</div>
      <details class="form-section"><summary>参与人、结论与备注</summary><div class="form-body"><label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button></div></label><label class="field"><span>客户方参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">临时姓名</button></div></label><label class="field"><span>结论 / 后续推进</span><textarea data-ai-field="conclusion">${escapeHtml(state.aiDraft.conclusion)}</textarea></label><label class="field"><span>备注</span><textarea data-ai-field="remark" maxlength="1000">${escapeHtml(state.aiDraft.remark)}</textarea></label></div></details>
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
  const selfScope = state.governanceScope === "self";
  const restoredAction = customerMode
    ? `<button class="primary-button full-button" type="button" data-action="edit-restored-item" data-item="${itemId}">编辑客户资料</button>`
    : `<button class="primary-button full-button" type="button" data-action="edit-restored-item" data-item="${itemId}">补充或修订记录</button>`;
  return mobileFrame({
    title: selfScope ? "我的归档" : "归档数据管理", subtitle: selfScope ? "本人归档 · 恢复后可编辑" : "授权数据治理", back: selfScope ? "profile" : customerMode ? "customers" : "records",
    body: `<div class="mobile-segmented"><button class="segment-button ${customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="customer">已归档客户</button><button class="segment-button ${!customerMode ? "active" : ""}" type="button" data-action="set-governance-type" data-type="record">已归档沟通</button></div>
      ${restored ? `<div class="notice success">对象已恢复到正常状态，操作已写入审计。</div>${restoredAction}` : `<div class="glass-panel"><div class="identity-strip"><span class="avatar">${customerMode ? "北" : "华"}</span><span><strong>${escapeHtml(itemName)}</strong><span>${escapeHtml(itemContext)}</span></span><span class="status-chip inactive">已归档</span></div><dl class="fact-list" style="margin-top:10px"><div class="fact-row"><dt>归档原因</dt><dd>${escapeHtml(archiveReason)}</dd></div><div class="fact-row"><dt>操作人</dt><dd>${selfScope || currentArchivedRecord ? "张雨" : "陈管理员"}</dd></div><div class="fact-row"><dt>归档时间</dt><dd>${escapeHtml(archiveTime)}</dd></div><div class="fact-row"><dt>历史引用</dt><dd>${customerMode ? "3 位联系人 · 8 条沟通" : "2 个附件 · 版本 1"}</dd></div></dl></div><details class="form-section" open><summary>查看归档详情 <span>只读</span></summary><div class="form-body">${customerMode ? `<div class="fact-row"><dt>业务线</dt><dd>商旅</dd></div><div class="fact-row"><dt>合作关系</dt><dd>潜在</dd></div><div class="fact-row"><dt>主联系人</dt><dd>孙宁 · 138****8172</dd></div><div class="fact-row"><dt>主地址</dt><dd>北京市朝阳区</dd></div>` : `<div class="fact-row"><dt>客户</dt><dd>${escapeHtml(currentArchivedRecord?.customer || "华东智造科技")}</dd></div><div class="fact-row"><dt>实际时间</dt><dd>${escapeHtml(currentArchivedRecord?.time || "2026-08-05 15:10")}</dd></div><div class="fact-row"><dt>渠道 / 业务线</dt><dd>${escapeHtml(currentArchivedRecord?.channel || "电话")} · ${escapeHtml(currentArchivedRecord?.businessLine || "商旅")}</dd></div><p class="record-body">${escapeHtml(currentArchivedRecord?.content || "双方核对了旧版报价的服务范围与计费口径。")}</p>`}</div></details><div class="notice">归档状态可查看但不可直接覆盖。系统会先恢复并记录审计，再进入编辑或版本补充。</div><button class="primary-button full-button" type="button" data-action="restore-and-edit" data-item="${itemId}">${customerMode ? "恢复并编辑客户" : "恢复并补充记录"}</button>`}
      <details class="form-section" style="margin-top:10px"><summary>归档规则</summary><div class="form-body"><ul class="governance-rules"><li>默认列表隐藏已归档对象</li><li>只能查看本人归档或仍有维护权限的数据</li><li>恢复不自动恢复单独归档的关联对象</li></ul></div></details>`
  });
}

function profileScreen() {
  return mobileFrame({
    title: "我的", subtitle: "身份、草稿与会话", nav: "profile",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">张</span><span><strong>张雨</strong><span>海天科技 · 华东销售部</span></span><span class="status-chip formal">销售人员</span></div></div><div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>所属企业</dt><dd>海天科技</dd></div><div class="fact-row"><dt>组织范围</dt><dd>华东销售部</dd></div><div class="fact-row"><dt>数据权限</dt><dd>本人创建或内部负责客户</dd></div></dl></div><div class="list-panel"><button class="system-item" type="button" data-action="open-ready-draft"><span class="item-dot warning"></span><span class="system-copy"><strong>沟通草稿</strong><span>2 条待继续编辑或确认</span></span><span class="item-action">查看 ›</span></button><button class="system-item" type="button" data-action="open-my-archive"><span class="item-dot"></span><span class="system-copy"><strong>我的归档</strong><span>查看本人归档的客户和沟通</span></span><span class="item-action">查看 ›</span></button></div><button class="danger-button full-button" type="button" data-action="logout">退出登录</button>`
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
  state.manualBusinessLine = document.querySelector("#manualBusinessLine")?.value ?? state.manualBusinessLine;
  state.manualDuration = document.querySelector("#manualDuration")?.value.trim() ?? state.manualDuration;
  state.manualLocation = document.querySelector("#manualLocation")?.value.trim() ?? state.manualLocation;
  state.manualSubject = document.querySelector("#manualSubject")?.value.trim() ?? state.manualSubject;
  state.recordContent = document.querySelector("#recordContent")?.value.trim() ?? state.recordContent;
  state.manualConclusion = document.querySelector("#manualConclusion")?.value.trim() ?? state.manualConclusion;
  state.manualRemark = document.querySelector("#manualRemark")?.value.trim() ?? state.manualRemark;
}

function captureCustomerForm() {
  const textFields = {
    customerName: "customerName", customerShortName: "customerShortName", customerParentName: "customerParentName",
    customerContactName: "customerContactName", customerContactDepartment: "customerContactDepartment", customerContactTitle: "customerContactTitle",
    customerContactMobile: "customerContactMobile", customerContactEmail: "customerContactEmail", customerContactWechat: "customerContactWechat",
    customerContactRemark: "customerContactRemark", customerEmployeeCount: "customerEmployeeCount", customerUscc: "customerUscc",
    customerRegistrationNo: "customerRegistrationNo", customerEstablishedDate: "customerEstablishedDate", customerRegisteredCapital: "customerRegisteredCapital",
    customerWebsite: "customerWebsite", customerOfficialAccount: "customerOfficialAccount", customerPublicEmail: "customerPublicEmail",
    customerMainPhone: "customerMainPhone", customerCountry: "customerCountry", customerProvince: "customerProvince",
    customerCity: "customerCity", customerDetailAddress: "customerDetailAddress", customerRemark: "customerRemark"
  };
  Object.entries(textFields).forEach(([stateKey, inputId]) => {
    state[stateKey] = document.querySelector(`#${inputId}`)?.value.trim() ?? state[stateKey];
  });
  const selectFields = {
    customerIndustry: "customerIndustry", customerBusinessLine: "customerBusinessLine", customerRelation: "customerRelation",
    customerNature: "customerNature", customerRevenueRange: "customerRevenueRange", customerListed: "customerListed",
    customerSource: "customerSource", customerCapitalCurrency: "customerCapitalCurrency", customerOwnerName: "customerOwnerName",
    customerOwnerRole: "customerOwnerRole", customerFrontendSales: "customerFrontendSales", customerBackendSales: "customerBackendSales"
  };
  Object.entries(selectFields).forEach(([stateKey, inputId]) => {
    state[stateKey] = document.querySelector(`#${inputId}`)?.value ?? state[stateKey];
  });
}

function captureSupplementForm() {
  state.supplementContent = document.querySelector("#supplementContent")?.value.trim() ?? state.supplementContent;
  state.supplementConclusion = document.querySelector("#supplementConclusion")?.value.trim() ?? state.supplementConclusion;
}

function validateManualFormal() {
  const errors = {};
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.manualTime)) errors.time = "请输入 YYYY-MM-DD HH:mm 格式的实际时间。";
  if (!state.manualChannel) errors.channel = "请选择沟通渠道。";
  if (!state.manualBusinessLine) errors.businessLine = "请选择本次沟通所属业务线。";
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
  const required = ["customer", "time", "channel", "businessLine", "content"];
  const missing = required.filter((key) => !state.aiDraft[key]);
  if (missing.length) {
    state.aiError = `正式必填仍缺少：${missing.map((key) => ({ customer: "客户", time: "实际时间", channel: "渠道", businessLine: "业务线", content: "沟通正文" })[key]).join("、")}。`;
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
    state.dedupeAccessRequested = false;
    navigate("dedupe");
    return;
  }
  if (action === "select-customer") {
    const profiles = {
      "华东智造科技": { customerShortName: "华东智造", customerBusinessLine: "商旅", customerRelation: "跟进中", customerContactName: "王磊", customerContactDepartment: "采购部", customerContactTitle: "采购总监", customerContactMobile: "138****2036", customerContactEmail: "wanglei@example.com", customerContactWechat: "wanglei_work", customerIndustry: "制造业", customerCity: "上海市", customerProvince: "上海市", customerDetailAddress: "浦东新区张江路 168 号", customerMainPhone: "021-5588****", customerFrontendSales: "张雨", customerBackendSales: "李程" },
      "远见数字供应链": { customerShortName: "远见供应链", customerBusinessLine: "商旅", customerRelation: "潜在", customerContactName: "陈嘉", customerContactDepartment: "运营部", customerContactTitle: "运营经理", customerContactMobile: "138****6621", customerContactEmail: "chenjia@example.com", customerContactWechat: "chenjia_work", customerIndustry: "企业服务 / 商旅管理", customerCity: "杭州市", customerProvince: "浙江省", customerDetailAddress: "滨江区江南大道 88 号", customerMainPhone: "0571-8866****", customerFrontendSales: "张雨", customerBackendSales: "" },
      "新港工业设备": { customerShortName: "新港工业", customerBusinessLine: "企业用车", customerRelation: "已成交", customerIndustry: "制造业", customerCity: "苏州市", customerProvince: "江苏省" },
      "澄海精密制造": { customerShortName: "澄海精密", customerBusinessLine: "会奖服务", customerRelation: "已流失", customerContactName: "赵敏", customerContactDepartment: "行政部", customerContactTitle: "行政经理", customerContactMobile: "139****5178", customerIndustry: "制造业", customerCity: "宁波市", customerProvince: "浙江省" },
      "北辰工业系统": { customerShortName: "北辰工业", customerBusinessLine: "商旅", customerRelation: "潜在", customerIndustry: "制造业", customerCity: "北京市", customerProvince: "北京市" }
    };
    state.customerName = target.dataset.customer || "华东智造科技";
    Object.assign(state, {
      customerShortName: state.customerName, customerParentName: "", customerIndustry: "", customerBusinessLine: "商旅", customerRelation: "潜在",
      customerContactName: "", customerContactDepartment: "", customerContactTitle: "", customerContactMobile: "", customerContactEmail: "", customerContactWechat: "", customerContactRemark: "",
      customerNature: "", customerEmployeeCount: "", customerRevenueRange: "", customerListed: "", customerSource: "", customerUscc: "", customerRegistrationNo: "",
      customerEstablishedDate: "", customerRegisteredCapital: "", customerCapitalCurrency: "CNY", customerWebsite: "", customerOfficialAccount: "", customerPublicEmail: "",
      customerMainPhone: "", customerCountry: "中国", customerProvince: "", customerCity: "", customerDetailAddress: "", customerRemark: "", customerOwnerName: "张雨", customerOwnerRole: "销售", customerFrontendSales: "张雨", customerBackendSales: ""
    }, profiles[state.customerName] || {});
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
          businessLine: target.dataset.businessLine || "商旅",
          duration: target.dataset.channel === "拜访" ? "90" : "35",
          location: target.dataset.channel === "拜访" ? "客户总部" : "",
          subject: target.dataset.subject || "实施周期与报价方案沟通",
          content: knownContent[target.dataset.subject] || "已记录本次沟通的客观事实。",
          remark: ""
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
  if (action === "set-customer-line-filter") {
    state.customerBusinessLineFilter = target.dataset.value;
    state.customerRelationFilter = "全部";
  }
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
    Object.assign(state, {
      customerFormMode: "create", customerName: "", customerShortName: "", customerParentName: "", customerIndustry: "",
      customerBusinessLine: "商旅", customerRelation: "潜在", customerContactName: "", customerContactDepartment: "", customerContactTitle: "",
      customerContactMobile: "", customerContactEmail: "", customerContactWechat: "", customerContactRemark: "", customerNature: "", customerEmployeeCount: "",
      customerRevenueRange: "", customerListed: "", customerSource: "", customerUscc: "", customerRegistrationNo: "", customerEstablishedDate: "",
      customerRegisteredCapital: "", customerCapitalCurrency: "CNY", customerWebsite: "", customerOfficialAccount: "", customerPublicEmail: "", customerMainPhone: "",
      customerCountry: "中国", customerProvince: "", customerCity: "", customerDetailAddress: "", customerRemark: "", customerOwnerName: "张雨", customerOwnerRole: "销售", customerFrontendSales: "张雨", customerBackendSales: "",
      customerFormError: "", customerDedupeStatus: "idle", dedupeStage: "idle", dedupeOverrideOpen: false, dedupeAccessRequested: false
    });
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
    state.governanceScope = target.dataset.scope || "admin";
    navigate("governance");
    return;
  }
  if (action === "open-my-archive") {
    state.governanceMode = "list";
    state.governanceType = "customer";
    state.governanceScope = "self";
    navigate("governance");
    return;
  }
  if (action === "request-restricted-access") {
    state.dedupeAccessRequested = true;
    showToast("协作申请已提交");
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
    Object.assign(state, {
      customerName: target.dataset.customer,
      customerShortName: target.dataset.customer.replace(/有限公司$/, ""),
      customerIndustry: "制造业", customerBusinessLine: target.dataset.customer.includes("苏州") ? "企业用车" : "商旅", customerRelation: "跟进中",
      customerContactName: "王磊", customerContactDepartment: "采购部", customerContactTitle: "采购总监", customerContactMobile: "138****2036",
      customerContactEmail: "wanglei@example.com", customerContactWechat: "wanglei_work", customerCountry: "中国",
      customerProvince: target.dataset.customer.includes("苏州") ? "江苏省" : "上海市", customerCity: target.dataset.customer.includes("苏州") ? "苏州市" : "上海市",
      customerMainPhone: "021-5588****", customerOwnerName: "张雨", customerOwnerRole: "销售", customerFrontendSales: "张雨", customerBackendSales: "李程"
    });
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
    } else if (state.customerName === "远航国际商旅有限公司") {
      state.customerFormError = "";
      state.dedupeStage = "restricted";
      state.dedupeAccessRequested = false;
      navigate("dedupe");
      return;
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
    else if (state.customerFormMode === "create" && state.customerName === "远航国际商旅有限公司") {
      state.dedupeStage = "restricted";
      state.dedupeAccessRequested = false;
      navigate("dedupe");
      showToast("后台查重发现无权查看的已有客户");
      return;
    }
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
  if (action === "assign-backend-sales") {
    state.customerBackendSales = "李程";
    showToast("李程已作为“方案与合同”负责人加入");
    return;
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
      state.recordSnapshot = { customer: state.customerName, time: state.manualTime, channel: state.manualChannel, businessLine: state.manualBusinessLine, duration: state.manualDuration, location: state.manualLocation, subject: state.manualSubject || "未填写主题", content: state.recordContent, remark: state.manualRemark };
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
    state.createdRecord = { ...state.recordSnapshot, conclusion: state.aiDraft.conclusion, version: 1 };
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
  if (action === "restore-and-edit" || action === "edit-restored-item") {
    const itemId = target.dataset.item;
    if (itemId === "inactive-customer") {
      state.restored[itemId] = true;
      Object.assign(state, {
        customerName: "北辰工业系统", customerShortName: "北辰工业", customerBusinessLine: "商旅", customerRelation: "潜在",
        customerContactName: "孙宁", customerContactMobile: "138****8172", customerCountry: "中国", customerProvince: "北京市",
        customerCity: "北京市", customerDetailAddress: "朝阳区建国路 88 号", customerOwnerName: "张雨", customerOwnerRole: "销售", customerFrontendSales: "张雨", customerBackendSales: "",
        customerFormMode: "edit", customerFormError: "", customerDedupeStatus: "idle"
      });
      navigate("customer-form");
      showToast("客户已恢复，现在可编辑资料");
      return;
    }
    const restoredRecord = itemId === "current-record" && state.archivedRecord
      ? { ...state.archivedRecord }
      : {
          customer: "华东智造科技", time: "2026-08-05 15:10", channel: "电话", businessLine: "商旅", duration: "20", location: "",
          subject: "旧版报价口径沟通", content: "双方核对了旧版报价的服务范围与计费口径。", remark: ""
        };
    state.restored[itemId] = true;
    if (itemId === "current-record") state.archivedRecord = null;
    state.recordSnapshot = restoredRecord;
    state.recordConclusion = restoredRecord.conclusion || "双方已确认旧版报价口径。";
    state.recordVersion = restoredRecord.version || 1;
    state.supplementContent = "";
    state.supplementConclusion = "";
    state.supplementAttachmentAdded = false;
    navigate("version-diff");
    showToast("记录已恢复，本次修订将生成新版本");
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
