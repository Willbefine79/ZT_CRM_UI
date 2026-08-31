"use strict";

const { filterRows } = CrmPrototypeLogic;
const STORAGE_KEY = "zt-crm-review-notes-v1";
const REVIEW_KEY = "zt-crm-review-status-v1";
const BUSINESS_LINES = ["商旅", "会奖服务", "企业用车"];
const CUSTOMER_OWNER_ROLES = ["项目经理", "前端销售", "后端销售"];
const CUSTOMER_OWNER_PEOPLE = ["张雨", "李程", "陈晓", "周舟"];
const PROTOTYPE_TODAY = "2026-08-27";
const FOLLOW_UP_WEEK = [
  { date: "2026-08-24", weekday: "一", day: "24" },
  { date: "2026-08-25", weekday: "二", day: "25" },
  { date: "2026-08-26", weekday: "三", day: "26" },
  { date: "2026-08-27", weekday: "四", day: "27" },
  { date: "2026-08-28", weekday: "五", day: "28" },
  { date: "2026-08-29", weekday: "六", day: "29" },
  { date: "2026-08-30", weekday: "日", day: "30" }
];
const BASE_SCHEDULES = [
  { id: "schedule-factory-visit", date: "2026-08-27", time: "09:30", endTime: "10:30", title: "客户线下拜访", customer: "华东智造科技", businessLines: ["企业用车"], channel: "线下拜访" },
  { id: "schedule-framework-call", date: "2026-08-27", time: "14:00", endTime: "", title: "方案沟通", customer: "海天科技集团", businessLines: ["商旅", "企业用车"], channel: "微信", linkedRecordSubject: "年度框架及用车方案沟通" },
  { id: "schedule-quote-review", date: "2026-08-28", time: "10:00", endTime: "11:00", title: "报价方案确认会", customer: "华东智造科技", businessLines: ["商旅"], channel: "手机" }
];
const BASE_FORMAL_RECORDS = [
  { date: "2026-08-27", time: "14:20", displayTime: "8 月 27 日 14:20", customer: "海天科技集团", channel: "电话", businessLine: "商旅", businessLines: ["商旅", "企业用车"], subject: "年度框架及用车方案沟通", summary: "商旅合同条款与企业用车方案在同一次沟通中完成确认。", topics: [{ businessLine: "商旅", subject: "年度框架合同条款确认", keyPoints: "双方核对年度合作框架与报价口径。", result: "报价明细待进一步核对。" }, { businessLine: "企业用车", subject: "企业用车方案讨论", keyPoints: "确认班车线路、车型与服务范围。", result: "客户内部评估方案。" }] },
  { date: "2026-08-18", time: "09:30", displayTime: "8 月 18 日 09:30", customer: "远见数字供应链", channel: "线上会议", businessLine: "会奖服务", businessLines: ["会奖服务"], subject: "数据接口范围确认", summary: "双方核对了数据接口范围，部分字段仍待技术团队确认。" },
  { date: "2026-08-12", time: "10:00", displayTime: "8 月 12 日 10:00", customer: "华东智造科技", channel: "线下拜访", businessLine: "企业用车", businessLines: ["企业用车"], subject: "工厂现场需求访谈", summary: "客户正在整理班车线路、车型和车辆数量需求。" }
];

const screens = [
  {
    id: "workbench", group: "总览", nav: "工作台", title: "工作台",
    refs: ["FR-13", "§7 信息架构", "UJ-1 / UJ-3"],
    objective: "用紧凑首屏承载高频新增、当天日程、独立待处理和最近正式跟进事实。",
    reviews: ["新增客户和新增沟通记录作为两个独立快捷模块。", "跟进记录汇总今日日程和最近 1 天的正式沟通。", "待处理放在页面底部，并通过独立页面区分待处理与最近一周已处理。"],
    decisions: ["待处理不进入跟进记录的单日或列表视图。", "AI 未确认草稿只在工作台待处理和我的草稿入口出现。"]
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
    objective: "先识别重复客户主体，再判断所选业务线是否已建立，避免同一企业被按业务线重复建档。",
    reviews: ["查重必须同时带入企业名称和本次选择的业务线。", "客户与业务线均存在时申请加入；客户存在但业务线不存在时为已有客户新增业务线。", "无权候选只显示脱敏名称、业务线状态和申请入口。"],
    decisions: ["客户主体按所属企业内的企业身份查重，业务线只用于第二层关系查重。", "客户与业务线关系唯一，不以业务线复制客户主体。"]
  },
  {
    id: "customer-form", group: "客户", nav: "客户表单", title: "新增 / 编辑客户",
    refs: ["FR-3 至 FR-6", "字段契约 §3"],
    objective: "以三组结构完成快速建档，完整字段保留但不在新增时一次性压给销售。",
    reviews: ["客户信息、联系人与负责人默认展开，更多企业资料统一折叠。", "企业全称、业务线和合作阶段明确必填；联系人填写后至少保留一种有效联系方式。", "负责人角色由销售管理员在后台配置；地址支持多条录入并明确指定一条主地址。"],
    decisions: ["新增模式不预设业务线和合作阶段；离开未完成表单时再询问是否保存草稿。", "统一社会信用代码等低频字段归入更多企业资料，业绩分配仍在合同阶段确认。"]
  },
  {
    id: "customer-detail", group: "客户", nav: "客户详情", title: "客户详情",
    refs: ["FR-7", "FR-4 至 FR-6"],
    objective: "在同一客户主体下按业务线查看合作阶段、负责人、联系人和正式沟通。",
    reviews: ["支持全部业务线总览和单业务线视图，切换后相关信息同步变化。", "概览优先展示最近沟通、动态负责人、主要联系人和客户资料摘要。", "联系人不提供拨打入口；新增沟通必须明确继承当前业务线。"],
    decisions: ["企业详细信息跨业务线共享，合作阶段、负责人、联系人关联和沟通记录按业务线维护。", "全部业务线视图不生成虚假的全局合作阶段。"]
  },
  {
    id: "manual-record", group: "沟通", nav: "手工沟通", title: "新增沟通记录",
    refs: ["FR-8", "字段契约 §4.1", "UJ-2"],
    objective: "在 AI 不可用或不适合时，手工记录一次真实发生的客户沟通。",
    reviews: ["公共信息只填写一次，涉及业务线支持多选。", "选择多条业务线后纵向生成主题、沟通要点和沟通结果议题区。", "页面不提供暂存按钮，离开时再询问是否保存草稿。"],
    decisions: ["一次真实沟通只建立一条记录，多业务线作为记录内部议题。", "沟通记录不承载下一步行动；正式保存使用幂等键。"]
  },
  {
    id: "records", group: "跟进", nav: "跟进记录", title: "跟进记录",
    refs: ["FR-9", "FR-7 最近沟通"],
    objective: "在同一页通过单日和列表两种视图查看日程计划与已发生的正式沟通。",
    reviews: ["默认单日视图，通过最近一行日期快速切换具体日期。", "列表默认覆盖全部时间，并可按业务线和时间组合筛选。", "日程展示客户、多条业务线及微信/手机/线下拜访渠道；新增日程结束时间选填，业务线支持多选。"],
    decisions: ["日程与沟通使用两个独立的正常卡片，不把日程做成弱化附属信息。", "草稿、待处理不进入单日或列表视图。"]
  },
  {
    id: "record-detail", group: "沟通", nav: "沟通详情", title: "沟通记录详情",
    refs: ["FR-9", "FR-8 参与人"],
    objective: "帮助销售快速恢复单次沟通的公共上下文与各业务线议题。",
    reviews: ["优先展示客户、涉及业务线、参与人和按业务线整理的沟通议题。", "每个议题独立展示主题、沟通要点和沟通结果。", "右上角直接编辑，版本和审计统一收进变更信息。"],
    decisions: ["编辑记录不要求填写修改原因，后台自动保留原版本和字段变化。", "归档放入更多菜单；页面底部不设置主操作。"]
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
    id: "version-diff", group: "沟通", nav: "编辑沟通记录", title: "编辑沟通记录",
    refs: ["FR-12 编辑已有记录", "UJ-4"],
    objective: "让销售补充遗漏细节、修正错误或录入后来回忆起的内容。",
    reviews: ["完整带出原记录字段，保存后回到最新版本详情。", "不要求填写修改原因；修改客户或业务线时提示归属影响。", "后台自动生成新版本并保留原版本。"],
    decisions: ["前端按正常编辑理解，不暴露补充、纠错或修订类型。", "编辑保留一条记录与多个业务线议题的结构。"]
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
  navigationStack: [],
  customerFlowReturnTarget: "customers",
  customerFlowBaseStack: [],
  recordFlowReturnTarget: "records",
  recordFlowBaseStack: [],
  workbenchNotificationOpen: false,
  workbenchHasUnread: true,
  workbenchView: "main",
  workbenchPendingTab: "active",
  createdWorkbenchSchedules: [],
  createdWorkbenchTodos: [],
  recordsCalendarMode: "day",
  recordsShowSchedules: true,
  recordsShowCommunications: true,
  followUpListFiltersOpen: false,
  followUpListBusinessLine: "",
  followUpListTime: "全部时间",
  followUpListSearch: "",
  recordsCreateMenuOpen: false,
  scheduleComposerOpen: false,
  scheduleDraftTitle: "",
  scheduleDraftDate: PROTOTYPE_TODAY,
  scheduleDraftTime: "09:30",
  scheduleDraftEndTime: "",
  scheduleDraftCustomer: "",
  scheduleDraftBusinessLines: [],
  scheduleDraftChannel: "微信",
  scheduleDraftDetail: "",
  scheduleDraftError: "",
  selectedScheduleId: "",
  followUpSelectedDate: PROTOTYPE_TODAY,
  customerFiltersOpen: false,
  customerSort: "最近沟通",
  customerSortMenuOpen: false,
  recordFiltersOpen: false,
  recordBusinessLineFilter: "",
  customerRelationFilter: "",
  customerBusinessLineFilter: "",
  recordChannelFilter: "全部",
  recordTimeFilter: "",
  recordCustomStart: "2026-08-01",
  recordCustomEnd: "2026-08-27",
  recordCustomerScope: "",
  customerTab: "overview",
  customerFormMode: "edit",
  dedupeStage: "idle",
  dedupeOverrideOpen: false,
  dedupeOverrideReason: "",
  dedupeOverrideDetail: "",
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
  customerAddresses: [{ country: "中国", province: "浙江省", city: "杭州市", detail: "滨江区江南大道 88 号" }],
  customerPrimaryAddressIndex: 0,
  customerMoreDetailsOpen: false,
  customerRemark: "",
  customerOwnerName: "张雨",
  customerOwnerRole: "销售",
  customerFrontendSales: "张雨",
  customerBackendSales: "李程",
  customerOwnerAssignments: [{ role: "前端销售", person: "张雨" }, { role: "后端销售", person: "李程" }],
  customerDetailBusinessLine: "all",
  customerBusinessRelations: [
    { line: "商旅", stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }, { role: "后端销售", person: "李程" }], contacts: ["陈嘉"], lastTime: "8 月 18 日 09:30", lastChannel: "线上会议", lastSubject: "数据接口范围确认", lastSummary: "双方确认首期接口范围，待进一步核对字段清单。" },
    { line: "会奖服务", stage: "跟进中", owners: [{ role: "项目经理", person: "陈晓" }], contacts: ["陈嘉"], lastTime: "8 月 12 日 14:00", lastChannel: "线下拜访", lastSubject: "年度会议需求沟通", lastSummary: "客户正在确认参会规模和举办城市。" }
  ],
  customerFormError: "",
  customerDedupeStatus: "idle",
  customerPickerOpen: false,
  customerMinimalProfile: false,
  customerSaveConflict: false,
  contactRows: 1,
  addressRows: 1,
  ownerRows: 1,
  materialMode: "text",
  materialText: "8月27日下午与华东智造王磊电话沟通。客户认可初步方案，希望补充实施周期、交付边界和正式报价，约定下周继续沟通。",
  materialFile: "",
  materialError: "",
  processState: "processing",
  aiDraftStatus: "editing",
  aiError: "",
  aiDraft: {
    customer: "华东智造科技",
    time: "2026-08-27 16:20",
    endTime: "2026-08-27 16:55",
    channel: "手机",
    businessLine: "商旅",
    duration: "35",
    location: "",
    subject: "实施周期与报价方案沟通",
    content: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。",
    conclusion: "约定下周继续沟通具体实施安排。",
    remark: ""
  },
  aiNextActionOpen: true,
  aiNextActionType: "待处理",
  aiNextActionTitle: "补充实施周期与正式报价",
  aiNextActionTime: "2026-08-28 10:00",
  aiAttachmentAdded: false,
  evidenceOpen: {},
  governanceType: "customer",
  governanceMode: "list",
  governanceScope: "self",
  governanceReason: "",
  dedupeAccessRequested: false,
  dedupeExistingBusinessLines: ["商旅"],
  dedupeLineRequestSubmitted: false,
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
  manualEndTime: "2026-08-21 14:55",
  manualRecordBack: "records",
  manualChannel: "",
  manualBusinessLine: "商旅",
  manualBusinessLines: ["商旅"],
  manualTopics: {
    "商旅": { subject: "实施周期与报价方案沟通", keyPoints: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。", result: "实施周期与报价仍待确认。" }
  },
  communicationEntryMode: "ai",
  draftExitPrompt: "",
  draftExitFallback: "",
  manualLocation: "",
  manualSubject: "实施周期与报价方案沟通",
  manualResult: "客户认可初步方案，实施周期与报价仍待确认。",
  manualNextActionOpen: false,
  manualNextActionType: "待处理",
  manualNextActionTitle: "补充实施周期与正式报价",
  manualNextActionTime: "2026-08-28 10:00",
  manualErrors: {},
  attachmentAdded: false,
  extraInternalParticipant: false,
  extraCustomerParticipant: false,
  recordVersion: 2,
  recordMoreOpen: false,
  recordNextActionStatus: "completed",
  recordNextActionTitle: "补充实施周期与正式报价",
  recordNextActionTime: "8 月 28 日 10:00",
  recordNextActionCompletedAt: "8 月 28 日 16:20",
  editRecordErrors: {},
  editRecordAttachmentAdded: false,
  recordEdit: null,
  recordOwnershipConfirmationOpen: false,
  createdRecord: null,
  supplementedRecord: null,
  recordConclusion: "双方确认下周继续沟通具体实施安排。",
  selectedRecordIsExisting: true,
  aiAssistantOpen: false,
  aiAssistantPrompt: "",
  aiAssistantResponse: "",
  aiAssistantError: "",
  aiAssistantPendingAction: "",
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
    ["records", "跟进记录", "records"],
    ["profile", "我的", "profile"]
  ];
  return `<nav class="mobile-bottom-nav" aria-label="手机底部导航">${items.map(([id, label, key]) => `
    <button class="bottom-nav-button ${active === key ? "active" : ""}" type="button" data-screen="${id}">${label}</button>`).join("")}</nav>`;
}

function aiAssistantLayer() {
  const contextTitle = screenById[state.activeScreen]?.title || "当前页面";
  return `${state.aiAssistantOpen ? "" : `<button class="ai-assistant-fab" type="button" data-action="open-ai-assistant" title="智能助手" aria-label="打开智能助手" aria-expanded="false">AI</button>`}
    ${state.aiAssistantOpen ? `<div class="ai-assistant-scrim"><section class="ai-assistant-panel" role="dialog" aria-modal="true" aria-labelledby="aiAssistantTitle">
      <header class="ai-assistant-header"><div><strong id="aiAssistantTitle">智能助手</strong><span>当前页面：${escapeHtml(contextTitle)}</span></div><button class="ai-assistant-close" type="button" data-action="close-ai-assistant" title="关闭" aria-label="关闭智能助手">×</button></header>
      ${state.aiAssistantResponse ? `<div class="assistant-confirmation"><strong>待确认操作</strong><p>${escapeHtml(state.aiAssistantResponse)}</p></div>` : ""}
      <label class="assistant-input"><span>业务指令</span><textarea id="aiAssistantPrompt" maxlength="500" placeholder="输入业务指令" ${state.aiAssistantResponse ? "readonly" : ""}>${escapeHtml(state.aiAssistantPrompt)}</textarea></label>
      ${state.aiAssistantError ? `<span class="field-error">${escapeHtml(state.aiAssistantError)}</span>` : ""}
      <div class="button-row equal">${state.aiAssistantResponse ? `<button class="secondary-button" type="button" data-action="reset-ai-assistant">重新输入</button><button class="primary-button" type="button" data-action="confirm-ai-assistant">确认执行</button>` : `<button class="secondary-button" type="button" data-action="close-ai-assistant">取消</button><button class="primary-button" type="button" data-action="submit-ai-assistant">提交</button>`}</div>
    </section></div>` : ""}`;
}

function mobileFrame({ title, subtitle = "", titleAction = "", body, back = "", action = "", nav = "", sticky = "", hideHeader = false }) {
  return `<div class="mobile-app ${nav ? "has-bottom-nav" : ""} ${sticky ? "has-sticky-actions" : ""} ${hideHeader ? "no-page-header" : ""}">
    <div class="mobile-status"><span>9:41</span><span class="signal">●●● 5G ▰</span></div>
    ${hideHeader ? "" : `<header class="mobile-header">
      ${back ? `<button class="mobile-icon-button" type="button" data-action="navigate-back" data-fallback="${back}" title="返回" aria-label="返回">‹</button>` : ""}
      <div class="mobile-header-copy"><div class="mobile-header-title-row"><h2>${escapeHtml(title)}</h2>${titleAction}</div>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}</div>
      ${action}
    </header>`}
    <div class="mobile-scroll">${body}${sticky}</div>
    ${nav ? bottomNav(nav) : ""}
    ${aiAssistantLayer()}
    ${state.toast ? `<div class="toast" role="status">${escapeHtml(state.toast)}</div>` : ""}
  </div>`;
}

function getSchedules() {
  return [...BASE_SCHEDULES, ...state.createdWorkbenchSchedules]
    .filter((item) => !item.linkedRecordSubject)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function recordBusinessLines(record) {
  if (Array.isArray(record.businessLines) && record.businessLines.length) return record.businessLines;
  if (Array.isArray(record.topics) && record.topics.length) return record.topics.map((topic) => topic.businessLine).filter(Boolean);
  return record.businessLine ? [record.businessLine] : [];
}

function recordTopics(record) {
  if (Array.isArray(record.topics) && record.topics.length) return record.topics;
  const businessLine = recordBusinessLines(record)[0] || "未关联业务线";
  return [{ businessLine, subject: record.subject || "沟通记录", keyPoints: record.content || record.summary || "", result: record.conclusion || "" }];
}

function businessLineLabel(record) {
  return recordBusinessLines(record).join(" / ");
}

function getFormalRecords() {
  const records = [...BASE_FORMAL_RECORDS];
  if (state.createdRecord) {
    const date = state.createdRecord.time.slice(0, 10);
    const time = state.createdRecord.time.slice(11, 16);
    const createdRow = {
      date,
      time,
      displayTime: state.createdRecord.time,
      customer: state.createdRecord.customer,
      channel: state.createdRecord.channel,
      businessLine: recordBusinessLines(state.createdRecord)[0] || "",
      businessLines: recordBusinessLines(state.createdRecord),
      topics: recordTopics(state.createdRecord),
      subject: state.createdRecord.subject,
      summary: state.createdRecord.content || recordTopics(state.createdRecord).map((topic) => topic.keyPoints).filter(Boolean).join("；")
    };
    const duplicateIndex = records.findIndex((row) => row.date === createdRow.date && row.time === createdRow.time
      && row.subject === createdRow.subject && sameCustomer(row.customer, createdRow.customer));
    if (duplicateIndex >= 0) records.splice(duplicateIndex, 1, createdRow);
    else records.unshift(createdRow);
  }
  if (state.restored["inactive-record"]) {
    records.push({ date: "2026-08-05", time: "15:10", displayTime: "8 月 5 日 15:10", customer: "华东智造科技", channel: "电话", businessLine: "商旅", businessLines: ["商旅"], subject: "旧版报价口径沟通", summary: "双方核对了旧版报价的服务范围与计费口径。" });
  }
  const visible = state.archivedRecord
    ? records.filter((row) => row.subject !== state.archivedRecord.subject)
    : records;
  return visible.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
}

function getPendingTodos() {
  const baseTodos = [
    { kind: "客户查重", priorityClass: "important", title: "选择重复客户或提交加入审批", context: "华东智造科技", action: "open-dedupe-candidate" },
    { kind: "权限申请", priorityClass: "important", title: "商旅业务线申请等待审批", context: "远航国际商旅", action: "open-line-access-pending" },
    { kind: "日程结束", priorityClass: "important", title: "记录本次沟通或确认未发生", context: "客户线下拜访 · 今天 10:30", action: "open-expired-schedule" },
    { kind: "材料失败", priorityClass: "normal", title: "重新处理材料或转手工录入", context: "华东智造科技会议纪要", action: "open-failed-material" },
    { kind: "管理者指派", priorityClass: "normal", title: "核对海天科技客户归属", context: "李经理指派 · 今天 09:15", action: "open-manager-assignment" }
  ];
  const aiDraftTodo = state.aiDraftStatus === "confirmed"
    ? []
    : [{ kind: "AI 草稿", priorityClass: "normal", title: "确认华东智造科技沟通记录", context: "AI 已完成整理", action: "open-ready-draft" }];
  return [...aiDraftTodo, ...baseTodos, ...state.createdWorkbenchTodos]
    .sort((a, b) => Number(a.priorityClass !== "important") - Number(b.priorityClass !== "important"));
}

function pendingTodoRow(item) {
  return `<button class="todo-row" type="button" data-action="${item.action}"><span class="todo-copy"><span class="todo-labels"><span class="todo-kind ${item.priorityClass}">${escapeHtml(item.priorityClass === "important" ? "重要" : "普通")}</span><small>${escapeHtml(item.kind || "待处理")}</small></span><strong>${escapeHtml(item.title)}</strong><small class="todo-context">${escapeHtml(item.context || "")}</small></span><span class="item-action" aria-hidden="true">›</span></button>`;
}

function workbenchScreen() {
  const schedules = getSchedules();
  const todos = getPendingTodos();
  if (state.workbenchView === "pending") return workbenchPendingScreen(todos);
  const currentSchedules = schedules.filter((item) => item.date === PROTOTYPE_TODAY);
  const recentRecords = getFormalRecords().filter((row) => row.date === PROTOTYPE_TODAY);
  const scheduleRows = currentSchedules.map((item) => {
    return `<button class="schedule-row" type="button" data-action="open-workbench-calendar"><time datetime="${item.date}T${item.time}"><strong>${escapeHtml(item.time)}${item.endTime ? "-" : ""}</strong>${item.endTime ? `<strong>${escapeHtml(item.endTime)}</strong>` : ""}</time><span class="follow-up-preview-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(scheduleMeta(item))}</small></span><span class="item-action" aria-hidden="true">›</span></button>`;
  }).join("");
  const todoRows = todos.slice(0, 2).map(pendingTodoRow).join("");
  const recentRows = recentRecords.map((row) => `<button class="recent-follow-up-row" type="button" data-action="select-record" data-customer="${escapeHtml(row.customer)}" data-time="${escapeHtml(row.displayTime)}" data-channel="${escapeHtml(row.channel)}" data-business-line="${escapeHtml(recordBusinessLines(row)[0] || "")}" data-business-lines="${escapeHtml(recordBusinessLines(row).join("|"))}" data-subject="${escapeHtml(row.subject)}"><time datetime="${row.date}T${row.time}">${escapeHtml(row.time)}</time><span class="follow-up-preview-copy"><strong>${escapeHtml(row.subject)}</strong><small>${escapeHtml(row.customer)} · ${escapeHtml(businessLineLabel(row))} · ${escapeHtml(row.channel)}</small></span><span class="item-action" aria-hidden="true">›</span></button>`).join("");
  return mobileFrame({
    title: "", nav: "workbench", hideHeader: true,
    body: `<h2 class="visually-hidden">工作台</h2><div class="workbench-identity"><div class="workbench-person"><strong>张雨</strong><span class="identity-divider" aria-hidden="true"></span><span>海天科技集团</span></div><div class="workbench-head-tools"><span class="workbench-header-date"><strong>周四</strong><small>08.27</small></span><button class="workbench-notification" type="button" data-action="toggle-workbench-notifications" title="通知" aria-label="通知${state.workbenchHasUnread ? "，有未读消息" : ""}" aria-expanded="${state.workbenchNotificationOpen}" aria-controls="workbenchNotificationPanel"><span aria-hidden="true">🔔</span>${state.workbenchHasUnread ? `<i aria-hidden="true"></i>` : ""}</button></div>${state.workbenchNotificationOpen ? `<div class="workbench-notification-panel" id="workbenchNotificationPanel" role="dialog" aria-label="通知"><div class="notification-panel-heading"><strong>通知</strong></div><div class="notification-item"><strong>商旅业务线加入申请已通过</strong><small>远见数字供应链 · 1 小时前</small></div><button class="text-button full-button" type="button" data-action="mark-workbench-notifications-read">标为已读</button></div>` : ""}</div>
      <div class="workbench-actions"><button class="workbench-action-module customer-module" type="button" data-action="start-customer-create"><span aria-hidden="true">＋</span><strong>新增客户</strong></button><button class="workbench-action-module follow-up-module" type="button" data-screen="ai-material"><span aria-hidden="true">＋</span><strong>新增沟通记录</strong></button></div>
      <section class="workbench-follow-up-overview"><div class="workbench-section-heading"><h3>跟进记录</h3><button class="section-more" type="button" data-action="open-all-records">查看全部 ›</button></div><section class="workbench-overview-card follow-up-type-card schedule-preview-card"><div class="workbench-card-heading"><div class="heading-summary"><span class="follow-up-color-label" aria-hidden="true"></span><h3>今日日程</h3></div><span>${currentSchedules.length} 条</span></div><div class="workbench-card-list">${scheduleRows || `<div class="workbench-empty">今日暂无日程</div>`}</div></section><section class="workbench-overview-card follow-up-type-card communication-preview-card"><div class="workbench-card-heading"><div class="heading-summary"><span class="follow-up-color-label" aria-hidden="true"></span><h3>最近沟通</h3></div><span>近 1 天 · ${recentRecords.length} 条</span></div><div class="workbench-card-list">${recentRows || `<div class="workbench-empty">最近 1 天暂无沟通记录</div>`}</div></section></section>
      <section class="workbench-overview-card pending-overview"><div class="workbench-card-heading"><div class="heading-summary"><h3>待处理</h3><span>${todos.length} 项</span></div><button class="section-more" type="button" data-action="open-workbench-pending">更多 ›</button></div><div class="workbench-card-list">${todoRows}</div></section>`
  });
}

function workbenchPendingScreen(todos) {
  const active = state.workbenchPendingTab === "active";
  const rows = active
    ? todos.map(pendingTodoRow).join("")
    : `<div class="todo-row processed-row"><span class="todo-copy"><span class="todo-labels"><span class="todo-kind normal">已处理</span><small>AI 草稿</small></span><strong>确认华东智造科技沟通记录</strong><small class="todo-context">已处理 · 今天 10:32</small></span></div>`;
  return mobileFrame({
    title: "全部待处理", subtitle: active ? "重要事项优先" : "仅显示最近一周", back: "workbench",
    body: `<div class="mobile-segmented pending-tabs"><button class="segment-button ${active ? "active" : ""}" type="button" data-action="set-workbench-pending-tab" data-tab="active">待处理</button><button class="segment-button ${!active ? "active" : ""}" type="button" data-action="set-workbench-pending-tab" data-tab="processed">已处理</button></div><section class="workbench-overview-card pending-list-full"><div class="workbench-card-list">${rows}</div></section>`
  });
}

function customersScreen() {
  const customerRows = [
    { name: "华东智造科技", shortName: "华东智造", contact: "王磊 · 采购总监", mobile: "138****6621", businessLines: [{ line: "企业用车", stage: "潜在" }, { line: "商旅", stage: "跟进中" }, { line: "会奖服务", stage: "合作中" }] },
    { name: "远见数字供应链", shortName: "远见供应链", contact: "陈嘉 · 运营经理", mobile: "139****2806", businessLines: [{ line: "商旅", stage: "潜在" }, { line: "会奖服务", stage: "跟进中" }] },
    { name: "新港工业设备", shortName: "新港工业", contact: "周宁 · 行政主管", mobile: "137****9012", businessLines: [{ line: "企业用车", stage: "合作中" }] },
    { name: "澄海精密制造", shortName: "澄海精密", contact: "赵敏 · 行政经理", mobile: "136****5178", businessLines: [{ line: "会奖服务", stage: "已终止" }] }
  ];
  if (state.restored["inactive-customer"]) customerRows.push({ name: "北辰工业系统", shortName: "北辰工业", contact: "暂无联系人", mobile: "", businessLines: [{ line: "商旅", stage: "潜在" }] });
  const relations = ["潜在", "跟进中", "合作中", "已终止"];
  const filteredRows = customerRows.filter((row) => row.businessLines.some((item) =>
    (!state.customerBusinessLineFilter || item.line === state.customerBusinessLineFilter)
      && (!state.customerRelationFilter || item.stage === state.customerRelationFilter)));
  const activeCount = [state.customerBusinessLineFilter, state.customerRelationFilter].filter(Boolean).length;
  let resultCount = 38;
  if (state.customerBusinessLineFilter) resultCount = Math.min(resultCount, 32);
  if (state.customerRelationFilter) resultCount = Math.min(resultCount, 24);
  const quickTags = [
    state.customerBusinessLineFilter ? ["businessLine", state.customerBusinessLineFilter] : null,
    state.customerRelationFilter ? ["relation", `阶段：${state.customerRelationFilter}`] : null
  ].filter(Boolean);
  return mobileFrame({
    title: "客户", nav: "customers",
    action: `<button class="mobile-icon-button" type="button" data-action="start-customer-create" title="新增客户" aria-label="新增客户">+</button>`,
    body: `<div class="customer-search-row"><input id="customerSearch" class="search-box" type="search" placeholder="搜索客户、联系人或手机号" aria-label="搜索客户、联系人或手机号"><button class="customer-filter-button" type="button" data-action="toggle-filters" data-scope="customer" aria-expanded="${state.customerFiltersOpen}">筛选${activeCount ? `<b>${activeCount}</b>` : ""}</button></div>
      ${quickTags.length ? `<div class="quick-filter-strip" aria-label="已选筛选条件">${quickTags.map(([key, label]) => `<button class="quick-filter-tag" type="button" data-action="remove-customer-filter" data-filter="${key}">${escapeHtml(label)} <span>×</span></button>`).join("")}</div>` : ""}
      <div class="customer-list-toolbar"><strong>共 ${resultCount} 家客户</strong><div class="customer-sort-menu"><button class="customer-sort-trigger" type="button" data-action="toggle-customer-sort" aria-expanded="${state.customerSortMenuOpen}">${escapeHtml(state.customerSort)}⌄</button>${state.customerSortMenuOpen ? `<div class="compact-menu">${["最近沟通", "最近创建"].map((item) => `<button class="${state.customerSort === item ? "active" : ""}" type="button" data-action="set-customer-sort" data-value="${item}">${item}</button>`).join("")}</div>` : ""}</div></div>
      ${filteredRows.length ? `<div class="list-panel customer-results">${filteredRows.map(customerRow).join("")}</div><div class="notice" data-search-empty hidden>没有找到匹配客户。</div>` : `<div class="notice">当前条件下没有客户。</div>`}
      ${state.customerFiltersOpen ? `<div class="customer-filter-overlay" role="dialog" aria-modal="true" aria-labelledby="customerFilterTitle"><button class="filter-sheet-scrim" type="button" data-action="close-customer-filters" aria-label="关闭筛选"></button><section class="customer-filter-sheet"><header><strong id="customerFilterTitle">筛选客户</strong><button class="text-button" type="button" data-action="reset-customer-filters">重置</button></header><div class="customer-filter-body"><div class="sheet-filter-group"><span>业务线</span><div>${BUSINESS_LINES.map((line) => `<button class="sheet-option ${state.customerBusinessLineFilter === line ? "active" : ""}" type="button" data-action="set-customer-line-filter" data-value="${line}">${line}</button>`).join("")}</div></div><div class="sheet-filter-group"><span>合作阶段</span><div>${relations.map((relation) => `<button class="sheet-option ${state.customerRelationFilter === relation ? "active" : ""}" type="button" data-action="set-customer-filter" data-value="${relation}">${relation}</button>`).join("")}</div></div></div><button class="primary-button filter-result-button" type="button" data-action="apply-customer-filters">查看 ${resultCount} 家客户</button></section></div>` : ""}`
  });
}

function customerRow(row) {
  const contextualLine = row.businessLines.find((item) =>
    (!state.customerBusinessLineFilter || item.line === state.customerBusinessLineFilter)
      && (!state.customerRelationFilter || item.stage === state.customerRelationFilter)) || row.businessLines[0];
  const lineCount = row.businessLines.length > 1 ? `<small class="customer-line-count">${row.businessLines.length} 条业务线</small>` : "";
  const contextPrefix = row.businessLines.length > 1 && !state.customerBusinessLineFilter && !state.customerRelationFilter ? "最近 · " : "";
  return `<button class="customer-card customer-list-row" type="button" data-action="select-customer" data-customer="${row.name}" data-search-row data-search-text="${row.name} ${row.shortName} ${row.contact} ${row.mobile}"><span class="customer-copy"><span class="customer-name-line"><strong>${row.name}</strong>${lineCount}</span><span class="customer-context-line">${contextPrefix}${contextualLine.line} · ${contextualLine.stage}</span></span></button>`;
}

function customerRelationsForName(name) {
  if (name.includes("华东智造")) return [
    { line: "商旅", stage: "跟进中", owners: [{ role: "前端销售", person: "张雨" }, { role: "后端销售", person: "李程" }], contacts: ["王磊"], lastTime: "8 月 21 日 14:20", lastChannel: "电话", lastSubject: "实施周期与报价方案沟通", lastSummary: "客户认可初步方案，希望补充实施周期、交付边界和正式报价。" },
    { line: "会奖服务", stage: "合作中", owners: [{ role: "项目经理", person: "陈晓" }], contacts: ["王磊"], lastTime: "8 月 16 日 11:00", lastChannel: "线上会议", lastSubject: "年度会议执行确认", lastSummary: "双方已确认会议执行范围和交付时间。" },
    { line: "企业用车", stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }], contacts: ["周宁"], lastTime: "今天 10:00", lastChannel: "线下拜访", lastSubject: "工厂用车需求访谈", lastSummary: "客户正在整理班车线路和车辆需求。" }
  ];
  if (name.includes("远见")) return [
    { line: "商旅", stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }, { role: "后端销售", person: "李程" }], contacts: ["陈嘉"], lastTime: "8 月 18 日 09:30", lastChannel: "线上会议", lastSubject: "数据接口范围确认", lastSummary: "双方确认首期接口范围，待进一步核对字段清单。" },
    { line: "会奖服务", stage: "跟进中", owners: [{ role: "项目经理", person: "陈晓" }], contacts: ["陈嘉"], lastTime: "8 月 12 日 14:00", lastChannel: "线下拜访", lastSubject: "年度会议需求沟通", lastSummary: "客户正在确认参会规模和举办城市。" }
  ];
  return [{ line: state.customerBusinessLine || "商旅", stage: state.customerRelation || "潜在", owners: [{ role: "前端销售", person: state.customerFrontendSales || "张雨" }], contacts: state.customerContactName ? [state.customerContactName] : [], lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: "" }];
}

function sameCustomer(left, right) {
  const normalize = (value) => String(value || "").replace(/有限责任公司|有限公司/g, "").trim();
  return normalize(left) === normalize(right);
}

function dedupeScreen() {
  const strong = state.dedupeStage === "strong";
  const restricted = state.dedupeStage === "restricted";
  const selectedLine = state.customerBusinessLine || "未选择业务线";
  const lineExists = state.dedupeExistingBusinessLines.includes(selectedLine);
  if (restricted) {
    return mobileFrame({
      title: "发现已有客户", subtitle: `客户主体与${selectedLine}业务线查重`, back: "customer-form",
      body: `<div class="notice warning"><strong>${lineExists ? "客户及业务线已存在" : "客户已存在，业务线尚未建立"}</strong><br>你暂无该客户的资料权限，系统仅展示查重所需的脱敏结果。</div>
        <div class="glass-panel"><div class="identity-strip"><span class="avatar">远</span><span><strong>远航国际商旅****</strong><span><b class="match-reason">客户名称重复</b></span></span><span class="status-chip inactive">无权限</span></div></div>
        <div class="glass-panel dedupe-line-result"><div class="fact-row"><dt>本次选择</dt><dd>${escapeHtml(selectedLine)}</dd></div><div class="fact-row"><dt>业务线状态</dt><dd>${lineExists ? "已建立" : "尚未建立"}</dd></div></div>
        ${state.dedupeAccessRequested ? `<div class="notice success">申请已提交给客户负责人和业务管理员。</div>` : `<div class="notice">${lineExists ? `不能重复建立${escapeHtml(selectedLine)}业务线，请申请加入跟进。` : `无需重复创建客户，可申请为已有客户新增${escapeHtml(selectedLine)}业务线。`}</div>`}
        <div class="button-row"><button class="secondary-button" type="button" data-screen="customer-form">返回修改</button><button class="primary-button" type="button" data-action="request-restricted-access" ${state.dedupeAccessRequested ? "disabled" : ""}>${state.dedupeAccessRequested ? "已提交申请" : lineExists ? `申请加入${escapeHtml(selectedLine)}` : `申请新增${escapeHtml(selectedLine)}`}</button></div>`
    });
  }
  if (strong) {
    return mobileFrame({
      title: lineExists ? "发现重复业务线" : "发现已有客户", subtitle: `客户主体与${selectedLine}业务线查重`, back: "customer-form",
      body: `<div class="notice ${lineExists ? "danger" : "warning"}"><strong>${lineExists ? "客户名称重复" : "系统中已有该客户"}</strong><br>${lineExists ? `${escapeHtml(selectedLine)}业务线已存在，不能重复建立。` : `尚未关联“${escapeHtml(selectedLine)}”业务线，无需重复创建客户。`}</div>
        <div class="glass-panel"><div class="identity-strip"><span class="avatar">华</span><span><strong>华东智造科技有限公司</strong><span>${lineExists ? `${escapeHtml(selectedLine)} · 已建立` : `现有业务线：${escapeHtml(state.dedupeExistingBusinessLines.join("、"))}`}</span></span></div></div>
        <div class="button-row"><button class="secondary-button" type="button" data-screen="customer-form">返回修改</button><button class="primary-button" type="button" data-action="${lineExists ? "open-existing-business-line" : "add-existing-customer-line"}">${lineExists ? `查看${escapeHtml(selectedLine)}` : `新增${escapeHtml(selectedLine)}业务线`}</button></div>`
    });
  }
  return mobileFrame({
    title: "发现近似客户", subtitle: `正在核对${selectedLine}业务线`, back: "customer-form",
    body: `<div class="notice warning">系统发现 2 个名称近似客户。请先判断是否为同一企业，再确认${escapeHtml(selectedLine)}业务线关系。</div>
      <div class="list-panel">
        <button class="customer-card" type="button" data-action="select-duplicate" data-customer="华东智造科技有限公司"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造科技有限公司</strong><span><b class="match-reason">名称高度相似 · 联系人王磊相同</b><br>${escapeHtml(selectedLine)}业务线${lineExists ? "已建立" : "尚未建立"}</span></span><span class="item-action">选择 ›</span></button>
        <button class="customer-card" type="button" data-action="select-duplicate" data-customer="华东智造装备（苏州）"><span class="avatar">华</span><span class="customer-copy"><strong>华东智造装备（苏州）</strong><span><b class="match-reason">名称包含“华东智造”</b><br>${escapeHtml(selectedLine)}业务线尚未建立</span></span><span class="item-action">选择 ›</span></button>
      </div>
      ${state.dedupeOverrideOpen ? `<div class="glass-panel"><span class="field-label">选择继续新增原因</span><div class="filter-row">${["独立法人主体", "不同地区分公司", "名称相似但主体不同"].map((reason) => `<button class="chip ${state.dedupeOverrideReason === reason ? "active" : ""}" type="button" data-action="set-override-reason" data-value="${reason}">${reason === "名称相似但主体不同" ? "主体不同" : reason}</button>`).join("")}</div><label class="field"><span>补充说明（选填）</span><textarea id="overrideReason" maxlength="500" placeholder="必要时补充说明">${escapeHtml(state.dedupeOverrideDetail)}</textarea></label>${state.dedupeError ? `<span class="field-error">${escapeHtml(state.dedupeError)}</span>` : ""}<button class="primary-button full-button" type="button" data-action="confirm-override">确认原因并保存客户</button></div>` : `<div class="button-row"><button class="secondary-button" type="button" data-screen="customer-form">返回修改</button><button class="primary-button" type="button" data-action="continue-new">均不是同一企业</button></div>`}`
  });
}

function customerFormScreen() {
  const createMode = state.customerFormMode === "create";
  const ownerAssignments = state.customerOwnerAssignments?.length
    ? state.customerOwnerAssignments
    : [{ role: "前端销售", person: state.customerFrontendSales || "张雨" }];
  const usedOwnerRoles = ownerAssignments.map((item) => item.role);
  const ownerRows = ownerAssignments.map((assignment, index) => `<div class="collaboration-role-row" data-owner-assignment data-owner-index="${index}">
    <div class="collaboration-role-head"><strong>负责人 ${index + 1}</strong>${index ? `<button class="text-button" type="button" data-action="remove-customer-owner" data-index="${index}">删除</button>` : ""}</div>
    <div class="field-grid"><label class="field"><span>角色 <em>*</em></span><select class="customer-owner-role" aria-label="负责人 ${index + 1} 角色">${CUSTOMER_OWNER_ROLES.map((role) => `<option value="${role}" ${assignment.role === role ? "selected" : ""} ${assignment.role !== role && usedOwnerRoles.includes(role) ? "disabled" : ""}>${role}</option>`).join("")}</select></label><label class="field"><span>负责人员${index ? "" : " *"}</span><select class="customer-owner-person" aria-label="负责人 ${index + 1} 人员"><option value="">待分配</option>${CUSTOMER_OWNER_PEOPLE.map((person) => `<option value="${person}" ${assignment.person === person ? "selected" : ""}>${person}</option>`).join("")}</select></label></div>
  </div>`).join("");
  const addresses = state.customerAddresses?.length ? state.customerAddresses : [{ country: "中国", province: "", city: "", detail: "" }];
  const addressRows = addresses.map((address, index) => `<div class="customer-address-row" data-customer-address data-address-index="${index}"><div class="customer-address-head"><strong>地址 ${index + 1}</strong><label><input type="radio" name="customerPrimaryAddress" value="${index}" data-action="set-primary-customer-address" ${state.customerPrimaryAddressIndex === index ? "checked" : ""}> 主地址</label>${addresses.length > 1 ? `<button class="text-button" type="button" data-action="remove-customer-address" data-index="${index}">删除</button>` : ""}</div><div class="field-grid"><label class="field"><span>国家</span><input class="customer-address-country" value="${escapeHtml(address.country)}"></label><label class="field"><span>省份</span><input class="customer-address-province" value="${escapeHtml(address.province)}"></label><label class="field"><span>城市</span><input class="customer-address-city" value="${escapeHtml(address.city)}"></label></div><label class="field"><span>详细地址</span><input class="customer-address-detail" value="${escapeHtml(address.detail)}"></label></div>`).join("");
  return mobileFrame({
    title: createMode ? "新增客户" : "编辑客户", subtitle: "填写基本信息即可完成建档", back: "customers",
    body: `${state.customerFormError ? `<div class="notice danger">${escapeHtml(state.customerFormError)}</div>` : ""}
      <details class="form-section" open><summary>客户信息</summary><div class="form-body">
        <label class="field ${state.customerFormError ? "has-error" : ""}"><span>企业全称 <em>*</em></span><div class="field-action-row"><input id="customerName" maxlength="200" value="${escapeHtml(state.customerName)}"><button class="secondary-button field-action-button" type="button" data-action="check-customer-duplicate">查重</button></div>${state.customerDedupeStatus === "clear" ? `<small class="dedupe-success" data-dedupe-status>暂未发现近似客户，保存时将再次校验 <strong>✓</strong></small>` : ""}</label>
        <label class="field"><span>企业简称</span><input id="customerShortName" value="${escapeHtml(state.customerShortName)}" placeholder="选填，便于搜索和识别"></label>
        <div class="choice-field"><span>业务线 <em>*</em></span><input id="customerBusinessLine" type="hidden" value="${escapeHtml(state.customerBusinessLine)}"><div class="choice-row">${BUSINESS_LINES.map((line) => `<button class="choice-button ${state.customerBusinessLine === line ? "active" : ""}" type="button" data-action="set-customer-form-choice" data-field="businessLine" data-value="${line}">${line}</button>`).join("")}</div></div>
        <div class="choice-field"><span>合作阶段 <em>*</em></span><input id="customerRelation" type="hidden" value="${escapeHtml(state.customerRelation)}"><div class="choice-row">${["潜在", "跟进中", "合作中", "已终止"].map((relation) => `<button class="choice-button ${state.customerRelation === relation ? "active" : ""}" type="button" data-action="set-customer-form-choice" data-field="relation" data-value="${relation}">${relation}</button>`).join("")}</div></div>
        <div class="field-grid"><label class="field"><span>客户来源</span><select id="customerSource"><option value="">请选择</option>${["销售自拓", "客户转介绍", "市场活动", "其他"].map((item) => `<option ${state.customerSource === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>行业</span><select id="customerIndustry"><option value="">请选择</option>${["企业服务 / 商旅管理", "制造业", "信息技术", "其他"].map((item) => `<option ${state.customerIndustry === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div>
        <label class="field"><span>上级客户</span><input id="customerParentName" value="${escapeHtml(state.customerParentName)}" placeholder="集团或母公司，选填"></label>
      </div></details>
      <details class="form-section" open><summary>联系人与跟进负责人</summary><div class="form-body">
        <div class="form-subheading"><strong>联系人</strong><span>选填</span></div><label class="field"><span>姓名</span><input id="customerContactName" placeholder="不知道可留空" value="${escapeHtml(state.customerContactName)}"></label><div class="field-grid"><label class="field"><span>手机号</span><input id="customerContactMobile" type="tel" value="${escapeHtml(state.customerContactMobile)}" placeholder="如 13800000000"></label><label class="field"><span>部门</span><input id="customerContactDepartment" value="${escapeHtml(state.customerContactDepartment)}" placeholder="选填"></label><label class="field"><span>职位</span><input id="customerContactTitle" value="${escapeHtml(state.customerContactTitle)}" placeholder="客观职位"></label><label class="field"><span>微信</span><input id="customerContactWechat" value="${escapeHtml(state.customerContactWechat)}" placeholder="选填"></label></div><label class="field"><span>邮箱</span><input id="customerContactEmail" type="email" value="${escapeHtml(state.customerContactEmail)}" placeholder="name@example.com"></label><label class="field"><span>联系人备注</span><textarea id="customerContactRemark" class="compact-textarea" rows="2" placeholder="简短补充">${escapeHtml(state.customerContactRemark)}</textarea></label>
        <div class="form-subheading owner-heading"><strong>客户跟进负责人</strong><span>角色由管理员配置</span></div>${ownerRows}${ownerAssignments.length < CUSTOMER_OWNER_ROLES.length ? `<button class="secondary-button full-button add-owner-button" type="button" data-action="add-customer-owner">+ 添加负责人</button>` : ""}
      </div></details>
      <details class="form-section" ${state.customerMoreDetailsOpen ? "open" : ""}><summary>更多企业资料</summary><div class="form-body">
        <div class="field-grid"><label class="field"><span>企业性质</span><select id="customerNature"><option value="">未知</option>${["国有企业", "民营企业", "外资企业", "其他"].map((item) => `<option ${state.customerNature === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>员工人数</span><input id="customerEmployeeCount" type="number" min="0" value="${escapeHtml(state.customerEmployeeCount)}" placeholder="未知留空"></label><label class="field"><span>营收区间</span><select id="customerRevenueRange"><option value="">未知</option>${["5000 万以下", "5000 万–1 亿", "1 亿–5 亿", "5 亿以上"].map((item) => `<option ${state.customerRevenueRange === item ? "selected" : ""}>${item}</option>`).join("")}</select></label><label class="field"><span>是否上市</span><select id="customerListed"><option value="">未知</option><option value="是" ${state.customerListed === "是" ? "selected" : ""}>是</option><option value="否" ${state.customerListed === "否" ? "selected" : ""}>否</option></select></label></div>
        <label class="field"><span>统一社会信用代码</span><input id="customerUscc" value="${escapeHtml(state.customerUscc)}" placeholder="不清楚可留空"><small class="field-hint">仅用于精确识别同名企业。</small></label><label class="field"><span>工商注册号</span><input id="customerRegistrationNo" value="${escapeHtml(state.customerRegistrationNo)}" placeholder="选填"></label><label class="field"><span>成立日期</span><input id="customerEstablishedDate" type="date" value="${escapeHtml(state.customerEstablishedDate)}"></label><div class="field-grid"><label class="field"><span>注册资本</span><input id="customerRegisteredCapital" type="number" min="0" value="${escapeHtml(state.customerRegisteredCapital)}" placeholder="未知留空"></label><label class="field"><span>币种</span><select id="customerCapitalCurrency">${["CNY", "USD", "HKD"].map((item) => `<option ${state.customerCapitalCurrency === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div>
        <div class="field-grid"><label class="field"><span>企业电话</span><input id="customerMainPhone" type="tel" value="${escapeHtml(state.customerMainPhone)}"></label><label class="field"><span>企业邮箱</span><input id="customerPublicEmail" type="email" value="${escapeHtml(state.customerPublicEmail)}"></label></div><label class="field"><span>官网</span><input id="customerWebsite" type="url" value="${escapeHtml(state.customerWebsite)}" placeholder="https://"></label><label class="field"><span>公众号</span><input id="customerOfficialAccount" value="${escapeHtml(state.customerOfficialAccount)}"></label>${addressRows}<button class="secondary-button full-button add-address-button" type="button" data-action="add-customer-address">+ 添加地址</button><label class="field"><span>备注</span><textarea id="customerRemark" maxlength="1000" placeholder="标准字段之外的简短补充">${escapeHtml(state.customerRemark)}</textarea></label>
      </div></details>${draftExitDialog("customer")}`,
    sticky: `<div class="screen-actions"><button class="primary-button full-button" type="button" data-action="save-customer"><span class="confirm-dot"></span>保存客户</button></div>`
  });
}

function customerDetailScreen() {
  const tabs = [
    ["overview", "概览"], ["contacts", "联系人"], ["timeline", "沟通记录"]
  ];
  const relations = state.customerBusinessRelations?.length ? state.customerBusinessRelations : [{
    line: state.customerBusinessLine, stage: state.customerRelation,
    owners: state.customerOwnerAssignments || [], contacts: state.customerContactName ? [state.customerContactName] : [],
    lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: ""
  }];
  const selectedRelation = state.customerDetailBusinessLine === "all"
    ? null
    : relations.find((item) => item.line === state.customerDetailBusinessLine) || relations[0];
  const visibleRelations = selectedRelation ? [selectedRelation] : relations;
  const lineSummary = relations.map((item) => `<button class="business-line-summary" type="button" data-action="set-detail-business-line" data-value="${escapeHtml(item.line)}"><span><strong>${escapeHtml(item.line)}</strong><small>${item.owners.map((owner) => `${owner.role} ${owner.person || "待分配"}`).join(" · ")}</small></span><span class="status-chip ${["合作中", "已终止"].includes(item.stage) ? "formal" : "draft"}">${escapeHtml(item.stage)}</span></button>`).join("");
  const recentRows = visibleRelations.map((item) => `<button class="recent-communication" type="button" data-action="set-customer-tab" data-tab="timeline"><span class="recent-communication-head"><strong>${escapeHtml(item.lastSubject)}</strong>${selectedRelation ? "" : `<span>${escapeHtml(item.line)}</span>`}</span><small>${escapeHtml([item.lastTime, item.lastChannel].filter(Boolean).join(" · "))}</small>${item.lastSummary ? `<p>${escapeHtml(item.lastSummary)}</p>` : ""}</button>`).join("");
  const ownerRows = visibleRelations.map((item) => `<div class="line-owner-group">${selectedRelation ? "" : `<strong class="line-owner-title">${escapeHtml(item.line)}</strong>`}${item.owners.map((owner) => `<div class="system-item"><span class="avatar compact-avatar">${escapeHtml((owner.person || "待").slice(0, 1))}</span><span class="system-copy"><strong>${escapeHtml(owner.person || "待分配")}</strong><span>${escapeHtml(owner.role)}</span></span></div>`).join("")}</div>`).join("");
  const contactNames = [...new Set(visibleRelations.flatMap((item) => item.contacts || []))];
  const contacts = contactNames.length ? contactNames.map((name) => {
    const relatedLines = relations.filter((item) => item.contacts?.includes(name)).map((item) => item.line);
    const knownPrimary = name === state.customerContactName;
    return `<div class="customer-card compact-contact"><span class="avatar">${escapeHtml(name.slice(0, 1))}</span><span class="customer-copy"><strong>${escapeHtml(name)}${knownPrimary ? ` <small>主要联系人</small>` : ""}</strong><span>${escapeHtml(knownPrimary ? [state.customerContactDepartment, state.customerContactTitle].filter(Boolean).join(" · ") || "职位待补充" : "联系人")}<br>${escapeHtml(knownPrimary ? state.customerContactMobile || "联系方式待补充" : "联系方式待补充")}<br>关联业务线：${escapeHtml(relatedLines.join("、"))}</span></span></div>`;
  }).join("") : `<div class="notice">当前业务线暂未关联联系人。</div>`;
  const addresses = state.customerAddresses?.length ? state.customerAddresses : [{ country: state.customerCountry, province: state.customerProvince, city: state.customerCity, detail: state.customerDetailAddress }];
  const addressRows = addresses.map((address, index) => `<div class="fact-row"><dt>地址 ${index + 1}${state.customerPrimaryAddressIndex === index ? " · 主地址" : ""}</dt><dd>${escapeHtml([address.country, address.province, address.city, address.detail].filter(Boolean).join(" ") || "待补充")}</dd></div>`).join("");
  const primaryAddress = addresses[state.customerPrimaryAddressIndex] || addresses[0];
  const primaryAddressText = primaryAddress ? [primaryAddress.country, primaryAddress.province, primaryAddress.city, primaryAddress.detail].filter(Boolean).join(" ") : "";
  const customerSummaryRows = [
    state.customerIndustry ? `<div class="fact-row"><dt>所属行业</dt><dd>${escapeHtml(state.customerIndustry)}</dd></div>` : "",
    state.customerSource ? `<div class="fact-row"><dt>客户来源</dt><dd>${escapeHtml(state.customerSource)}</dd></div>` : "",
    primaryAddressText ? `<div class="fact-row"><dt>主地址</dt><dd>${escapeHtml(primaryAddressText)}</dd></div>` : "",
    state.customerParentName ? `<div class="fact-row"><dt>上级客户</dt><dd>${escapeHtml(state.customerParentName)}</dd></div>` : ""
  ].join("");
  const customerInfo = `<div class="glass-panel"><div class="section-heading"><h3>客户信息</h3></div><dl class="fact-list">${customerSummaryRows}</dl><details class="inline-details"><summary>企业详细信息</summary><dl class="fact-list"><div class="fact-row"><dt>企业简称</dt><dd>${escapeHtml(state.customerShortName || state.customerName.replace(/有限公司$/, ""))}</dd></div><div class="fact-row"><dt>客户编码</dt><dd>C-20260821017</dd></div><div class="fact-row"><dt>信用代码</dt><dd>${escapeHtml(state.customerUscc || "待补充")}</dd></div>${addressRows}${state.customerRemark ? `<div class="fact-row"><dt>备注</dt><dd>${escapeHtml(state.customerRemark)}</dd></div>` : ""}</dl></details></div>`;
  const customerTimelineRecords = getFormalRecords().filter((row) => sameCustomer(row.customer, state.customerName)
    && (!selectedRelation || recordBusinessLines(row).includes(selectedRelation.line)));
  const customerTimeline = customerTimelineRecords.length
    ? customerTimelineRecords.map((row) => `<button class="timeline-item customer-timeline-record" type="button" data-action="select-record" data-customer="${escapeHtml(row.customer)}" data-time="${escapeHtml(row.displayTime)}" data-channel="${escapeHtml(row.channel)}" data-business-line="${escapeHtml(recordBusinessLines(row)[0] || "")}" data-business-lines="${escapeHtml(recordBusinessLines(row).join("|"))}" data-subject="${escapeHtml(row.subject)}"><strong>${escapeHtml(row.subject)}</strong><span>${escapeHtml(row.displayTime)} · ${escapeHtml(row.channel)} · ${escapeHtml(businessLineLabel(row))}</span><p>${escapeHtml(row.summary)}</p></button>`).join("")
    : `<div class="follow-up-empty"><strong>暂无正式沟通记录</strong><span>草稿和待处理不会出现在客户时间线中。</span></div>`;
  const content = {
    overview: `${selectedRelation ? "" : `<div class="glass-panel"><div class="section-heading"><h3>业务线状态</h3><button class="text-button" type="button" data-action="add-customer-business-line">+ 新增业务线</button></div><div class="business-line-list">${lineSummary}</div></div>`}<div class="glass-panel"><div class="section-heading"><h3>最近沟通</h3><button class="text-button" type="button" data-action="set-customer-tab" data-tab="timeline">查看全部 ›</button></div>${recentRows}</div><div class="glass-panel"><div class="section-heading"><h3>跟进负责人</h3><button class="text-button" type="button" data-action="edit-customer">管理 ›</button></div>${ownerRows}</div><div class="glass-panel"><div class="section-heading"><h3>主要联系人</h3><button class="text-button" type="button" data-action="set-customer-tab" data-tab="contacts">查看全部 ›</button></div>${contacts}</div>${customerInfo}`,
    contacts: `<div class="section-heading page-section-heading"><h3>${selectedRelation ? `${escapeHtml(selectedRelation.line)}联系人` : "全部联系人"}</h3><span>${contactNames.length} 人</span></div><div class="list-panel">${contacts}</div><button class="secondary-button full-button" type="button" data-action="add-detail-subobject" data-kind="contact">新增联系人</button>`,
    timeline: `<div class="section-heading page-section-heading"><h3>${selectedRelation ? `${escapeHtml(selectedRelation.line)}沟通记录` : "全部业务线沟通记录"}</h3><span>正式沟通 · 时间倒序</span></div><div class="glass-panel"><div class="timeline customer-record-timeline">${customerTimeline}</div></div>`
  }[state.customerTab];
  return mobileFrame({
    title: state.customerName, back: "customers",
    body: `<div class="glass-panel customer-detail-context"><div class="detail-line-heading"><strong>业务线视图</strong>${selectedRelation ? `<span class="status-chip draft">${escapeHtml(selectedRelation.stage)}</span>` : `<span>${relations.length} 条业务线</span>`}</div><div class="detail-line-tabs"><button class="${state.customerDetailBusinessLine === "all" ? "active" : ""}" type="button" data-action="set-detail-business-line" data-value="all">全部</button>${relations.map((item) => `<button class="${state.customerDetailBusinessLine === item.line ? "active" : ""}" type="button" data-action="set-detail-business-line" data-value="${escapeHtml(item.line)}">${escapeHtml(item.line)}</button>`).join("")}</div><div class="button-row equal"><button class="secondary-button" type="button" data-action="edit-customer">编辑资料</button><button class="primary-button" type="button" data-action="start-line-record">+ 新增沟通记录</button></div></div>
      <div class="tab-row">${tabs.map(([id, label]) => `<button class="tab-button ${state.customerTab === id ? "active" : ""}" type="button" data-action="set-customer-tab" data-tab="${id}">${label}</button>`).join("")}</div>${content}`
  });
}

function legacyManualRecordScreen() {
  return mobileFrame({
    title: "新增沟通记录", back: state.manualRecordBack || "records",
    body: `<div class="mobile-segmented"><button class="segment-button active" type="button">手工录入</button><button class="segment-button" type="button" data-screen="ai-material">AI 整理材料</button></div>
      ${Object.values(state.manualErrors).length ? `<div class="notice danger">请修正标记的正式必填字段。</div>` : ""}
      <div class="glass-panel manual-record-form"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong></span><button class="text-button" type="button" data-action="change-customer">更换 ›</button></div>${state.customerPickerOpen ? `<div class="customer-picker"><button type="button" data-action="choose-record-customer" data-customer="华东智造科技">华东智造科技</button><button type="button" data-action="choose-record-customer" data-customer="远见数字供应链">远见数字供应链</button></div>` : ""}
        <label class="field ${state.manualErrors.businessLine ? "has-error" : ""}"><span>业务线 <em>*</em></span><select id="manualBusinessLine"><option value="">请选择业务线</option>${BUSINESS_LINES.map((line) => `<option ${state.manualBusinessLine === line ? "selected" : ""}>${line}</option>`).join("")}</select>${state.manualErrors.businessLine ? `<small class="field-error">${escapeHtml(state.manualErrors.businessLine)}</small>` : ""}</label>
        <label class="field ${state.manualErrors.channel ? "has-error" : ""}"><span>沟通方式 <em>*</em></span><select id="manualChannel"><option value="">请选择</option><option ${state.manualChannel === "电话" ? "selected" : ""}>电话</option><option ${state.manualChannel === "线下拜访" ? "selected" : ""}>线下拜访</option><option ${state.manualChannel === "线上会议" ? "selected" : ""}>线上会议</option></select>${state.manualErrors.channel ? `<small class="field-error">${escapeHtml(state.manualErrors.channel)}</small>` : ""}</label>
        <div class="field-grid"><label class="field ${state.manualErrors.time ? "has-error" : ""}"><span>开始时间 <em>*</em></span><input id="manualTime" value="${escapeHtml(state.manualTime)}">${state.manualErrors.time ? `<small class="field-error">${escapeHtml(state.manualErrors.time)}</small>` : ""}</label><label class="field ${state.manualErrors.endTime ? "has-error" : ""}"><span>结束时间（选填）</span><input id="manualEndTime" value="${escapeHtml(state.manualEndTime)}">${state.manualErrors.endTime ? `<small class="field-error">${escapeHtml(state.manualErrors.endTime)}</small>` : ""}</label></div>
        ${state.manualChannel === "线下拜访" ? `<label class="field"><span>线下拜访地点</span><input id="manualLocation" value="${escapeHtml(state.manualLocation)}" placeholder="请输入线下拜访地点"></label>` : ""}
        <label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">销售经理</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label>
        <label class="field"><span>客户参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label>
        <label class="field"><span>主题</span><input id="manualSubject" maxlength="300" value="${escapeHtml(state.manualSubject)}"><small class="field-hint">根据沟通内容自动生成，可修改。</small></label>
        <label class="field ${state.manualErrors.content ? "has-error" : ""}"><span>沟通内容 <em>*</em></span><textarea id="recordContent" placeholder="记录客户需求、异议和详细沟通过程">${escapeHtml(state.recordContent)}</textarea>${state.manualErrors.content ? `<small class="field-error">${escapeHtml(state.manualErrors.content)}</small>` : ""}</label>
        <label class="field"><span>沟通结果（选填）</span><textarea id="manualResult" placeholder="记录客户反馈、达成共识或待确认问题">${escapeHtml(state.manualResult)}</textarea></label>
        <button class="secondary-button full-button" type="button" data-action="toggle-manual-next-action">${state.manualNextActionOpen ? "收起下一步行动" : "+ 添加下一步行动"}</button>
        ${state.manualNextActionOpen ? `<div class="manual-next-action"><label class="field"><span>行动类型</span><select id="manualNextActionType"><option ${state.manualNextActionType === "待处理" ? "selected" : ""}>待处理</option><option ${state.manualNextActionType === "日程" ? "selected" : ""}>日程</option></select></label><label class="field"><span>行动内容</span><input id="manualNextActionTitle" maxlength="100" value="${escapeHtml(state.manualNextActionTitle)}" placeholder="请输入下一步行动"></label><label class="field"><span>计划时间${state.manualNextActionType === "日程" ? " *" : "（选填）"}</span><input id="manualNextActionTime" value="${escapeHtml(state.manualNextActionTime)}" placeholder="YYYY-MM-DD HH:mm"></label>${state.manualErrors.nextActionTime ? `<small class="field-error">${escapeHtml(state.manualErrors.nextActionTime)}</small>` : ""}<small class="field-hint">正式保存后同步到工作台。</small></div>` : ""}
        <label class="upload-zone compact-upload" for="manualAttachment"><input class="file-input" id="manualAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.attachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>单文件 50 MB，最多 10 个</span></span></label>
      </div>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-manual-draft">保存草稿</button><button class="primary-button" type="button" data-action="save-manual-formal"><span class="confirm-dot"></span>保存正式记录</button></div></div>`
  });
}

function manualRecordScreen() {
  const selectedLines = state.manualBusinessLines?.length ? state.manualBusinessLines : state.manualBusinessLine ? [state.manualBusinessLine] : [];
  const topicSections = selectedLines.map((line) => {
    const topic = state.manualTopics[line] || { subject: "", keyPoints: "", result: "" };
    return `<section class="communication-topic-section"><div class="communication-topic-heading"><strong>${escapeHtml(line)}</strong><span>业务线议题</span></div><label class="field"><span>主题 <em>*</em></span><input data-manual-topic-field="subject" data-business-line="${line}" maxlength="300" value="${escapeHtml(topic.subject)}" placeholder="本业务线讨论主题"></label><label class="field"><span>沟通要点 <em>*</em></span><textarea data-manual-topic-field="keyPoints" data-business-line="${line}" placeholder="记录需求、异议和关键讨论">${escapeHtml(topic.keyPoints)}</textarea></label><label class="field"><span>沟通结果（选填）</span><textarea data-manual-topic-field="result" data-business-line="${line}" placeholder="记录达成共识或待确认问题">${escapeHtml(topic.result)}</textarea></label></section>`;
  }).join("");
  return mobileFrame({
    title: "新增沟通记录", back: state.manualRecordBack || "records",
    body: `<div class="mobile-segmented"><button class="segment-button" type="button" data-screen="ai-material">AI 整理</button><button class="segment-button active" type="button">手工填写</button></div>
      ${Object.values(state.manualErrors).length ? `<div class="notice danger">请修正标记的正式必填字段。</div>` : ""}
      <div class="glass-panel manual-record-form"><div class="identity-strip"><span class="avatar">${escapeHtml(state.customerName.slice(0, 1))}</span><span><strong>${escapeHtml(state.customerName)}</strong></span><button class="text-button" type="button" data-action="change-customer">更换 ›</button></div>${state.customerPickerOpen ? `<div class="customer-picker"><button type="button" data-action="choose-record-customer" data-customer="华东智造科技">华东智造科技</button><button type="button" data-action="choose-record-customer" data-customer="远见数字供应链">远见数字供应链</button></div>` : ""}
        <fieldset class="schedule-business-line-field ${state.manualErrors.businessLine ? "has-error" : ""}"><legend>涉及业务线 *</legend><div>${BUSINESS_LINES.map((line) => `<label class="schedule-line-option"><input name="manualBusinessLine" type="checkbox" value="${line}" ${selectedLines.includes(line) ? "checked" : ""}><span>${line}</span></label>`).join("")}</div><small>可多选；选择多条后分别填写议题</small>${state.manualErrors.businessLine ? `<small class="field-error">${escapeHtml(state.manualErrors.businessLine)}</small>` : ""}</fieldset>
        <div class="choice-field ${state.manualErrors.channel ? "has-error" : ""}"><span>沟通渠道 <em>*</em></span><input id="manualChannel" type="hidden" value="${escapeHtml(state.manualChannel)}"><div class="choice-row compact">${["微信", "手机", "线下拜访"].map((channel) => `<button class="choice-button ${state.manualChannel === channel ? "active" : ""}" type="button" data-action="set-manual-channel" data-value="${channel}">${channel}</button>`).join("")}</div>${state.manualErrors.channel ? `<small class="field-error">${escapeHtml(state.manualErrors.channel)}</small>` : ""}</div>
        <div class="field-grid"><label class="field ${state.manualErrors.time ? "has-error" : ""}"><span>开始时间 <em>*</em></span><input id="manualTime" value="${escapeHtml(state.manualTime)}">${state.manualErrors.time ? `<small class="field-error">${escapeHtml(state.manualErrors.time)}</small>` : ""}</label><label class="field ${state.manualErrors.endTime ? "has-error" : ""}"><span>结束时间（选填）</span><input id="manualEndTime" value="${escapeHtml(state.manualEndTime)}">${state.manualErrors.endTime ? `<small class="field-error">${escapeHtml(state.manualErrors.endTime)}</small>` : ""}</label></div>
        <label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">销售经理</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label>
        <label class="field"><span>客户参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label>
        ${selectedLines.length > 1 ? `<label class="field"><span>记录标题 <em>*</em></span><input id="manualSubject" maxlength="300" value="${escapeHtml(state.manualSubject)}" placeholder="概括本次多业务线沟通"></label>` : `<input id="manualSubject" type="hidden" value="${escapeHtml(state.manualTopics[selectedLines[0]]?.subject || state.manualSubject)}">`}
        <div class="communication-topics">${topicSections || `<div class="notice">请先选择至少一条业务线。</div>`}</div>
        <label class="upload-zone compact-upload" for="manualAttachment"><input class="file-input" id="manualAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.attachmentAdded ? "材料已选择，可重新选择" : "+ 添加沟通材料或附件"}</strong><span>会议纪要、转写文本、音频或业务附件</span></span></label>
      </div>${draftExitDialog("record")}`,
    sticky: `<div class="screen-actions"><button class="primary-button full-button" type="button" data-action="save-manual-formal"><span class="confirm-dot"></span>保存正式记录</button></div>`
  });
}

function draftExitDialog(kind) {
  if (state.draftExitPrompt !== kind) return "";
  return `<div class="records-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="draftExitTitle"><button class="records-sheet-scrim" type="button" data-action="continue-form-edit" aria-label="继续编辑"></button><section class="records-sheet draft-exit-sheet"><header><strong id="draftExitTitle">是否保存本次草稿？</strong></header><p>保存后可在“我的”中继续编辑。</p><div class="draft-exit-actions"><button class="text-button" type="button" data-action="discard-form-exit">不保存</button><button class="secondary-button" type="button" data-action="continue-form-edit">继续编辑</button><button class="primary-button" type="button" data-action="save-form-draft-exit">保存草稿</button></div></section></div>`;
}

function recordsScreen() {
  const recordRows = getFormalRecords();
  const schedules = getSchedules();
  const selectedSchedules = schedules
    .filter((item) => item.date === state.followUpSelectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const selectedRecords = recordRows
    .filter((item) => item.date === state.followUpSelectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));
  const dateLabel = formatFollowUpDate(state.followUpSelectedDate);
  const weekButtons = FOLLOW_UP_WEEK.map((day) => {
    const hasSchedule = schedules.some((item) => item.date === day.date);
    const hasCommunication = recordRows.some((item) => item.date === day.date);
    return `<button class="follow-up-day ${state.followUpSelectedDate === day.date ? "selected" : ""}" type="button" data-action="set-follow-up-date" data-date="${day.date}" aria-pressed="${state.followUpSelectedDate === day.date}"><span>${day.weekday}</span><strong>${day.day}</strong><i class="follow-up-markers" aria-hidden="true">${hasSchedule ? `<b class="schedule-marker"></b>` : ""}${hasCommunication ? `<b class="communication-marker"></b>` : ""}</i></button>`;
  }).join("");
  const scheduleRows = selectedSchedules.map((item) => followUpScheduleRow(item)).join("");
  const communicationRows = selectedRecords.map((item) => followUpCommunicationRow(item)).join("");
  const visibleCount = (state.recordsShowSchedules ? selectedSchedules.length : 0) + (state.recordsShowCommunications ? selectedRecords.length : 0);
  const periodSummary = state.recordsCalendarMode === "list"
    ? `全部记录 · ${schedules.length} 个日程和 ${recordRows.length} 条沟通记录`
    : `${dateLabel} · ${selectedSchedules.length} 个日程和 ${selectedRecords.length} 条沟通记录`;
  const dayContent = `${state.recordsShowSchedules ? `<section class="follow-up-section-card schedule-card"><div class="follow-up-content-heading"><strong>日程安排</strong><span>${selectedSchedules.length} 条</span></div>${scheduleRows || `<div class="follow-up-empty compact"><span>当日暂无日程安排</span></div>`}</section>` : ""}${state.recordsShowCommunications ? `<section class="follow-up-section-card communication-card"><div class="follow-up-content-heading"><strong>沟通记录</strong><span>${selectedRecords.length ? `${selectedRecords.length} 条` : "当日暂无"}</span></div>${communicationRows || `<div class="follow-up-empty compact"><span>当日暂无已发生的沟通记录</span></div>`}</section>` : ""}`;
  const calendar = `<section class="follow-up-week"><div class="follow-up-week-days">${weekButtons}</div></section>`;
  return mobileFrame({
    title: "跟进记录", nav: "records",
    action: `<button class="mobile-icon-button" type="button" data-action="toggle-record-create-menu" title="新增" aria-label="新增日程或沟通记录" aria-expanded="${state.recordsCreateMenuOpen || state.scheduleComposerOpen}">+</button>`,
    body: `<p class="records-period-summary">${periodSummary}</p>
      <div class="records-type-filters" aria-label="内容类型"><button class="${state.recordsShowSchedules ? "active" : ""}" type="button" data-action="toggle-record-type" data-type="schedule" aria-pressed="${state.recordsShowSchedules}"><span>${state.recordsShowSchedules ? "✓" : ""}</span>日程安排</button><button class="${state.recordsShowCommunications ? "active" : ""}" type="button" data-action="toggle-record-type" data-type="communication" aria-pressed="${state.recordsShowCommunications}"><span>${state.recordsShowCommunications ? "✓" : ""}</span>沟通记录</button></div>
      <div class="records-calendar-controls"><div class="records-date-nav"><button type="button" data-action="shift-follow-up-days" data-direction="previous" title="上一段日期" aria-label="上一段日期">‹</button><button type="button" data-action="go-follow-up-today">今天</button><button type="button" data-action="shift-follow-up-days" data-direction="next" title="下一段日期" aria-label="下一段日期">›</button></div><div class="records-view-tabs" role="tablist" aria-label="跟进记录视图">${[["day", "单日"], ["list", "列表"]].map(([mode, label]) => `<button class="${state.recordsCalendarMode === mode ? "active" : ""}" type="button" data-action="set-record-calendar-mode" data-mode="${mode}" role="tab" aria-selected="${state.recordsCalendarMode === mode}">${label}</button>`).join("")}</div></div>
      ${state.recordsCalendarMode === "list" ? followUpListView(schedules, recordRows) : `${calendar}<section class="follow-up-day-block"><div class="follow-up-day-heading"><strong>${dateLabel}</strong><span>${visibleCount} 项</span></div><div class="follow-up-day-content">${dayContent}</div></section>`}${recordsCreateLayer()}${scheduleDetailLayer(schedules)}${followUpListFilterLayer(schedules, recordRows)}`
  });
}

function formatFollowUpDate(date) {
  const [, month, day] = date.split("-");
  return `${Number(month)} 月 ${Number(day)} 日`;
}

function scheduleTimeLabel(item) {
  return item.endTime ? `${item.time}-${item.endTime}` : item.time;
}

function scheduleMeta(item) {
  const customer = item.customer || item.detail || "未关联客户";
  const businessLines = Array.isArray(item.businessLines) ? item.businessLines.join("/") : "";
  return [customer, businessLines, item.channel].filter(Boolean).join(" · ");
}

function followUpScheduleRow(item, showDate = false) {
  const timeLabel = showDate ? `${Number(item.date.slice(5, 7))}/${Number(item.date.slice(8))}` : scheduleTimeLabel(item);
  return `<button class="follow-up-event-row schedule-row-card" type="button" data-action="open-schedule-preview" data-schedule-id="${escapeHtml(item.id || `${item.date}-${item.time}-${item.title}`)}"><time datetime="${item.date}T${item.time}">${escapeHtml(timeLabel)}</time><span class="follow-up-event-copy"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(scheduleMeta(item))}</small>${showDate && item.endTime ? `<small class="schedule-list-time">${escapeHtml(item.time)}-${escapeHtml(item.endTime)}</small>` : ""}</span><span class="item-action">›</span></button>`;
}

function followUpCommunicationRow(item, showDate = false) {
  return `<button class="follow-up-event-row communication-row" type="button" data-action="select-record" data-customer="${escapeHtml(item.customer)}" data-time="${escapeHtml(item.displayTime)}" data-channel="${escapeHtml(item.channel)}" data-business-line="${escapeHtml(recordBusinessLines(item)[0] || "")}" data-business-lines="${escapeHtml(recordBusinessLines(item).join("|"))}" data-subject="${escapeHtml(item.subject)}"><time datetime="${item.date}T${item.time}">${showDate ? `${Number(item.date.slice(5, 7))}/${Number(item.date.slice(8))}` : escapeHtml(item.time)}</time><span class="follow-up-event-copy"><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.customer)} · ${escapeHtml(businessLineLabel(item))} · ${escapeHtml(item.channel)}</small></span><span class="item-action">›</span></button>`;
}

function followUpListView(schedules, recordRows) {
  const { filteredSchedules, filteredRecords } = getFilteredFollowUpList(schedules, recordRows);
  const resultCount = (state.recordsShowSchedules ? filteredSchedules.length : 0) + (state.recordsShowCommunications ? filteredRecords.length : 0);
  const activeFilterCount = Number(Boolean(state.followUpListBusinessLine)) + Number(state.followUpListTime !== "全部时间");
  const activeFilters = `${state.followUpListBusinessLine ? `<button type="button" data-action="remove-follow-up-list-filter" data-filter="businessLine">${escapeHtml(state.followUpListBusinessLine)} <span>×</span></button>` : ""}${state.followUpListTime !== "全部时间" ? `<button type="button" data-action="remove-follow-up-list-filter" data-filter="time">${escapeHtml(state.followUpListTime)} <span>×</span></button>` : ""}`;
  const scheduleSection = state.recordsShowSchedules ? `<section class="follow-up-list-group"><div class="follow-up-list-heading"><strong>日程安排</strong><span>${escapeHtml(state.followUpListTime)} · ${filteredSchedules.length} 条</span></div><div class="follow-up-section-card">${filteredSchedules.map((item) => followUpScheduleRow(item, true)).join("") || `<div class="follow-up-empty compact"><span>当前条件下暂无日程安排</span></div>`}</div></section>` : "";
  const communicationSection = state.recordsShowCommunications ? `<section class="follow-up-list-group"><div class="follow-up-list-heading"><strong>沟通记录</strong><span>时间倒序 · ${filteredRecords.length} 条</span></div><div class="follow-up-section-card">${filteredRecords.map((item) => followUpCommunicationRow(item, true)).join("") || `<div class="follow-up-empty compact"><span>当前条件下暂无沟通记录</span></div>`}</div></section>` : "";
  return `<div class="follow-up-search-row"><input id="followUpListSearch" class="search-box" type="search" value="${escapeHtml(state.followUpListSearch)}" placeholder="搜索客户、主题或沟通要点" aria-label="搜索跟进记录"><button class="follow-up-filter-trigger ${activeFilterCount ? "active" : ""}" type="button" data-action="open-follow-up-list-filters">筛选${activeFilterCount ? `<b>${activeFilterCount}</b>` : ""}</button></div><div class="follow-up-list-result"><span>共 ${resultCount} 条</span>${state.followUpListSearch ? `<button class="text-button" type="button" data-action="clear-follow-up-search">清除搜索</button>` : ""}</div>${activeFilters ? `<div class="follow-up-active-filters" aria-label="已选筛选条件">${activeFilters}</div>` : ""}<div class="follow-up-list-view">${scheduleSection}${communicationSection}</div>`;
}

function getFilteredFollowUpList(schedules, recordRows) {
  const matches = (item, kind) => {
    const businessLines = kind === "schedule" ? (item.businessLines || []) : recordBusinessLines(item);
    if (state.followUpListBusinessLine && !businessLines.includes(state.followUpListBusinessLine)) return false;
    if (state.followUpListTime === "今天" && item.date !== PROTOTYPE_TODAY) return false;
    if (state.followUpListTime === "本周" && (item.date < "2026-08-24" || item.date > "2026-08-30")) return false;
    if (state.followUpListTime === "本月" && !item.date.startsWith("2026-08")) return false;
    const query = state.followUpListSearch.trim().toLowerCase();
    if (query) {
      const topics = kind === "communication" ? recordTopics(item).map((topic) => `${topic.subject || ""} ${topic.keyPoints || ""}`).join(" ") : "";
      const searchable = [item.customer, item.title, item.subject, item.summary, topics].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    return true;
  };
  return {
    filteredSchedules: schedules.filter((item) => matches(item, "schedule")),
    filteredRecords: recordRows.filter((item) => matches(item, "communication"))
  };
}

function followUpListFilterLayer(schedules, recordRows) {
  if (!state.followUpListFiltersOpen || state.recordsCalendarMode !== "list") return "";
  const { filteredSchedules, filteredRecords } = getFilteredFollowUpList(schedules, recordRows);
  const resultCount = (state.recordsShowSchedules ? filteredSchedules.length : 0) + (state.recordsShowCommunications ? filteredRecords.length : 0);
  return `<div class="records-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="followUpFilterTitle"><button class="records-sheet-scrim" type="button" data-action="close-follow-up-list-filters" aria-label="关闭筛选"></button><section class="records-sheet follow-up-filter-sheet"><header><strong id="followUpFilterTitle">筛选列表</strong><button type="button" data-action="close-follow-up-list-filters" aria-label="关闭">×</button></header><div class="follow-up-filter-group"><span>业务线</span><div><button class="${state.followUpListBusinessLine ? "" : "active"}" type="button" data-action="set-follow-up-list-filter" data-filter="businessLine" data-value="">全部</button>${BUSINESS_LINES.map((line) => `<button class="${state.followUpListBusinessLine === line ? "active" : ""}" type="button" data-action="set-follow-up-list-filter" data-filter="businessLine" data-value="${line}">${line}</button>`).join("")}</div></div><div class="follow-up-filter-group"><span>时间</span><div>${["全部时间", "今天", "本周", "本月"].map((time) => `<button class="${state.followUpListTime === time ? "active" : ""}" type="button" data-action="set-follow-up-list-filter" data-filter="time" data-value="${time}">${time}</button>`).join("")}</div></div><div class="button-row equal follow-up-filter-actions"><button class="secondary-button" type="button" data-action="reset-follow-up-list-filters">重置</button><button class="primary-button" type="button" data-action="apply-follow-up-list-filters">查看 ${resultCount} 条</button></div></section></div>`;
}

function recordsCreateLayer() {
  if (state.scheduleComposerOpen) {
    return `<div class="records-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="scheduleComposerTitle"><button class="records-sheet-scrim" type="button" data-action="close-schedule-create" aria-label="关闭新增日程"></button><section class="records-sheet schedule-composer"><header><strong id="scheduleComposerTitle">新增日程</strong><button type="button" data-action="close-schedule-create" aria-label="关闭">×</button></header>${state.scheduleDraftError ? `<div class="field-error sheet-error">${escapeHtml(state.scheduleDraftError)}</div>` : ""}<label class="field"><span>日程主题 *</span><input id="scheduleDraftTitle" value="${escapeHtml(state.scheduleDraftTitle)}" placeholder="例如：客户拜访"></label><label class="field"><span>日期 *</span><input id="scheduleDraftDate" type="date" value="${escapeHtml(state.scheduleDraftDate)}"></label><div class="field-grid"><label class="field"><span>开始时间 *</span><input id="scheduleDraftTime" type="time" value="${escapeHtml(state.scheduleDraftTime)}"></label><label class="field"><span>结束时间（选填）</span><input id="scheduleDraftEndTime" type="time" value="${escapeHtml(state.scheduleDraftEndTime)}"></label></div><label class="field"><span>关联客户</span><input id="scheduleDraftCustomer" value="${escapeHtml(state.scheduleDraftCustomer)}" placeholder="请输入客户名称"></label><fieldset class="schedule-business-line-field"><legend>业务线 *</legend><div>${BUSINESS_LINES.map((line) => `<label class="schedule-line-option"><input name="scheduleBusinessLine" type="checkbox" value="${line}" ${state.scheduleDraftBusinessLines.includes(line) ? "checked" : ""}><span>${line}</span></label>`).join("")}</div><small>可多选</small></fieldset><div class="choice-field"><span>沟通渠道 *</span><input id="scheduleDraftChannel" type="hidden" value="${escapeHtml(state.scheduleDraftChannel)}"><div class="choice-row compact">${["微信", "手机", "线下拜访"].map((channel) => `<button class="choice-button ${state.scheduleDraftChannel === channel ? "active" : ""}" type="button" data-action="set-schedule-channel" data-value="${channel}">${channel}</button>`).join("")}</div></div><label class="field"><span>备注</span><textarea id="scheduleDraftDetail" class="compact-textarea" placeholder="补充本次日程说明">${escapeHtml(state.scheduleDraftDetail)}</textarea></label><div class="button-row equal"><button class="secondary-button" type="button" data-action="close-schedule-create">取消</button><button class="primary-button" type="button" data-action="save-schedule">保存日程</button></div></section></div>`;
  }
  if (!state.recordsCreateMenuOpen) return "";
  return `<div class="records-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="recordCreateTitle"><button class="records-sheet-scrim" type="button" data-action="close-record-create-menu" aria-label="关闭新增菜单"></button><section class="records-sheet record-create-menu"><header><strong id="recordCreateTitle">新增</strong><button type="button" data-action="close-record-create-menu" aria-label="关闭">×</button></header><button type="button" data-action="open-schedule-create"><span class="record-create-icon schedule">日</span><span><strong>新增日程</strong><small>安排未来的客户活动</small></span><i>›</i></button><button type="button" data-action="open-communication-create"><span class="record-create-icon communication">记</span><span><strong>新增沟通记录</strong><small>记录已经发生的沟通事实</small></span><i>›</i></button></section></div>`;
}

function scheduleDetailLayer(schedules) {
  if (!state.selectedScheduleId) return "";
  const schedule = schedules.find((item) => (item.id || `${item.date}-${item.time}-${item.title}`) === state.selectedScheduleId);
  if (!schedule) return "";
  const ended = `${schedule.date} ${schedule.endTime || schedule.time}` <= `${PROTOTYPE_TODAY} 23:59`;
  return `<div class="records-sheet-overlay" role="dialog" aria-modal="true" aria-labelledby="scheduleDetailTitle"><button class="records-sheet-scrim" type="button" data-action="close-schedule-preview" aria-label="关闭日程详情"></button><section class="records-sheet schedule-detail-sheet"><header><strong id="scheduleDetailTitle">日程详情</strong><button type="button" data-action="close-schedule-preview" aria-label="关闭">×</button></header><div class="schedule-detail-title"><span class="record-create-icon schedule">日</span><span><strong>${escapeHtml(schedule.title)}</strong><small>${escapeHtml(schedule.customer || "未关联客户")}</small></span></div><dl class="fact-list"><div class="fact-row"><dt>时间</dt><dd>${escapeHtml(formatFollowUpDate(schedule.date))} ${escapeHtml(scheduleTimeLabel(schedule))}</dd></div><div class="fact-row"><dt>业务线</dt><dd>${escapeHtml((schedule.businessLines || []).join(" / "))}</dd></div><div class="fact-row"><dt>渠道</dt><dd>${escapeHtml(schedule.channel)}</dd></div></dl>${schedule.note ? `<p class="schedule-detail-note">${escapeHtml(schedule.note)}</p>` : ""}${ended ? `<button class="primary-button full-button" type="button" data-action="record-schedule-communication" data-schedule-id="${escapeHtml(state.selectedScheduleId)}">记录本次沟通</button><button class="text-button full-button" type="button" data-action="mark-schedule-not-happened">确认未发生</button>` : `<button class="secondary-button full-button" type="button" data-action="close-schedule-preview">关闭</button>`}</section></div>`;
}

function allRecordsScreen(recordRows) {
  const channels = ["全部", "电话", "线下拜访", "线上会议"];
  const timeOptions = ["近7日", "近30日", "近90日", "本年度", "自定义日期"];
  const matchesFilters = (row) => {
    if (state.recordCustomerScope && row.customer !== state.recordCustomerScope) return false;
    if (state.recordBusinessLineFilter && row.businessLine !== state.recordBusinessLineFilter) return false;
    if (state.recordChannelFilter !== "全部" && row.channel !== state.recordChannelFilter) return false;
    const cutoffs = { "近7日": "2026-08-20", "近30日": "2026-07-29", "近90日": "2026-05-30", "本年度": "2026-01-01" };
    if (cutoffs[state.recordTimeFilter] && row.date < cutoffs[state.recordTimeFilter]) return false;
    if (state.recordTimeFilter === "自定义日期" && ((state.recordCustomStart && row.date < state.recordCustomStart) || (state.recordCustomEnd && row.date > state.recordCustomEnd))) return false;
    return true;
  };
  const filteredRows = recordRows.filter(matchesFilters);
  const resultCount = filteredRows.length;
  const activeTags = [
    state.recordCustomerScope ? ["customer", state.recordCustomerScope] : null,
    state.recordBusinessLineFilter ? ["businessLine", state.recordBusinessLineFilter] : null,
    state.recordChannelFilter !== "全部" ? ["channel", state.recordChannelFilter] : null,
    state.recordTimeFilter ? ["time", state.recordTimeFilter] : null
  ].filter(Boolean);
  const customers = [...new Set(recordRows.map((row) => row.customer))];
  return mobileFrame({
    title: "全部跟进记录", nav: "records", back: "records",
    action: `<button class="mobile-icon-button" type="button" data-screen="manual-record" title="新增跟进记录" aria-label="新增跟进记录">+</button>`,
    body: `<div class="customer-search-row"><input id="recordSearch" class="search-box" type="search" placeholder="${state.recordCustomerScope ? "搜索该客户的沟通内容" : "搜索客户或沟通主题"}" aria-label="搜索正式沟通记录"><button class="customer-filter-button" type="button" data-action="toggle-filters" data-scope="record" aria-expanded="${state.recordFiltersOpen}">筛选${activeTags.length ? `<b>${activeTags.length}</b>` : ""}</button></div>
      <div class="record-customer-suggestions">${customers.map((customer) => `<button class="record-customer-suggestion" type="button" data-action="set-record-customer-scope" data-value="${escapeHtml(customer)}" data-customer-name="${escapeHtml(customer)}" hidden>查看“${escapeHtml(customer)}”的全部正式沟通 <span>›</span></button>`).join("")}</div>
      ${activeTags.length ? `<div class="quick-filter-strip" aria-label="已选筛选条件">${activeTags.map(([key, label]) => `<button class="quick-filter-tag" type="button" data-action="remove-record-filter" data-filter="${key}">${escapeHtml(label)} <span>×</span></button>`).join("")}</div>` : ""}
      <div class="section-heading record-search-heading" data-record-search-heading hidden><h3>搜索结果</h3><span data-record-search-count>0 条</span></div>
      <div data-record-default-heading class="section-heading"><h3>正式沟通</h3><span>共 ${filteredRows.length} 条 · 时间倒序</span></div>
      ${filteredRows.length ? `<div class="list-panel record-results">${filteredRows.map(recordRow).join("")}</div>` : `<div class="notice record-empty-state"><strong>当前条件下没有正式沟通记录。</strong><button class="text-button" type="button" data-action="reset-record-filters">重置筛选</button></div>`}<div class="notice" data-search-empty hidden>没有找到匹配记录。</div>
      ${state.recordFiltersOpen ? `<div class="customer-filter-overlay" role="dialog" aria-modal="true" aria-labelledby="recordFilterTitle"><button class="filter-sheet-scrim" type="button" data-action="close-record-filters" aria-label="关闭筛选"></button><section class="customer-filter-sheet"><header><strong id="recordFilterTitle">筛选正式沟通</strong><button class="text-button" type="button" data-action="reset-record-filters">重置</button></header><div class="customer-filter-body"><div class="sheet-filter-group"><span>业务线</span><div>${BUSINESS_LINES.map((line) => `<button class="sheet-option ${state.recordBusinessLineFilter === line ? "active" : ""}" type="button" data-action="set-record-line-filter" data-value="${line}">${line}</button>`).join("")}</div></div><div class="sheet-filter-group"><span>沟通方式</span><div>${channels.slice(1).map((channel) => `<button class="sheet-option ${state.recordChannelFilter === channel ? "active" : ""}" type="button" data-action="set-record-filter" data-value="${channel}">${channel}</button>`).join("")}</div></div><div class="sheet-filter-group"><span>沟通时间</span><div>${timeOptions.map((time) => `<button class="sheet-option ${state.recordTimeFilter === time ? "active" : ""}" type="button" data-action="set-record-time-filter" data-value="${time}">${time}</button>`).join("")}</div>${state.recordTimeFilter === "自定义日期" ? `<div class="record-date-range"><label><span>开始日期</span><input id="recordCustomStart" type="date" value="${state.recordCustomStart}"></label><label><span>结束日期</span><input id="recordCustomEnd" type="date" value="${state.recordCustomEnd}"></label></div>` : ""}</div></div><button class="primary-button filter-result-button" type="button" data-action="apply-record-filters">查看 ${resultCount} 条正式沟通</button></section></div>` : ""}`
  });
}

function recordRow(row) {
  return `<button class="record-row" type="button" data-action="select-record" data-customer="${escapeHtml(row.customer)}" data-time="${escapeHtml(row.displayTime)}" data-channel="${escapeHtml(row.channel)}" data-business-line="${escapeHtml(recordBusinessLines(row)[0] || "")}" data-business-lines="${escapeHtml(recordBusinessLines(row).join("|"))}" data-subject="${escapeHtml(row.subject)}" data-search-row data-search-text="${escapeHtml(`${row.customer} ${row.subject} ${row.summary} ${businessLineLabel(row)}`)}"><span class="record-row-top"><strong>${escapeHtml(row.customer)}</strong><span class="item-action">›</span></span><p>${escapeHtml(row.subject)}</p><small>${escapeHtml(row.displayTime)} · ${escapeHtml(row.channel)} · ${escapeHtml(businessLineLabel(row))}</small><span class="record-summary">${escapeHtml(row.summary)}</span></button>`;
}

function recordDetailScreen() {
  const timeRange = state.recordSnapshot.endTime ? `${state.recordSnapshot.time}–${state.recordSnapshot.endTime.slice(-5)}` : state.recordSnapshot.time;
  const meta = [timeRange, state.recordSnapshot.channel, state.recordSnapshot.duration ? `${state.recordSnapshot.duration}分钟` : ""].filter(Boolean).join(" · ");
  const lastUpdatedAt = state.recordVersion > 1 ? "8 月 26 日 10:20" : "8 月 21 日 15:02";
  const hasAttachment = state.selectedRecordIsExisting || state.attachmentAdded || state.aiAttachmentAdded || state.recordSupplementAttachmentAdded || state.editRecordAttachmentAdded;
  const topics = recordTopics(state.recordSnapshot);
  const topicSections = topics.map((topic) => `<section class="record-detail-section communication-topic-detail"><div class="communication-topic-heading"><strong>${escapeHtml(topic.businessLine)}</strong><span>业务线议题</span></div><h4>${escapeHtml(topic.subject || state.recordSnapshot.subject)}</h4><div class="topic-detail-block"><span>沟通要点</span><p>${escapeHtml(topic.keyPoints || state.recordSnapshot.content || "未填写")}</p></div>${topic.result ? `<div class="topic-detail-block"><span>沟通结果</span><p>${escapeHtml(topic.result)}</p></div>` : ""}</section>`).join("");
  return mobileFrame({
    title: "沟通详情", back: "records",
    action: `<div class="detail-header-actions"><button class="text-button" type="button" data-action="open-record-edit">编辑</button><button class="mobile-icon-button small" type="button" data-action="toggle-record-more" title="更多操作" aria-label="更多操作">⋯</button></div>`,
    body: `${state.recordMoreOpen ? `<div class="record-more-menu"><button class="danger-button full-button" type="button" data-action="open-record-deactivate">归档记录</button></div>` : ""}
      <section class="record-detail-hero"><button class="record-customer-link" type="button" data-action="open-record-customer"><strong>${escapeHtml(state.recordSnapshot.customer)}</strong><span>›</span></button><h3>${escapeHtml(state.recordSnapshot.subject)}</h3><p>${escapeHtml(meta)}</p><div class="record-hero-footer"><span class="record-line-name">${escapeHtml(businessLineLabel(state.recordSnapshot) || "业务线待补充")}</span><small class="record-last-updated">最后更新于 ${lastUpdatedAt}</small></div></section>
      <section class="record-detail-section compact-record-participants"><h3>参与人</h3><div><span>我方</span><p>张雨、李程${state.extraInternalParticipant ? "、销售经理" : ""}</p></div><div><span>客户方</span><p>王磊${state.extraCustomerParticipant || state.recordSupplementParticipantAdded ? "、临时联系人" : ""}</p></div></section>
      ${topicSections}
      ${hasAttachment ? `<section class="record-detail-section"><h3>附件</h3><button class="record-attachment" type="button"><span><strong>${state.editRecordAttachmentAdded ? "补充材料.pdf" : "报价方案-v3.pdf"}</strong><small>安全扫描通过</small></span><span class="item-action">查看 ›</span></button></section>` : ""}
      <details class="record-change-details"><summary>变更信息</summary><div class="timeline">${state.recordVersion > 1 ? `<div class="timeline-item"><strong>版本 ${state.recordVersion} · 编辑记录</strong><span>张雨 · 8 月 26 日 10:20</span></div>` : ""}${state.recordVersion > 2 ? `<div class="timeline-item"><strong>版本 ${state.recordVersion - 1} · 上次编辑</strong><span>张雨 · 8 月 25 日 18:40</span></div>` : ""}<div class="timeline-item"><strong>版本 1 · 创建记录</strong><span>张雨 · 8 月 21 日 15:02</span></div></div></details>`
  });
}

function aiMaterialScreen() {
  const content = state.materialMode === "text"
    ? `<label class="field"><span>原始文本 <em>*</em></span><textarea id="materialText" style="min-height:150px">${escapeHtml(state.materialText)}</textarea></label>`
    : `<label class="upload-zone" for="materialFile"><input class="file-input" id="materialFile" type="file" accept="${state.materialMode === "audio" ? ".m4a,.mp3,.wav" : ".pdf,.docx,.txt"}"><span><strong>${state.materialFile ? escapeHtml(state.materialFile) : `+ 选择${state.materialMode === "audio" ? "音频" : "会议纪要"}文件`}</strong><span>${state.materialMode === "audio" ? "M4A / MP3 / WAV，单文件不超过 50 MB" : "PDF / DOCX / TXT，上传后先安全扫描"}</span></span></label>`;
  return mobileFrame({
    title: "AI 整理材料", subtitle: "只生成未确认草稿", back: "workbench",
    body: `<div class="mobile-segmented"><button class="segment-button active" type="button">AI 整理</button><button class="segment-button" type="button" data-screen="manual-record">手工填写</button></div><div class="notice warning">原始材料将先安全保存。AI 不会自动写入正式沟通记录。</div>${state.materialError ? `<div class="notice danger">${escapeHtml(state.materialError)}</div>` : ""}
      <div class="mobile-segmented"><button class="segment-button ${state.materialMode === "text" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="text">直接文本</button><button class="segment-button ${state.materialMode === "audio" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="audio">音频文件</button><button class="segment-button ${state.materialMode === "document" ? "active" : ""}" type="button" data-action="set-material-mode" data-mode="document">会议纪要</button></div>
      <div class="glass-panel">${content}</div>`,
    sticky: `<div class="screen-actions"><button class="primary-button full-button" type="button" data-action="start-ai"><span class="confirm-dot"></span>保存材料并开始处理</button></div>`
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
  const aiReady = state.processState === "ready" && state.aiDraftStatus === "ready";
  return mobileFrame({
    title: "审核 AI 草稿", back: "workbench",
    body: `<div class="notice warning"><strong>未确认草稿</strong><br>AI 已根据原始材料填写，请核对后确认。</div>${!aiReady ? `<div class="notice danger">材料尚未整理完成，暂时不能确认。</div>` : ""}${state.aiError ? `<div class="notice danger">${escapeHtml(state.aiError)}</div>` : ""}
      <div class="glass-panel manual-record-form ai-review-form"><div class="identity-strip"><span class="avatar">${escapeHtml(state.aiDraft.customer.slice(0, 1))}</span><span><strong>${escapeHtml(state.aiDraft.customer)}</strong></span><button class="text-button" type="button" data-screen="ai-processing">重新匹配 ›</button></div>
        <div class="choice-field"><span>业务线 <em>*</em></span><input id="ai-businessLine" data-ai-field="businessLine" type="hidden" value="${escapeHtml(state.aiDraft.businessLine)}"><div class="choice-row">${BUSINESS_LINES.map((line) => `<button class="choice-button ${state.aiDraft.businessLine === line ? "active" : ""}" type="button" data-action="set-ai-choice" data-field="businessLine" data-value="${line}">${line}</button>`).join("")}</div></div>
        <div class="choice-field"><span>沟通渠道 <em>*</em></span><input id="ai-channel" data-ai-field="channel" type="hidden" value="${escapeHtml(state.aiDraft.channel)}"><div class="choice-row compact">${["微信", "手机", "线下拜访"].map((channel) => `<button class="choice-button ${state.aiDraft.channel === channel ? "active" : ""}" type="button" data-action="set-ai-choice" data-field="channel" data-value="${channel}">${channel}</button>`).join("")}</div></div>
        <div class="field-grid"><label class="field"><span>开始时间 <em>*</em></span><input id="ai-time" data-ai-field="time" value="${escapeHtml(state.aiDraft.time)}"></label><label class="field"><span>结束时间（选填）</span><input id="ai-endTime" data-ai-field="endTime" value="${escapeHtml(state.aiDraft.endTime || "")}"></label></div>
        ${state.aiDraft.channel === "线下拜访" ? `<label class="field"><span>线下拜访地点</span><input id="ai-location" data-ai-field="location" value="${escapeHtml(state.aiDraft.location)}" placeholder="请输入线下拜访地点"></label>` : ""}
        <label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">销售经理</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label>
        <label class="field"><span>客户参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button><button class="chip" type="button">周宁</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label>
        <label class="field ai-review-field"><span>主题 <small class="source-chip warning">建议核对</small></span><input id="ai-subject" data-ai-field="subject" maxlength="300" value="${escapeHtml(state.aiDraft.subject)}"><button class="evidence-toggle" type="button" data-action="toggle-evidence" data-field="subject">${state.evidenceOpen.subject ? "收起原文 −" : "查看原文 +"}</button>${state.evidenceOpen.subject ? `<div class="evidence">根据沟通内容自动概括，可直接修改。</div>` : ""}</label>
        <label class="field ai-review-field"><span>沟通要点 <em>*</em></span><textarea id="ai-content" data-ai-field="content" placeholder="AI 根据材料整理需求、异议和关键讨论">${escapeHtml(state.aiDraft.content)}</textarea><button class="evidence-toggle" type="button" data-action="toggle-evidence" data-field="content">${state.evidenceOpen.content ? "收起原文 −" : "查看原文 +"}</button>${state.evidenceOpen.content ? `<div class="evidence">${escapeHtml(state.materialText)}</div>` : ""}</label>
        <label class="field"><span>沟通结果（选填）</span><textarea id="ai-conclusion" data-ai-field="conclusion" placeholder="记录客户反馈、达成共识或待确认问题">${escapeHtml(state.aiDraft.conclusion)}</textarea></label>
        <label class="upload-zone compact-upload" for="aiAttachment"><input class="file-input" id="aiAttachment" type="file" accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png,.m4a,.mp3,.wav"><span><strong>${state.aiAttachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>单文件 50 MB，最多 10 个</span></span></label>
      </div>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-action="save-ai-draft">保存草稿</button><button class="primary-button" type="button" data-action="confirm-ai" ${aiReady ? "" : "disabled"}><span class="confirm-dot"></span>确认正式记录</button></div><button class="text-button full-button" type="button" data-action="abandon-ai">放弃草稿</button></div>`
  });
}

function versionDiffScreen() {
  const edit = state.recordEdit || {
    customer: state.recordSnapshot.customer,
    businessLine: state.recordSnapshot.businessLine,
    channel: state.recordSnapshot.channel,
    time: state.recordSnapshot.time,
    endTime: state.recordSnapshot.endTime || "",
    location: state.recordSnapshot.location || "",
    subject: state.recordSnapshot.subject,
    content: state.recordSnapshot.content,
    result: state.recordConclusion
  };
  return mobileFrame({
    title: "编辑沟通记录", back: "record-detail",
    body: `${Object.values(state.editRecordErrors).length ? `<div class="notice danger">请修正标记的必填字段。</div>` : ""}${state.recordOwnershipConfirmationOpen ? `<div class="notice warning"><strong>确认记录归属变更</strong><br>修改客户或业务线会改变记录归属，并重新校验数据权限。<button class="primary-button full-button ownership-confirm-button" type="button" data-action="confirm-record-ownership-save">确认变更并保存</button></div>` : ""}
      <div class="glass-panel edit-record-form"><label class="field"><span>客户 <em>*</em></span><select id="editRecordCustomer">${[state.recordSnapshot.customer, "远见数字供应链", "华东智造科技"].filter((item, index, list) => list.indexOf(item) === index).map((customer) => `<option ${edit.customer === customer ? "selected" : ""}>${customer}</option>`).join("")}</select></label><label class="field ${state.editRecordErrors.businessLine ? "has-error" : ""}"><span>业务线 <em>*</em></span><select id="editRecordBusinessLine">${BUSINESS_LINES.map((line) => `<option ${edit.businessLine === line ? "selected" : ""}>${line}</option>`).join("")}</select>${state.editRecordErrors.businessLine ? `<small class="field-error">${state.editRecordErrors.businessLine}</small>` : ""}</label><label class="field ${state.editRecordErrors.channel ? "has-error" : ""}"><span>沟通方式 <em>*</em></span><select id="editRecordChannel"><option ${edit.channel === "电话" ? "selected" : ""}>电话</option><option ${edit.channel === "线下拜访" ? "selected" : ""}>线下拜访</option><option ${edit.channel === "线上会议" ? "selected" : ""}>线上会议</option></select>${state.editRecordErrors.channel ? `<small class="field-error">${state.editRecordErrors.channel}</small>` : ""}</label><div class="field-grid"><label class="field ${state.editRecordErrors.time ? "has-error" : ""}"><span>开始时间 <em>*</em></span><input id="editRecordTime" value="${escapeHtml(edit.time)}">${state.editRecordErrors.time ? `<small class="field-error">${state.editRecordErrors.time}</small>` : ""}</label><label class="field ${state.editRecordErrors.endTime ? "has-error" : ""}"><span>结束时间（选填）</span><input id="editRecordEndTime" value="${escapeHtml(edit.endTime)}">${state.editRecordErrors.endTime ? `<small class="field-error">${state.editRecordErrors.endTime}</small>` : ""}</label></div>${edit.channel === "线下拜访" ? `<label class="field"><span>线下拜访地点</span><input id="editRecordLocation" value="${escapeHtml(edit.location)}"></label>` : ""}
        <label class="field"><span>我方参与人</span><div class="filter-row"><button class="chip active" type="button">张雨</button><button class="chip active" type="button">李程</button>${state.extraInternalParticipant ? `<button class="chip active" type="button">销售经理</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="internal">+ 添加</button></div></label><label class="field"><span>客户参与人</span><div class="filter-row"><button class="chip active" type="button">王磊</button>${state.extraCustomerParticipant ? `<button class="chip active" type="button">临时联系人</button>` : ""}<button class="chip" type="button" data-action="add-participant" data-side="customer">+ 临时姓名</button></div></label>
        <label class="field"><span>主题</span><input id="editRecordSubject" maxlength="300" value="${escapeHtml(edit.subject)}"></label><label class="field ${state.editRecordErrors.content ? "has-error" : ""}"><span>沟通内容 <em>*</em></span><textarea id="editRecordContent">${escapeHtml(edit.content)}</textarea>${state.editRecordErrors.content ? `<small class="field-error">${state.editRecordErrors.content}</small>` : ""}</label><label class="field"><span>沟通结果（选填）</span><textarea id="editRecordResult">${escapeHtml(edit.result)}</textarea></label><label class="upload-zone compact-upload" for="editRecordAttachment"><input class="file-input" id="editRecordAttachment" type="file"><span><strong>${state.editRecordAttachmentAdded ? "附件已选择，可重新选择" : "+ 添加附件"}</strong><span>保存前完成安全扫描</span></span></label>
      </div>`,
    sticky: `<div class="screen-actions"><div class="button-row"><button class="secondary-button" type="button" data-screen="record-detail">取消</button><button class="primary-button" type="button" data-action="save-record-edit">保存修改</button></div></div>`
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
  const draftItem = state.aiDraftStatus === "confirmed" ? "" : `<button class="system-item" type="button" data-action="open-ready-draft"><span class="item-dot warning"></span><span class="system-copy"><strong>沟通草稿</strong><span>待继续编辑或确认</span></span><span class="item-action">查看 ›</span></button>`;
  return mobileFrame({
    title: "我的", subtitle: "身份、草稿与会话", nav: "profile",
    body: `<div class="glass-panel"><div class="identity-strip"><span class="avatar">张</span><span><strong>张雨</strong><span>海天科技 · 华东销售部</span></span><span class="status-chip formal">销售人员</span></div></div><div class="glass-panel"><dl class="fact-list"><div class="fact-row"><dt>所属企业</dt><dd>海天科技</dd></div><div class="fact-row"><dt>组织范围</dt><dd>华东销售部</dd></div><div class="fact-row"><dt>数据权限</dt><dd>本人创建或内部负责客户</dd></div></dl></div><div class="list-panel">${draftItem}<button class="system-item" type="button" data-action="open-my-archive"><span class="item-dot"></span><span class="system-copy"><strong>我的归档</strong><span>查看本人归档的客户和沟通</span></span><span class="item-action">查看 ›</span></button></div><button class="danger-button full-button" type="button" data-action="logout">退出登录</button>`
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
  syncAssistantDialog();
}

function syncAssistantDialog() {
  if (!state.aiAssistantOpen) return;
  const app = els.phoneScreen.querySelector(".mobile-app");
  app?.querySelectorAll(":scope > .mobile-status, :scope > .mobile-header, :scope > .mobile-scroll, :scope > .mobile-bottom-nav").forEach((element) => {
    element.inert = true;
    element.setAttribute("aria-hidden", "true");
  });
  const panel = app?.querySelector(".ai-assistant-panel");
  if (panel && !panel.contains(document.activeElement)) panel.querySelector("#aiAssistantPrompt")?.focus();
}

function render() {
  renderNav();
  renderReview();
  renderPhone();
}

function navigate(screenId, options = {}) {
  if (!screenById[screenId]) return;
  const previousScreen = state.activeScreen;
  captureActiveScreenState();
  saveCurrentNote(false);
  const customerFlowScreens = ["customer-form", "dedupe"];
  const recordFlowScreens = ["manual-record", "ai-material", "ai-processing", "ai-review"];
  if (screenId === "manual-record" && previousScreen !== "customer-detail") {
    state.manualRecordBack = "records";
  }
  if (customerFlowScreens.includes(screenId) && (options.reset || !customerFlowScreens.includes(previousScreen))) {
    state.customerFlowReturnTarget = options.reset ? "customers" : previousScreen;
    state.customerFlowBaseStack = options.reset ? [] : [...state.navigationStack];
  }
  if (recordFlowScreens.includes(screenId) && (options.reset || !recordFlowScreens.includes(previousScreen))) {
    state.recordFlowReturnTarget = options.reset ? (screenId === "ai-review" || screenId === "ai-material" ? "workbench" : "records") : previousScreen;
    state.recordFlowBaseStack = options.reset ? [] : [...state.navigationStack];
  }
  if (options.reset) {
    state.navigationStack = [];
  } else if (!options.preserveHistory && previousScreen !== screenId) {
    if (options.replace) {
      if (state.navigationStack.at(-1) === screenId) state.navigationStack.pop();
    } else if (state.navigationStack.at(-1) === screenId) {
      state.navigationStack.pop();
    } else {
      state.navigationStack.push(previousScreen);
    }
  }
  if (screenId === "workbench") {
    state.workbenchNotificationOpen = false;
    state.workbenchView = "main";
  }
  if (screenId === "records" && options.reset) {
    state.recordsCalendarMode = "day";
    state.recordsShowSchedules = true;
    state.recordsShowCommunications = true;
    state.followUpListFiltersOpen = false;
    state.followUpListBusinessLine = "";
    state.followUpListTime = "全部时间";
    state.followUpListSearch = "";
    state.followUpSelectedDate = PROTOTYPE_TODAY;
  }
  state.activeScreen = screenId;
  state.aiAssistantOpen = false;
  state.aiAssistantPrompt = "";
  state.aiAssistantResponse = "";
  state.aiAssistantError = "";
  state.aiAssistantPendingAction = "";
  state.toast = "";
  render();
}

function navigateBack(fallback = "workbench") {
  const target = state.navigationStack.pop() || fallback;
  navigate(target, { preserveHistory: true });
}

function completeWorkflow(kind, destination) {
  const baseStack = kind === "customer" ? state.customerFlowBaseStack : state.recordFlowBaseStack;
  const returnTarget = kind === "customer" ? state.customerFlowReturnTarget : state.recordFlowReturnTarget;
  state.navigationStack = [...baseStack];
  if (returnTarget && returnTarget !== destination && state.navigationStack.at(-1) !== returnTarget) state.navigationStack.push(returnTarget);
  navigate(destination, { preserveHistory: true });
}

function cancelWorkflow(kind) {
  const baseStack = kind === "customer" ? state.customerFlowBaseStack : state.recordFlowBaseStack;
  const returnTarget = kind === "customer" ? state.customerFlowReturnTarget : state.recordFlowReturnTarget;
  state.navigationStack = [...baseStack];
  navigate(returnTarget || (kind === "customer" ? "customers" : "records"), { preserveHistory: true });
}

function showToast(message) {
  clearTimeout(toastTimer);
  captureActiveScreenState();
  state.toast = message;
  renderPhone();
  toastTimer = setTimeout(() => {
    captureActiveScreenState();
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
  state.manualEndTime = document.querySelector("#manualEndTime")?.value.trim() ?? state.manualEndTime;
  state.manualChannel = document.querySelector("#manualChannel")?.value ?? state.manualChannel;
  const selectedLines = [...document.querySelectorAll('input[name="manualBusinessLine"]:checked')].map((input) => input.value);
  if (selectedLines.length || document.querySelector('input[name="manualBusinessLine"]')) state.manualBusinessLines = selectedLines;
  state.manualBusinessLine = state.manualBusinessLines[0] || "";
  state.manualSubject = document.querySelector("#manualSubject")?.value.trim() ?? state.manualSubject;
  document.querySelectorAll("[data-manual-topic-field]").forEach((field) => {
    const line = field.dataset.businessLine;
    state.manualTopics[line] ||= { subject: "", keyPoints: "", result: "" };
    state.manualTopics[line][field.dataset.manualTopicField] = field.value.trim();
  });
  const firstTopic = state.manualTopics[state.manualBusinessLine];
  state.recordContent = firstTopic?.keyPoints || "";
  state.manualResult = firstTopic?.result || "";
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
  const assignmentRows = [...document.querySelectorAll("[data-owner-assignment]")];
  if (assignmentRows.length) {
    state.customerOwnerAssignments = assignmentRows.map((row) => ({
      role: row.querySelector(".customer-owner-role")?.value || "",
      person: row.querySelector(".customer-owner-person")?.value || ""
    }));
    state.customerFrontendSales = state.customerOwnerAssignments.find((item) => item.role === "前端销售")?.person || state.customerOwnerAssignments[0]?.person || "";
    state.customerBackendSales = state.customerOwnerAssignments.find((item) => item.role === "后端销售")?.person || "";
  }
  const addressElements = [...document.querySelectorAll("[data-customer-address]")];
  if (addressElements.length) {
    state.customerAddresses = addressElements.map((row) => ({
      country: row.querySelector(".customer-address-country")?.value.trim() || "",
      province: row.querySelector(".customer-address-province")?.value.trim() || "",
      city: row.querySelector(".customer-address-city")?.value.trim() || "",
      detail: row.querySelector(".customer-address-detail")?.value.trim() || ""
    }));
    state.customerPrimaryAddressIndex = Number(document.querySelector('input[name="customerPrimaryAddress"]:checked')?.value || 0);
    const primaryAddress = state.customerAddresses[state.customerPrimaryAddressIndex] || state.customerAddresses[0];
    state.customerCountry = primaryAddress.country;
    state.customerProvince = primaryAddress.province;
    state.customerCity = primaryAddress.city;
    state.customerDetailAddress = primaryAddress.detail;
  }
}

function captureSupplementForm() {
  state.supplementContent = document.querySelector("#supplementContent")?.value.trim() ?? state.supplementContent;
  state.supplementConclusion = document.querySelector("#supplementConclusion")?.value.trim() ?? state.supplementConclusion;
}

function captureRecordEditForm() {
  if (!state.recordEdit) return;
  const fields = {
    customer: "editRecordCustomer", businessLine: "editRecordBusinessLine", channel: "editRecordChannel",
    time: "editRecordTime", endTime: "editRecordEndTime", location: "editRecordLocation",
    subject: "editRecordSubject", content: "editRecordContent", result: "editRecordResult"
  };
  Object.entries(fields).forEach(([key, id]) => {
    state.recordEdit[key] = document.querySelector(`#${id}`)?.value.trim() ?? state.recordEdit[key];
  });
}

function saveRecordEdit(ownershipConfirmed = false) {
  captureRecordEditForm();
  const edit = state.recordEdit;
  const errors = {};
  const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (!edit.businessLine) errors.businessLine = "请选择业务线。";
  if (!edit.channel) errors.channel = "请选择沟通方式。";
  if (!dateTimePattern.test(edit.time)) errors.time = "开始时间格式应为 YYYY-MM-DD HH:mm。";
  if (edit.endTime && !dateTimePattern.test(edit.endTime)) errors.endTime = "结束时间格式应为 YYYY-MM-DD HH:mm。";
  if (!errors.time && !errors.endTime && edit.endTime && edit.endTime < edit.time) errors.endTime = "结束时间不能早于开始时间。";
  if (!edit.content) errors.content = "请输入沟通内容。";
  state.editRecordErrors = errors;
  if (Object.keys(errors).length) return false;
  const ownershipChanged = edit.customer !== state.recordSnapshot.customer || edit.businessLine !== state.recordSnapshot.businessLine;
  if (ownershipChanged && !ownershipConfirmed) {
    state.recordOwnershipConfirmationOpen = true;
    return false;
  }
  const duration = edit.endTime ? String(Math.round((new Date(edit.endTime.replace(" ", "T")) - new Date(edit.time.replace(" ", "T"))) / 60000)) : "";
  state.recordSnapshot = { ...state.recordSnapshot, customer: edit.customer, businessLine: edit.businessLine, channel: edit.channel, time: edit.time, endTime: edit.endTime, duration, location: edit.channel === "线下拜访" ? edit.location : "", subject: edit.subject || edit.content.slice(0, 28), content: edit.content };
  state.recordConclusion = edit.result;
  state.recordVersion += 1;
  state.recordSupplementAttachmentAdded = state.recordSupplementAttachmentAdded || state.editRecordAttachmentAdded;
  state.supplementedRecord = { ...state.recordSnapshot, conclusion: state.recordConclusion, version: state.recordVersion, supplementAttachmentAdded: state.recordSupplementAttachmentAdded, supplementParticipantAdded: state.recordSupplementParticipantAdded };
  if (!state.selectedRecordIsExisting && state.createdRecord) state.createdRecord = { ...state.supplementedRecord };
  state.recordEdit = null;
  state.recordOwnershipConfirmationOpen = false;
  navigate("record-detail", { replace: true });
  showToast(`修改已保存，当前为版本 ${state.recordVersion}`);
  return true;
}

function captureActiveScreenState() {
  if (state.activeScreen === "customer-form") captureCustomerForm();
  if (state.activeScreen === "manual-record") captureManualForm();
  if (state.activeScreen === "ai-material") captureMaterial();
  if (state.activeScreen === "ai-review") captureAiDraft();
  if (state.activeScreen === "version-diff") captureRecordEditForm();
  if (state.activeScreen === "dedupe") state.dedupeOverrideDetail = document.querySelector("#overrideReason")?.value.trim() ?? state.dedupeOverrideDetail;
  if (state.activeScreen === "governance") state.governanceReason = document.querySelector("#governanceReason")?.value.trim() ?? state.governanceReason;
  state.aiAssistantPrompt = document.querySelector("#aiAssistantPrompt")?.value.trim() ?? state.aiAssistantPrompt;
}

function validateManualFormal() {
  const errors = {};
  const dateTimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (!dateTimePattern.test(state.manualTime)) errors.time = "请输入 YYYY-MM-DD HH:mm 格式的开始时间。";
  if (state.manualEndTime && !dateTimePattern.test(state.manualEndTime)) errors.endTime = "结束时间格式应为 YYYY-MM-DD HH:mm。";
  if (!errors.time && !errors.endTime && state.manualEndTime && state.manualEndTime < state.manualTime) errors.endTime = "结束时间不能早于开始时间。";
  if (!state.manualChannel) errors.channel = "请选择沟通方式。";
  if (!state.manualBusinessLines.length) errors.businessLine = "请至少选择一条涉及业务线。";
  const incompleteTopics = state.manualBusinessLines.filter((line) => {
    const topic = state.manualTopics[line];
    return !topic?.subject || !topic?.keyPoints;
  });
  if (incompleteTopics.length) errors.topics = `${incompleteTopics.join("、")}的主题和沟通要点为必填项。`;
  if (state.manualBusinessLines.length > 1 && !state.manualSubject) errors.subject = "多业务线沟通需要填写记录标题。";
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
    state.aiError = `正式必填仍缺少：${missing.map((key) => ({ customer: "客户", time: "开始时间", channel: "沟通渠道", businessLine: "业务线", content: "沟通要点" })[key]).join("、")}。`;
    return false;
  }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.aiDraft.time)) {
    state.aiError = "开始时间格式应为 YYYY-MM-DD HH:mm。";
    return false;
  }
  if (state.aiDraft.endTime && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.aiDraft.endTime)) {
    state.aiError = "结束时间格式应为 YYYY-MM-DD HH:mm。";
    return false;
  }
  if (state.aiDraft.endTime && state.aiDraft.endTime < state.aiDraft.time) {
    state.aiError = "结束时间不能早于开始时间。";
    return false;
  }
  state.aiError = "";
  return true;
}

function captureMaterial() {
  state.materialText = document.querySelector("#materialText")?.value.trim() ?? state.materialText;
}

function handleAction(target, action) {
  if (action === "navigate-back") {
    if (["manual-record", "customer-form"].includes(state.activeScreen) && !state.draftExitPrompt) {
      captureActiveScreenState();
      state.draftExitPrompt = state.activeScreen === "manual-record" ? "record" : "customer";
      state.draftExitFallback = target.dataset.fallback || (state.activeScreen === "manual-record" ? "records" : "customers");
      renderPhone();
      return;
    }
    navigateBack(target.dataset.fallback);
    return;
  }
  if (action === "continue-form-edit") {
    state.draftExitPrompt = "";
    renderPhone();
    return;
  }
  if (action === "discard-form-exit" || action === "save-form-draft-exit") {
    const saved = action === "save-form-draft-exit";
    const fallback = state.draftExitFallback || "workbench";
    state.draftExitPrompt = "";
    state.draftExitFallback = "";
    navigateBack(fallback);
    if (saved) showToast("草稿已保存，可在“我的”中继续编辑");
    return;
  }
  if (action === "set-workbench-pending-tab") {
    state.workbenchPendingTab = target.dataset.tab;
    renderPhone();
    return;
  }
  if (action === "open-line-access-pending") {
    showToast("业务线申请正在审批中");
    return;
  }
  if (action === "open-expired-schedule") {
    state.recordsCalendarMode = "day";
    state.followUpSelectedDate = PROTOTYPE_TODAY;
    state.selectedScheduleId = "schedule-factory-visit";
    navigate("records");
    return;
  }
  if (action === "open-failed-material") {
    state.processState = "failed";
    navigate("ai-processing");
    return;
  }
  if (action === "open-manager-assignment") {
    showToast("已打开管理者指派事项");
    return;
  }
  if (action === "open-workbench-calendar") {
    state.recordsCalendarMode = "day";
    state.recordsShowSchedules = true;
    state.recordsShowCommunications = true;
    state.followUpSelectedDate = PROTOTYPE_TODAY;
    state.workbenchNotificationOpen = false;
    navigate("records");
    return;
  }
  if (action === "open-workbench-pending") {
    state.workbenchView = "pending";
    state.workbenchNotificationOpen = false;
    renderPhone();
    return;
  }
  if (action === "open-record-list") {
    state.recordsCalendarMode = "list";
    navigate("records");
    return;
  }
  if (action === "open-all-records") {
    state.recordsCalendarMode = "list";
    state.recordsShowSchedules = true;
    state.recordsShowCommunications = true;
    state.followUpListBusinessLine = "";
    state.followUpListTime = "全部时间";
    state.followUpListSearch = "";
    navigate("records");
    return;
  }
  if (action === "set-record-calendar-mode") {
    state.recordsCalendarMode = target.dataset.mode;
    state.recordsCreateMenuOpen = false;
    state.followUpListFiltersOpen = false;
    renderPhone();
    return;
  }
  if (action === "toggle-record-type") {
    const key = target.dataset.type === "schedule" ? "recordsShowSchedules" : "recordsShowCommunications";
    if (state[key] && Number(state.recordsShowSchedules) + Number(state.recordsShowCommunications) === 1) {
      showToast("至少保留一种内容类型");
      return;
    }
    state[key] = !state[key];
    renderPhone();
    return;
  }
  if (action === "toggle-record-create-menu") {
    state.recordsCreateMenuOpen = !state.recordsCreateMenuOpen;
    state.followUpListFiltersOpen = false;
    state.scheduleComposerOpen = false;
    renderPhone();
    return;
  }
  if (action === "open-follow-up-list-filters") {
    state.followUpListSearch = document.querySelector("#followUpListSearch")?.value.trim() ?? state.followUpListSearch;
    state.followUpListFiltersOpen = true;
    state.recordsCreateMenuOpen = false;
    renderPhone();
    return;
  }
  if (action === "close-follow-up-list-filters" || action === "apply-follow-up-list-filters") {
    state.followUpListFiltersOpen = false;
    renderPhone();
    return;
  }
  if (action === "set-follow-up-list-filter") {
    if (target.dataset.filter === "businessLine") state.followUpListBusinessLine = target.dataset.value;
    if (target.dataset.filter === "time") state.followUpListTime = target.dataset.value;
    renderPhone();
    return;
  }
  if (action === "remove-follow-up-list-filter") {
    if (target.dataset.filter === "businessLine") state.followUpListBusinessLine = "";
    if (target.dataset.filter === "time") state.followUpListTime = "全部时间";
    renderPhone();
    return;
  }
  if (action === "reset-follow-up-list-filters") {
    state.followUpListBusinessLine = "";
    state.followUpListTime = "全部时间";
    renderPhone();
    return;
  }
  if (action === "clear-follow-up-search") {
    state.followUpListSearch = "";
    renderPhone();
    return;
  }
  if (action === "close-record-create-menu") {
    state.recordsCreateMenuOpen = false;
    renderPhone();
    return;
  }
  if (action === "open-schedule-create") {
    state.recordsCreateMenuOpen = false;
    state.scheduleComposerOpen = true;
    state.scheduleDraftDate = state.followUpSelectedDate;
    state.scheduleDraftError = "";
    renderPhone();
    return;
  }
  if (action === "set-schedule-channel") {
    state.scheduleDraftTitle = document.querySelector("#scheduleDraftTitle")?.value.trim() ?? state.scheduleDraftTitle;
    state.scheduleDraftDate = document.querySelector("#scheduleDraftDate")?.value ?? state.scheduleDraftDate;
    state.scheduleDraftTime = document.querySelector("#scheduleDraftTime")?.value ?? state.scheduleDraftTime;
    state.scheduleDraftEndTime = document.querySelector("#scheduleDraftEndTime")?.value ?? state.scheduleDraftEndTime;
    state.scheduleDraftCustomer = document.querySelector("#scheduleDraftCustomer")?.value.trim() ?? state.scheduleDraftCustomer;
    state.scheduleDraftDetail = document.querySelector("#scheduleDraftDetail")?.value.trim() ?? state.scheduleDraftDetail;
    state.scheduleDraftBusinessLines = [...document.querySelectorAll('input[name="scheduleBusinessLine"]:checked')].map((input) => input.value);
    state.scheduleDraftChannel = target.dataset.value;
    renderPhone();
    return;
  }
  if (action === "close-schedule-create") {
    state.scheduleComposerOpen = false;
    state.scheduleDraftError = "";
    renderPhone();
    return;
  }
  if (action === "save-schedule") {
    state.scheduleDraftTitle = document.querySelector("#scheduleDraftTitle")?.value.trim() || "";
    state.scheduleDraftDate = document.querySelector("#scheduleDraftDate")?.value || "";
    state.scheduleDraftTime = document.querySelector("#scheduleDraftTime")?.value || "";
    state.scheduleDraftEndTime = document.querySelector("#scheduleDraftEndTime")?.value || "";
    state.scheduleDraftCustomer = document.querySelector("#scheduleDraftCustomer")?.value.trim() || "";
    state.scheduleDraftBusinessLines = [...document.querySelectorAll('input[name="scheduleBusinessLine"]:checked')].map((input) => input.value);
    state.scheduleDraftChannel = document.querySelector("#scheduleDraftChannel")?.value || "微信";
    state.scheduleDraftDetail = document.querySelector("#scheduleDraftDetail")?.value.trim() || "";
    if (!state.scheduleDraftTitle || !state.scheduleDraftDate || !state.scheduleDraftTime || !state.scheduleDraftBusinessLines.length) {
      state.scheduleDraftError = "请填写日程主题、日期、开始时间，并至少选择一条业务线。";
      renderPhone();
      return;
    }
    if (state.scheduleDraftEndTime && state.scheduleDraftEndTime <= state.scheduleDraftTime) {
      state.scheduleDraftError = "结束时间需晚于开始时间。";
      renderPhone();
      return;
    }
    state.createdWorkbenchSchedules.push({ id: `schedule-created-${Date.now()}`, date: state.scheduleDraftDate, time: state.scheduleDraftTime, endTime: state.scheduleDraftEndTime, title: state.scheduleDraftTitle, customer: state.scheduleDraftCustomer || "未关联客户", businessLines: [...state.scheduleDraftBusinessLines], channel: state.scheduleDraftChannel, note: state.scheduleDraftDetail });
    state.followUpSelectedDate = state.scheduleDraftDate;
    state.scheduleComposerOpen = false;
    state.scheduleDraftTitle = "";
    state.scheduleDraftEndTime = "";
    state.scheduleDraftCustomer = "";
    state.scheduleDraftBusinessLines = [];
    state.scheduleDraftChannel = "微信";
    state.scheduleDraftDetail = "";
    state.scheduleDraftError = "";
    showToast("日程已创建");
    return;
  }
  if (action === "open-communication-create") {
    state.recordsCreateMenuOpen = false;
    state.manualRecordBack = "records";
    navigate("manual-record");
    return;
  }
  if (action === "set-follow-up-date") {
    state.followUpSelectedDate = target.dataset.date;
    renderPhone();
    return;
  }
  if (action === "go-follow-up-today") {
    state.followUpSelectedDate = PROTOTYPE_TODAY;
    if (state.recordsCalendarMode === "list") state.recordsCalendarMode = "day";
    renderPhone();
    return;
  }
  if (action === "shift-follow-up-days") {
    showToast(target.dataset.direction === "previous" ? "原型仅展示最近一行日期" : "已是最近日期");
    return;
  }
  if (action === "open-schedule-preview") {
    state.selectedScheduleId = target.dataset.scheduleId;
    renderPhone();
    return;
  }
  if (action === "close-schedule-preview") {
    state.selectedScheduleId = "";
    renderPhone();
    return;
  }
  if (action === "record-schedule-communication") {
    const schedule = getSchedules().find((item) => (item.id || `${item.date}-${item.time}-${item.title}`) === target.dataset.scheduleId);
    if (!schedule) return;
    state.customerName = schedule.customer;
    state.manualBusinessLines = [...(schedule.businessLines || [])];
    state.manualBusinessLine = state.manualBusinessLines[0] || "";
    state.manualTopics = Object.fromEntries(state.manualBusinessLines.map((line) => [line, { subject: schedule.title, keyPoints: "", result: "" }]));
    state.manualSubject = schedule.title;
    state.manualTime = `${schedule.date} ${schedule.time}`;
    state.manualEndTime = schedule.endTime ? `${schedule.date} ${schedule.endTime}` : "";
    state.manualChannel = schedule.channel;
    state.manualRecordBack = "records";
    state.selectedScheduleId = "";
    navigate("manual-record");
    return;
  }
  if (action === "mark-schedule-not-happened") {
    state.selectedScheduleId = "";
    showToast("已确认日程未发生");
    return;
  }
  if (action === "toggle-workbench-notifications") {
    state.workbenchNotificationOpen = !state.workbenchNotificationOpen;
    renderPhone();
    return;
  }
  if (action === "mark-workbench-notifications-read") {
    state.workbenchHasUnread = false;
    state.workbenchNotificationOpen = false;
    showToast("通知已全部标为已读");
    return;
  }
  if (action === "open-ai-assistant") {
    captureActiveScreenState();
    state.aiAssistantOpen = true;
    state.aiAssistantError = "";
    renderPhone();
    return;
  }
  if (action === "close-ai-assistant") {
    captureActiveScreenState();
    state.aiAssistantOpen = false;
    state.aiAssistantError = "";
    renderPhone();
    requestAnimationFrame(() => document.querySelector(".ai-assistant-fab")?.focus());
    return;
  }
  if (action === "reset-ai-assistant") {
    state.aiAssistantPrompt = "";
    state.aiAssistantResponse = "";
    state.aiAssistantError = "";
    state.aiAssistantPendingAction = "";
    renderPhone();
    return;
  }
  if (action === "submit-ai-assistant") {
    const prompt = document.querySelector("#aiAssistantPrompt")?.value.trim() || "";
    state.aiAssistantPrompt = prompt;
    if (!prompt) {
      state.aiAssistantError = "请输入需要处理的业务指令。";
      renderPhone();
      return;
    }
    state.aiAssistantError = "";
    if (prompt.includes("新增客户")) {
      state.aiAssistantPendingAction = "create-customer";
      state.aiAssistantResponse = "打开新增客户表单，并保留后台查重流程。";
    } else if (prompt.includes("跟进") || prompt.includes("沟通")) {
      state.aiAssistantPendingAction = "record-follow-up";
      state.aiAssistantResponse = "打开跟进记录表单，由你确认内容后保存。";
    } else {
      state.aiAssistantPendingAction = "general";
      state.aiAssistantResponse = `基于“${screenById[state.activeScreen].title}”处理该指令，执行前保留人工确认。`;
    }
    renderPhone();
    return;
  }
  if (action === "confirm-ai-assistant") {
    const pendingAction = state.aiAssistantPendingAction;
    state.aiAssistantOpen = false;
    state.aiAssistantPrompt = "";
    state.aiAssistantResponse = "";
    state.aiAssistantError = "";
    state.aiAssistantPendingAction = "";
    if (pendingAction === "create-customer") {
      handleAction(target, "start-customer-create");
      return;
    }
    if (pendingAction === "record-follow-up") {
      navigate("manual-record");
      return;
    }
    showToast("智能助手操作已确认（原型演示）");
    return;
  }
  if (action === "open-ready-draft") {
    if (state.aiDraftStatus === "confirmed") {
      showToast("该草稿已确认并生成正式记录");
      return;
    }
    state.processState = "ready";
    state.aiDraftStatus = "ready";
    state.aiError = "";
    navigate("ai-review");
    return;
  }
  if (action === "continue-manual-draft") {
    state.customerName = "远见数字供应链";
    state.manualBusinessLine = "会奖服务";
    state.manualBusinessLines = ["会奖服务"];
    state.manualTopics["会奖服务"] = { subject: "会议纪要补录", keyPoints: "", result: "" };
    state.manualChannel = "手机";
    state.manualSubject = "会议纪要补录";
    navigate("manual-record");
    return;
  }
  if (action === "open-dedupe-candidate") {
    state.customerName = "华东智造";
    state.customerShortName = "华东智造";
    state.customerBusinessLine = "商旅";
    state.customerFormMode = "create";
    state.dedupeStage = "candidate";
    state.dedupeExistingBusinessLines = ["商旅", "会奖服务"];
    state.dedupeOverrideOpen = false;
    state.dedupeOverrideReason = "";
    state.dedupeOverrideDetail = "";
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
      "新港工业设备": { customerShortName: "新港工业", customerBusinessLine: "企业用车", customerRelation: "合作中", customerIndustry: "制造业", customerCity: "苏州市", customerProvince: "江苏省" },
      "澄海精密制造": { customerShortName: "澄海精密", customerBusinessLine: "会奖服务", customerRelation: "已终止", customerContactName: "赵敏", customerContactDepartment: "行政部", customerContactTitle: "行政经理", customerContactMobile: "139****5178", customerIndustry: "制造业", customerCity: "宁波市", customerProvince: "浙江省" },
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
    state.customerOwnerAssignments = [{ role: "前端销售", person: state.customerFrontendSales || "张雨" }];
    if (state.customerBackendSales) state.customerOwnerAssignments.push({ role: "后端销售", person: state.customerBackendSales });
    state.customerAddresses = [{ country: state.customerCountry || "中国", province: state.customerProvince || "", city: state.customerCity || "", detail: state.customerDetailAddress || "" }];
    state.customerPrimaryAddressIndex = 0;
    state.customerBusinessRelations = customerRelationsForName(state.customerName);
    state.customerDetailBusinessLine = state.customerBusinessLineFilter && state.customerBusinessRelations.some((item) => item.line === state.customerBusinessLineFilter) ? state.customerBusinessLineFilter : "all";
    state.customerMinimalProfile = false;
    state.customerFormMode = "edit";
    state.customerTab = "overview";
    navigate("customer-detail");
    return;
  }
  if (action === "select-record") {
    const selectedCreatedRecord = state.createdRecord && target.dataset.subject === state.createdRecord.subject && target.dataset.customer === state.createdRecord.customer;
    const selectedSupplementedRecord = state.supplementedRecord && target.dataset.subject === state.supplementedRecord.subject && target.dataset.customer === state.supplementedRecord.customer;
    const selectedFormalRecord = getFormalRecords().find((record) => record.subject === target.dataset.subject && sameCustomer(record.customer, target.dataset.customer));
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
      : selectedFormalRecord
        ? { ...selectedFormalRecord, businessLine: recordBusinessLines(selectedFormalRecord)[0] || "", businessLines: recordBusinessLines(selectedFormalRecord), topics: recordTopics(selectedFormalRecord), content: selectedFormalRecord.summary || recordTopics(selectedFormalRecord).map((topic) => topic.keyPoints).filter(Boolean).join("；") }
      : {
          customer: target.dataset.customer || "华东智造科技",
          time: target.dataset.time || "8 月 21 日 14:20",
          channel: target.dataset.channel || "电话",
          businessLine: target.dataset.businessLine || "商旅",
          businessLines: (target.dataset.businessLines || target.dataset.businessLine || "商旅").split("|").filter(Boolean),
          duration: target.dataset.channel === "线下拜访" ? "90" : "35",
          location: target.dataset.channel === "线下拜访" ? "客户总部" : "",
          subject: target.dataset.subject || "实施周期与报价方案沟通",
          content: knownContent[target.dataset.subject] || "已记录本次沟通的客观事实。",
          remark: ""
        };
    state.recordConclusion = selectedCreatedRecord
      ? state.createdRecord.conclusion || "未填写沟通结果。"
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
    state.recordMoreOpen = false;
    navigate("record-detail");
    return;
  }
  if (action === "toggle-record-more") state.recordMoreOpen = !state.recordMoreOpen;
  if (action === "open-record-edit") {
    const normalizedTime = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(state.recordSnapshot.time) ? state.recordSnapshot.time : "2026-08-21 14:20";
    state.recordEdit = {
      customer: state.recordSnapshot.customer, businessLine: state.recordSnapshot.businessLine, channel: state.recordSnapshot.channel,
      time: normalizedTime, endTime: state.recordSnapshot.endTime || (state.recordSnapshot.duration ? "2026-08-21 14:55" : ""),
      location: state.recordSnapshot.location || "", subject: state.recordSnapshot.subject,
      content: state.recordSnapshot.content, result: state.recordConclusion
    };
    state.editRecordErrors = {};
    state.editRecordAttachmentAdded = false;
    state.recordOwnershipConfirmationOpen = false;
    navigate("version-diff");
    return;
  }
  if (action === "open-record-customer") {
    state.customerName = state.recordSnapshot.customer;
    state.customerBusinessRelations = customerRelationsForName(state.customerName);
    state.customerDetailBusinessLine = state.recordSnapshot.businessLine || "all";
    navigate("customer-detail");
    return;
  }
  if (action === "open-record-next-action") {
    navigate("workbench");
    state.workbenchView = "pending";
    render();
    return;
  }
  if (action === "toggle-filters") {
    if (target.dataset.scope === "customer") state.customerFiltersOpen = !state.customerFiltersOpen;
    if (target.dataset.scope === "record") state.recordFiltersOpen = !state.recordFiltersOpen;
  }
  if (action === "toggle-customer-sort") {
    state.customerSortMenuOpen = !state.customerSortMenuOpen;
    renderPhone();
    return;
  }
  if (action === "set-customer-sort") {
    state.customerSort = target.dataset.value;
    state.customerSortMenuOpen = false;
    renderPhone();
    return;
  }
  if (action === "set-customer-form-choice") {
    captureCustomerForm();
    if (target.dataset.field === "businessLine") state.customerBusinessLine = target.dataset.value;
    if (target.dataset.field === "relation") state.customerRelation = target.dataset.value;
    renderPhone();
    return;
  }
  if (action === "close-customer-filters" || action === "apply-customer-filters") state.customerFiltersOpen = false;
  if (action === "close-record-filters" || action === "apply-record-filters") {
    state.recordCustomStart = document.querySelector("#recordCustomStart")?.value || state.recordCustomStart;
    state.recordCustomEnd = document.querySelector("#recordCustomEnd")?.value || state.recordCustomEnd;
    state.recordFiltersOpen = false;
  }
  if (action === "set-customer-filter") state.customerRelationFilter = state.customerRelationFilter === target.dataset.value ? "" : target.dataset.value;
  if (action === "set-customer-line-filter") {
    state.customerBusinessLineFilter = state.customerBusinessLineFilter === target.dataset.value ? "" : target.dataset.value;
  }
  if (action === "remove-customer-filter") {
    const key = { businessLine: "customerBusinessLineFilter", relation: "customerRelationFilter" }[target.dataset.filter];
    if (key) state[key] = "";
  }
  if (action === "reset-customer-filters") {
    state.customerBusinessLineFilter = "";
    state.customerRelationFilter = "";
  }
  if (action === "set-record-filter") state.recordChannelFilter = state.recordChannelFilter === target.dataset.value ? "全部" : target.dataset.value;
  if (action === "set-record-line-filter") state.recordBusinessLineFilter = state.recordBusinessLineFilter === target.dataset.value ? "" : target.dataset.value;
  if (action === "set-record-time-filter") state.recordTimeFilter = state.recordTimeFilter === target.dataset.value ? "" : target.dataset.value;
  if (action === "set-record-customer-scope") state.recordCustomerScope = target.dataset.value;
  if (action === "remove-record-filter") {
    const key = { customer: "recordCustomerScope", businessLine: "recordBusinessLineFilter", time: "recordTimeFilter" }[target.dataset.filter];
    if (key) state[key] = "";
    if (target.dataset.filter === "channel") state.recordChannelFilter = "全部";
  }
  if (action === "reset-record-filters") {
    state.recordBusinessLineFilter = "";
    state.recordChannelFilter = "全部";
    state.recordTimeFilter = "";
    state.recordCustomerScope = "";
  }
  if (action === "set-customer-tab") state.customerTab = target.dataset.tab;
  if (action === "set-detail-business-line") {
    state.customerDetailBusinessLine = target.dataset.value;
    state.customerTab = "overview";
  }
  if (action === "start-line-record") {
    state.manualRecordBack = "customer-detail";
    state.manualBusinessLine = state.customerDetailBusinessLine === "all" ? "" : state.customerDetailBusinessLine;
    state.manualBusinessLines = state.manualBusinessLine ? [state.manualBusinessLine] : [];
    if (state.manualBusinessLine) state.manualTopics[state.manualBusinessLine] ||= { subject: "", keyPoints: "", result: "" };
    navigate("manual-record");
    return;
  }
  if (action === "add-customer-business-line") {
    const missingLine = BUSINESS_LINES.find((line) => !state.customerBusinessRelations.some((item) => item.line === line));
    if (!missingLine) {
      showToast("所有业务线均已建立");
      return;
    }
    state.customerBusinessRelations.push({ line: missingLine, stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }], contacts: [], lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: "" });
    state.customerDetailBusinessLine = missingLine;
    showToast(`${missingLine}业务线已建立`);
    return;
  }
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
      customerBusinessLine: "", customerRelation: "", customerContactName: "", customerContactDepartment: "", customerContactTitle: "",
      customerContactMobile: "", customerContactEmail: "", customerContactWechat: "", customerContactRemark: "", customerNature: "", customerEmployeeCount: "",
      customerRevenueRange: "", customerListed: "", customerSource: "", customerUscc: "", customerRegistrationNo: "", customerEstablishedDate: "",
      customerRegisteredCapital: "", customerCapitalCurrency: "CNY", customerWebsite: "", customerOfficialAccount: "", customerPublicEmail: "", customerMainPhone: "",
      customerCountry: "中国", customerProvince: "", customerCity: "", customerDetailAddress: "", customerAddresses: [{ country: "中国", province: "", city: "", detail: "" }], customerPrimaryAddressIndex: 0, customerMoreDetailsOpen: false, customerRemark: "", customerOwnerName: "张雨", customerOwnerRole: "销售", customerFrontendSales: "张雨", customerBackendSales: "", customerOwnerAssignments: [{ role: "前端销售", person: "张雨" }], customerBusinessRelations: [], customerDetailBusinessLine: "all",
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
    showToast(state.dedupeExistingBusinessLines.includes(state.customerBusinessLine) ? "业务线加入申请已提交" : "新增业务线申请已提交");
    return;
  }
  if (action === "open-existing-business-line" || action === "add-existing-customer-line") {
    const requestedLine = state.customerBusinessLine;
    state.customerName = "华东智造科技有限公司";
    state.customerShortName = "华东智造科技";
    state.customerBusinessRelations = customerRelationsForName(state.customerName).filter((item) => state.dedupeExistingBusinessLines.includes(item.line));
    if (action === "add-existing-customer-line" && !state.customerBusinessRelations.some((item) => item.line === requestedLine)) {
      state.customerBusinessRelations.push({ line: requestedLine, stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }], contacts: [], lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: "" });
    }
    state.customerDetailBusinessLine = requestedLine;
    state.customerFormMode = "edit";
    completeWorkflow("customer", "customer-detail");
    showToast(action === "add-existing-customer-line" ? `已为现有客户新增${requestedLine}业务线` : `已打开${requestedLine}业务线`);
    return;
  }
  if (action === "continue-new") {
    if (state.dedupeStage === "candidate" && !state.canOverrideDuplicates) state.dedupeError = "当前账号没有继续新增近似客户的权限。";
    else if (state.dedupeStage === "candidate") state.dedupeOverrideOpen = true;
  }
  if (action === "set-override-reason") {
    state.dedupeOverrideDetail = document.querySelector("#overrideReason")?.value.trim() ?? state.dedupeOverrideDetail;
    state.dedupeOverrideReason = target.dataset.value;
  }
  if (action === "select-duplicate") {
    const requestedLine = state.customerBusinessLine;
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
    state.customerOwnerAssignments = [{ role: "前端销售", person: state.customerFrontendSales }, { role: "后端销售", person: state.customerBackendSales }];
    state.customerAddresses = [{ country: state.customerCountry, province: state.customerProvince, city: state.customerCity, detail: state.customerDetailAddress || "" }];
    state.customerPrimaryAddressIndex = 0;
    state.customerBusinessRelations = customerRelationsForName(state.customerName);
    if (!state.customerBusinessRelations.some((item) => item.line === requestedLine)) state.customerBusinessRelations.push({ line: requestedLine, stage: "潜在", owners: [{ role: "前端销售", person: "张雨" }], contacts: [], lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: "" });
    state.customerDetailBusinessLine = requestedLine;
    state.customerMinimalProfile = false;
    completeWorkflow("customer", "customer-detail");
    return;
  }
  if (action === "check-customer-duplicate") {
    captureCustomerForm();
    state.customerDedupeStatus = "idle";
    if (state.customerName.length < 2 || state.customerName.length > 200) {
      state.customerFormError = "请先输入 2–200 字的企业全称。";
    } else if (!state.customerBusinessLine) {
      state.customerFormError = "请先选择业务线。";
    } else if (state.customerName === "远航国际商旅有限公司") {
      state.customerFormError = "";
      state.dedupeStage = "restricted";
      state.dedupeExistingBusinessLines = ["商旅"];
      state.dedupeAccessRequested = false;
      navigate("dedupe");
      return;
    } else if (state.customerName === "华东智造科技有限公司") {
      state.customerFormError = "";
      state.dedupeStage = "strong";
      state.dedupeExistingBusinessLines = ["商旅", "会奖服务"];
      navigate("dedupe");
      return;
    } else if (state.customerName.includes("华东智造")) {
      state.customerFormError = "";
      state.dedupeStage = "candidate";
      state.dedupeExistingBusinessLines = ["商旅", "会奖服务"];
      state.dedupeOverrideOpen = false;
      state.dedupeOverrideReason = "";
      state.dedupeOverrideDetail = "";
      navigate("dedupe");
      return;
    } else {
      state.customerFormError = "";
      state.customerDedupeStatus = "clear";
    }
  }
  if (action === "add-customer-owner") {
    captureCustomerForm();
    const usedRoles = state.customerOwnerAssignments.map((item) => item.role);
    const nextRole = CUSTOMER_OWNER_ROLES.find((role) => !usedRoles.includes(role));
    if (nextRole) state.customerOwnerAssignments.push({ role: nextRole, person: "" });
  }
  if (action === "remove-customer-owner") {
    captureCustomerForm();
    state.customerOwnerAssignments.splice(Number(target.dataset.index), 1);
  }
  if (action === "add-customer-address") {
    captureCustomerForm();
    state.customerAddresses.push({ country: "中国", province: "", city: "", detail: "" });
    state.customerMoreDetailsOpen = true;
  }
  if (action === "remove-customer-address") {
    captureCustomerForm();
    const removedIndex = Number(target.dataset.index);
    state.customerAddresses.splice(removedIndex, 1);
    if (state.customerPrimaryAddressIndex === removedIndex) state.customerPrimaryAddressIndex = 0;
    else if (state.customerPrimaryAddressIndex > removedIndex) state.customerPrimaryAddressIndex -= 1;
    state.customerMoreDetailsOpen = true;
  }
  if (action === "set-primary-customer-address") {
    captureCustomerForm();
    state.customerPrimaryAddressIndex = Number(target.value);
    state.customerMoreDetailsOpen = true;
  }
  if (action === "save-customer-draft") {
    captureCustomerForm();
    state.customerFormError = "";
    showToast("客户草稿已暂存");
    return;
  }
  if (action === "confirm-override") {
    const detail = document.querySelector("#overrideReason")?.value.trim() || "";
    if (!state.dedupeOverrideReason) state.dedupeError = "请选择继续新增原因。";
    else if (detail.length > 500) state.dedupeError = "补充说明不能超过 500 字。";
    else {
      state.dedupeOverrideApproved = true;
      state.customerFormError = "";
      state.customerMinimalProfile = true;
      completeWorkflow("customer", "customer-detail");
      showToast("客户已保存，继续新增理由已写入审计");
      return;
    }
  }
  if (action === "save-customer") {
    captureCustomerForm();
    if (state.customerName.length < 2 || state.customerName.length > 200) state.customerFormError = "企业全称为必填项，请输入 2–200 字。";
    else if (!state.customerBusinessLine) state.customerFormError = "请选择业务线。";
    else if (!state.customerRelation) state.customerFormError = "请选择合作阶段。";
    else if ((state.customerContactMobile || state.customerContactWechat || state.customerContactEmail || state.customerContactDepartment || state.customerContactTitle) && !state.customerContactName) state.customerFormError = "填写联系人资料时，联系人姓名为必填项。";
    else if (state.customerContactName && !(state.customerContactMobile || state.customerContactWechat || state.customerContactEmail)) state.customerFormError = "联系人至少需要填写手机号、微信或邮箱中的一项。";
    else if (!state.customerOwnerAssignments[0]?.person) state.customerFormError = "请选择首个客户跟进负责人。";
    else if (state.customerFormMode === "create" && state.customerName === "远航国际商旅有限公司") {
      state.dedupeStage = "restricted";
      state.dedupeExistingBusinessLines = ["商旅"];
      state.dedupeAccessRequested = false;
      navigate("dedupe");
      showToast("后台查重发现无权查看的已有客户");
      return;
    }
    else if (state.customerFormMode === "create" && state.customerName === "华东智造科技有限公司") {
      state.dedupeStage = "strong";
      state.dedupeExistingBusinessLines = ["商旅", "会奖服务"];
      navigate("dedupe");
      showToast("后台查重发现相同企业");
      return;
    }
    else if (state.customerFormMode === "create" && state.customerName.includes("华东智造")) {
      state.dedupeStage = "candidate";
      state.dedupeExistingBusinessLines = ["商旅", "会奖服务"];
      state.dedupeOverrideOpen = false;
      navigate("dedupe");
      showToast("后台查重发现名称近似客户");
      return;
    }
    else {
      state.customerFormError = "";
      state.customerMinimalProfile = state.customerFormMode === "create";
      state.customerBusinessRelations = [{ line: state.customerBusinessLine, stage: state.customerRelation, owners: state.customerOwnerAssignments.map((item) => ({ ...item })), contacts: state.customerContactName ? [state.customerContactName] : [], lastTime: "暂无沟通", lastChannel: "", lastSubject: "暂无沟通记录", lastSummary: "" }];
      state.customerDetailBusinessLine = state.customerBusinessLine;
      completeWorkflow("customer", "customer-detail");
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
    if (!state.customerOwnerAssignments.some((item) => item.role === "后端销售")) state.customerOwnerAssignments.push({ role: "后端销售", person: "李程" });
    showToast("李程已作为“方案与合同”负责人加入");
    return;
  }
  if (action === "add-participant") {
    if (state.activeScreen === "version-diff") captureRecordEditForm();
    if (target.dataset.side === "internal") state.extraInternalParticipant = true;
    else if (target.dataset.side === "customer") state.extraCustomerParticipant = true;
  }
  if (action === "set-manual-channel") {
    captureManualForm();
    state.manualChannel = target.dataset.value;
    renderPhone();
    return;
  }
  if (action === "toggle-manual-next-action") {
    captureManualForm();
    state.manualNextActionOpen = !state.manualNextActionOpen;
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
      const duration = state.manualEndTime ? String(Math.round((new Date(state.manualEndTime.replace(" ", "T")) - new Date(state.manualTime.replace(" ", "T"))) / 60000)) : "";
      const topics = state.manualBusinessLines.map((line) => ({ businessLine: line, ...state.manualTopics[line] }));
      const generatedSubject = state.manualBusinessLines.length > 1 ? state.manualSubject : topics[0].subject;
      const summary = topics.map((topic) => topic.keyPoints).filter(Boolean).join("；");
      state.recordSnapshot = { customer: state.customerName, time: state.manualTime, endTime: state.manualEndTime, channel: state.manualChannel, businessLine: state.manualBusinessLines[0], businessLines: [...state.manualBusinessLines], topics, duration, location: "", subject: generatedSubject, content: summary, remark: "" };
      state.createdRecord = { ...state.recordSnapshot, conclusion: topics.map((topic) => topic.result).filter(Boolean).join("；"), version: 1 };
      state.recordConclusion = state.createdRecord.conclusion || "未填写沟通结果。";
      state.recordVersion = 1;
      state.selectedRecordIsExisting = false;
      state.supplementContent = "";
      state.supplementConclusion = "";
      state.supplementAttachmentAdded = false;
      state.recordSupplementAttachmentAdded = false;
      state.recordSupplementParticipantAdded = false;
      completeWorkflow("record", "record-detail");
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
  if (action === "set-ai-choice") {
    captureAiDraft();
    state.aiDraft[target.dataset.field] = target.dataset.value;
    renderPhone();
    return;
  }
  if (action === "toggle-ai-next-action") {
    captureAiDraft();
    state.aiNextActionOpen = !state.aiNextActionOpen;
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
    const duration = state.aiDraft.endTime ? String(Math.round((new Date(state.aiDraft.endTime.replace(" ", "T")) - new Date(state.aiDraft.time.replace(" ", "T"))) / 60000)) : "";
    const topic = { businessLine: state.aiDraft.businessLine, subject: state.aiDraft.subject, keyPoints: state.aiDraft.content, result: state.aiDraft.conclusion };
    state.recordSnapshot = { ...state.aiDraft, businessLines: [state.aiDraft.businessLine], topics: [topic], duration, location: "", subject: state.aiDraft.subject || state.aiDraft.content.slice(0, 28) };
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
    completeWorkflow("record", "record-detail");
    showToast("已确认并创建正式记录");
    return;
  }
  if (action === "abandon-ai") {
    if (window.confirm("放弃后草稿不可恢复，但原始材料按治理策略保留。确认放弃？")) {
      cancelWorkflow("record");
      showToast("草稿已放弃，未创建正式记录");
      return;
    }
  }
  if (action === "save-record-edit") {
    saveRecordEdit(false);
    return;
  }
  if (action === "confirm-record-ownership-save") {
    saveRecordEdit(true);
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
    if (state.navigationStack.at(-1) === "record-detail") state.navigationStack.pop();
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
    state.recordEdit = {
      customer: restoredRecord.customer, businessLine: restoredRecord.businessLine, channel: restoredRecord.channel,
      time: restoredRecord.time, endTime: restoredRecord.endTime || "", location: restoredRecord.location || "",
      subject: restoredRecord.subject, content: restoredRecord.content, result: state.recordConclusion
    };
    state.editRecordErrors = {};
    state.recordOwnershipConfirmationOpen = false;
    navigate("version-diff");
    showToast("记录已恢复，可继续编辑");
    return;
  }
  if (action === "logout") showToast("原型模式：未执行真实退出");

  renderPhone();
}

document.addEventListener("click", (event) => {
  if (state.workbenchNotificationOpen && !event.target.closest(".workbench-identity")) {
    state.workbenchNotificationOpen = false;
    renderPhone();
    return;
  }
  const screenTarget = event.target.closest("[data-screen]");
  if (screenTarget) {
    if (screenTarget.dataset.screen === "governance") state.governanceMode = "list";
    const resetsHistory = screenTarget.classList.contains("screen-link") || screenTarget.classList.contains("bottom-nav-button");
    navigate(screenTarget.dataset.screen, { reset: resetsHistory });
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (actionTarget) handleAction(actionTarget, actionTarget.dataset.action);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.followUpListFiltersOpen) {
    state.followUpListFiltersOpen = false;
    renderPhone();
    return;
  }
  if (event.key === "Escape" && (state.recordsCreateMenuOpen || state.scheduleComposerOpen)) {
    state.recordsCreateMenuOpen = false;
    state.scheduleComposerOpen = false;
    state.scheduleDraftError = "";
    renderPhone();
    return;
  }
  if (event.key === "Escape" && state.customerFiltersOpen) {
    state.customerFiltersOpen = false;
    renderPhone();
    return;
  }
  if (event.key === "Escape" && state.workbenchNotificationOpen) {
    state.workbenchNotificationOpen = false;
    renderPhone();
    requestAnimationFrame(() => document.querySelector(".workbench-notification")?.focus());
    return;
  }
  if (!state.aiAssistantOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    handleAction(document.body, "close-ai-assistant");
    return;
  }
  if (event.key !== "Tab") return;
  const panel = document.querySelector(".ai-assistant-panel");
  const focusable = [...(panel?.querySelectorAll('button:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') || [])];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.name === "manualBusinessLine") {
    captureManualForm();
    state.manualBusinessLines.forEach((line) => {
      state.manualTopics[line] ||= { subject: "", keyPoints: "", result: "" };
    });
    state.manualBusinessLine = state.manualBusinessLines[0] || "";
    renderPhone();
    return;
  }
  if (event.target.id === "editRecordChannel") {
    captureRecordEditForm();
    state.recordOwnershipConfirmationOpen = false;
    renderPhone();
    return;
  }
  if (event.target.id === "manualChannel" || event.target.id === "manualNextActionType") {
    captureManualForm();
    renderPhone();
    return;
  }
  if (event.target.id === "ai-channel" || event.target.id === "aiNextActionType") {
    captureAiDraft();
    renderPhone();
    return;
  }
  if (event.target.id === "customerDetailBusinessLine") {
    state.customerDetailBusinessLine = event.target.value;
    state.customerTab = "overview";
    renderPhone();
  }
  if (event.target.id === "customerSort") {
    state.customerSort = event.target.value;
    renderPhone();
  }
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
  if (event.target.id === "aiAttachment") {
    captureAiDraft();
    state.aiAttachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
  if (event.target.id === "supplementAttachment") {
    captureSupplementForm();
    state.supplementAttachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
  if (event.target.id === "editRecordAttachment") {
    captureRecordEditForm();
    state.editRecordAttachmentAdded = Boolean(event.target.files?.length);
    renderPhone();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "followUpListSearch") {
    state.followUpListSearch = event.target.value;
    renderPhone();
    requestAnimationFrame(() => {
      const search = document.querySelector("#followUpListSearch");
      search?.focus();
      search?.setSelectionRange(search.value.length, search.value.length);
    });
    return;
  }
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
  if (event.target.id === "recordSearch") {
    document.querySelectorAll("[data-record-default-heading]").forEach((heading) => { heading.hidden = Boolean(query); });
    const searchHeading = document.querySelector("[data-record-search-heading]");
    if (searchHeading) searchHeading.hidden = !query;
    const searchCount = document.querySelector("[data-record-search-count]");
    if (searchCount) searchCount.textContent = `${visible} 条`;
    document.querySelectorAll(".record-draft-results, .record-results").forEach((panel) => {
      panel.hidden = Boolean(query) && [...panel.querySelectorAll("[data-search-row]")].every((row) => row.hidden);
    });
    document.querySelectorAll(".record-customer-suggestion").forEach((suggestion) => {
      suggestion.hidden = !query || !suggestion.dataset.customerName.toLocaleLowerCase("zh-CN").includes(query) || Boolean(state.recordCustomerScope);
    });
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
