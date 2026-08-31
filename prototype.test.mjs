import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const require = createRequire(import.meta.url);
const { filterRows } = require("./logic.js");
const [html, css, app, readme] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("app.js", root), "utf8"),
  readFile(new URL("README.md", root), "utf8")
]);

test("review shell exposes directory, phone canvas, and page feedback", () => {
  assert.match(html, /id="screenNav"/);
  assert.match(html, /id="phoneScreen"/);
  assert.match(html, /id="reviewContent"/);
  assert.match(html, /id="reviewNotes"/);
});

test("prototype contains fourteen reviewable screens", () => {
  const ids = [...app.matchAll(/id: "([a-z-]+)", group:/g)].map((match) => match[1]);
  assert.equal(ids.length, 14);
  assert.equal(new Set(ids).size, 14);
});

test("core review safety contracts are represented", () => {
  const workbench = app.slice(app.indexOf("function getPendingTodos"), app.indexOf("function customersScreen"));
  assert.doesNotMatch(app, /今日状态摘要|summaryOpen|toggle-summary/);
  assert.match(workbench, /张雨[\s\S]*海天科技集团/);
  assert.match(workbench, /确认华东智造科技沟通记录[\s\S]*open-ready-draft/);
  assert.match(workbench, /选择重复客户或提交加入审批[\s\S]*open-dedupe-candidate/);
  assert.match(workbench, /kind: "AI 草稿"[\s\S]*AI 已完成整理[\s\S]*open-ready-draft/);
  assert.match(workbench, /recentRecords = getFormalRecords\(\)\.filter\(\(row\) => row\.date === PROTOTYPE_TODAY\)[\s\S]*最近沟通/);
  assert.doesNotMatch(workbench, /快速新增|最近事实|通知铃铛|AI 整理/);
  assert.match(app, /AI 不会自动写入正式沟通记录/);
  assert.match(app, /确认正式记录/);
  assert.match(app, /编辑记录不要求填写修改原因，后台自动保留原版本和字段变化/);
  assert.doesNotMatch(app, /AI Job 与草稿尚未同时|READY_FOR_REVIEW|模拟版本冲突/);
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(css, /button:disabled/);
  assert.match(css, /\.switch input:focus-visible \+ span/);
});

test("business wording and filters stay consistent", () => {
  const customers = app.slice(app.indexOf("function customersScreen"), app.indexOf("function dedupeScreen"));
  const records = app.slice(app.indexOf("function recordsScreen"), app.indexOf("function recordDetailScreen"));
  const profile = app.slice(app.indexOf("function profileScreen"), app.indexOf("function renderPhone"));
  assert.doesNotMatch(app, /启用|停用|租户/);
  assert.match(app, /customerRelationFilter: ""[\s\S]*customerBusinessLineFilter: ""/);
  assert.match(customers, /搜索客户、联系人或手机号[\s\S]*quick-filter-strip[\s\S]*已选筛选条件/);
  assert.doesNotMatch(customers, />更多筛选</);
  assert.match(customers, /筛选客户[\s\S]*业务线[\s\S]*合作阶段/);
  assert.doesNotMatch(customers, /customerRegionFilter|sheet-region|请选择省市/);
  assert.doesNotMatch(customers, /跟进状态|客户归属|我的客户⌄|团队客户⌄/);
  assert.match(customers, /customer-list-toolbar[\s\S]*最近沟通[\s\S]*最近创建/);
  assert.doesNotMatch(customers, /最久未沟通|下次跟进时间|客户名称/);
  assert.match(customers, /businessLines: \[\{ line: "企业用车", stage: "潜在" \}[\s\S]*customer-line-count[\s\S]*customer-context-line/);
  assert.match(customers, /row\.businessLines\.some[\s\S]*item\.line === state\.customerBusinessLineFilter[\s\S]*item\.stage === state\.customerRelationFilter/);
  assert.doesNotMatch(customers, /\$\{row\.city\}|\$\{row\.followUp\}/);
  assert.doesNotMatch(customers, /\$\{row\.contact\}<br>/);
  assert.match(customers, /data-search-text="\$\{row\.name\} \$\{row\.shortName\} \$\{row\.contact\} \$\{row\.mobile\}"/);
  assert.doesNotMatch(customers, /followUpMeta|天未跟进|今天待跟进|天未联系/);
  assert.match(customers, /共 \$\{resultCount\} 家客户[\s\S]*查看 \$\{resultCount\} 家客户/);
  assert.doesNotMatch(customers, /title: "客户", subtitle:/);
  for (const text of ["跟进记录", "日程安排", "沟通记录", "列表", "时间倒序"]) {
    assert.match(records, new RegExp(text));
  }
  assert.match(records, /筛选正式沟通[\s\S]*业务线[\s\S]*沟通方式[\s\S]*沟通时间/);
  assert.match(records, /近7日[\s\S]*近30日[\s\S]*近90日[\s\S]*本年度[\s\S]*自定义日期/);
  assert.match(records, /recordCustomerScope[\s\S]*recordBusinessLineFilter[\s\S]*recordChannelFilter[\s\S]*recordTimeFilter/);
  assert.match(records, /record-customer-suggestion[\s\S]*set-record-customer-scope/);
  assert.doesNotMatch(records, /待完成|去确认|继续编辑|recordDraftRow|draftRows|参与人：|status-chip formal/);
  assert.match(profile, /所属企业/);
  assert.match(app, /set-customer-line-filter[\s\S]*set-customer-filter[\s\S]*set-record-filter[\s\S]*set-record-line-filter[\s\S]*set-record-time-filter/);
  assert.deepEqual(filterRows([["潜在"], ["已成交"]], 0, "潜在"), [["潜在"]]);
  assert.deepEqual(filterRows([["电话"], ["线下拜访"]], 0, "全部"), [["电话"], ["线下拜访"]]);
});

test("workbench separates shortcuts, schedules, pending work, and recent formal follow-ups", () => {
  const workbench = app.slice(app.indexOf("function getPendingTodos"), app.indexOf("function customersScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(workbench, /hideHeader: true/);
  assert.match(workbench, /visually-hidden">工作台/);
  assert.match(workbench, /workbench-action-module[\s\S]*新增客户[\s\S]*新增沟通记录/);
  assert.match(workbench, /workbench-header-date[\s\S]*周四[\s\S]*08\.27[\s\S]*跟进记录[\s\S]*今日日程[\s\S]*最近沟通[\s\S]*待处理[\s\S]*open-workbench-pending/);
  assert.match(app, /BASE_SCHEDULES[\s\S]*09:30[\s\S]*14:00/);
  assert.match(workbench, /workbench-notification[\s\S]*workbenchNotificationPanel/);
  assert.match(actions, /action === "toggle-workbench-notifications"[\s\S]*action === "mark-workbench-notifications-read"/);
  assert.match(workbench, /kind: "AI 草稿"[\s\S]*baseTodos[\s\S]*sort\(\(a, b\) => Number\(a\.priorityClass !== "important"\)/);
  assert.match(workbench, /aiDraftStatus === "confirmed"[\s\S]*\? \[\][\s\S]*AI 草稿/);
  assert.match(workbench, /todo-labels[\s\S]*todo-context[\s\S]*aria-hidden="true">›/);
  assert.match(workbench, /todos\.slice\(0, 2\)/);
  assert.match(workbench, /跟进记录[\s\S]*open-all-records[\s\S]*查看全部[\s\S]*schedule-preview-card[\s\S]*communication-preview-card[\s\S]*最近沟通[\s\S]*近 1 天/);
  assert.match(workbench, /recentRecords = getFormalRecords\(\)\.filter\(\(row\) => row\.date === PROTOTYPE_TODAY\)/);
  assert.doesNotMatch(workbench, /今天",|本周|所有待办|toggle-workbench-add|actionLabel|完整月历/);
  assert.doesNotMatch(workbench, /workbenchRange|workbenchAddMenuOpen|workbenchSubview|toggle-workbench-add|open-schedule-create|open-todo-create/);
  assert.doesNotMatch(app, /function workbenchCalendarScreen|calendar-grid|toggle-workbench-schedule-form|save-workbench-schedule/);
  assert.match(workbench, /function pendingTodoRow[\s\S]*function workbenchPendingScreen/);
  assert.doesNotMatch(workbench, /去处理/);
  assert.match(workbench, /仅显示最近一周[\s\S]*data-tab="active">待处理[\s\S]*data-tab="processed">已处理/);
  assert.match(actions, /action === "open-workbench-calendar"[\s\S]*recordsCalendarMode = "day"[\s\S]*followUpSelectedDate = PROTOTYPE_TODAY[\s\S]*navigate\("records"\)/);
  assert.match(actions, /action === "open-ready-draft"[\s\S]*aiDraftStatus === "confirmed"[\s\S]*该草稿已确认并生成正式记录/);
});

test("follow-up records provide day and filtered list views", () => {
  const records = app.slice(app.indexOf("function recordsScreen"), app.indexOf("function recordDetailScreen"));
  const data = app.slice(app.indexOf("function getSchedules"), app.indexOf("function getPendingTodos"));
  const baseRecords = app.slice(app.indexOf("const BASE_FORMAL_RECORDS"), app.indexOf("const screens"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(app, /\["records", "跟进记录", "records"\]/);
  assert.match(app, /recordsCalendarMode: "day"[\s\S]*recordsShowSchedules: true[\s\S]*recordsShowCommunications: true/);
  assert.match(records, /\[\["day", "单日"\], \["list", "列表"\]\]/);
  assert.match(records, /records-type-filters[\s\S]*日程安排[\s\S]*沟通记录/);
  assert.match(records, /records-period-summary[\s\S]*records-type-filters[\s\S]*records-calendar-controls[\s\S]*records-view-tabs/);
  assert.match(records, /follow-up-search-row[\s\S]*followUpListSearch[\s\S]*open-follow-up-list-filters[\s\S]*follow-up-active-filters/);
  assert.match(records, /function getFilteredFollowUpList[\s\S]*followUpListBusinessLine[\s\S]*followUpListTime[\s\S]*followUpListSearch[\s\S]*今天[\s\S]*本周[\s\S]*本月/);
  assert.doesNotMatch(records, /follow-up-list-filter-bar|data-filter="customer"|followUpListCustomer/);
  assert.match(records, /function followUpListFilterLayer[\s\S]*筛选列表[\s\S]*全部时间[\s\S]*查看 \$\{resultCount\} 条/);
  assert.match(records, /follow-up-week[\s\S]*followUpListView/);
  assert.doesNotMatch(records, /follow-up-month|shift-follow-up-month|\["month", "月"\]/);
  assert.match(records, /follow-up-section-card schedule-card[\s\S]*follow-up-section-card communication-card/);
  assert.doesNotMatch(records, /follow-up-type-tag|schedule-type|communication-type/);
  assert.doesNotMatch(records.slice(0, records.indexOf("function allRecordsScreen")), /查看全部|titleAction:/);
  assert.match(records, /toggle-record-create-menu[\s\S]*新增日程[\s\S]*新增沟通记录/);
  assert.match(records, /scheduleDraftTitle[\s\S]*scheduleDraftDate[\s\S]*scheduleDraftTime[\s\S]*scheduleDraftEndTime[\s\S]*scheduleBusinessLine[\s\S]*微信[\s\S]*手机[\s\S]*线下拜访[\s\S]*保存日程/);
  assert.match(records, /function scheduleMeta[\s\S]*businessLines\.join\("\/"\)[\s\S]*item\.channel/);
  assert.doesNotMatch(records.slice(0, records.indexOf("function allRecordsScreen")), /draftRows|recordDraftRow|待完成/);
  assert.doesNotMatch(baseRecords, /实施周期与报价方案沟通/);
  assert.match(app, /aiDraft:[\s\S]*time: "2026-08-27 16:20"/);
  assert.match(data, /duplicateIndex[\s\S]*records\.splice\(duplicateIndex, 1, createdRow\)/);
  assert.match(actions, /action === "open-all-records"[\s\S]*recordsCalendarMode = "list"[\s\S]*recordsShowSchedules = true[\s\S]*recordsShowCommunications = true/);
  assert.match(actions, /action === "toggle-record-type"[\s\S]*至少保留一种内容类型/);
  assert.match(actions, /action === "go-follow-up-today"[\s\S]*followUpSelectedDate = PROTOTYPE_TODAY/);
  assert.match(actions, /action === "open-follow-up-list-filters"[\s\S]*action === "set-follow-up-list-filter"[\s\S]*action === "remove-follow-up-list-filter"[\s\S]*action === "reset-follow-up-list-filters"/);
  assert.match(actions, /action === "save-schedule"[\s\S]*scheduleDraftEndTime[\s\S]*scheduleDraftBusinessLines[\s\S]*结束时间需晚于开始时间[\s\S]*createdWorkbenchSchedules\.push/);
  assert.match(actions, /action === "set-follow-up-date"[\s\S]*followUpSelectedDate = target\.dataset\.date/);
  assert.match(css, /\.follow-up-week-days[^}]*grid-template-columns: repeat\(7/);
  assert.match(css, /\.records-view-tabs[^}]*grid-template-columns: repeat\(2/);
});

test("global assistant is available from the shared mobile frame", () => {
  const frame = app.slice(app.indexOf("function aiAssistantLayer"), app.indexOf("function workbenchScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(frame, /ai-assistant-fab[\s\S]*打开智能助手/);
  assert.match(frame, /screenById\[state\.activeScreen\][\s\S]*当前页面/);
  assert.match(frame, /submit-ai-assistant/);
  assert.match(frame, /confirm-ai-assistant/);
  assert.match(actions, /action === "open-ai-assistant"[\s\S]*action === "submit-ai-assistant"[\s\S]*action === "confirm-ai-assistant"/);
  assert.match(frame, /aiAssistantResponse \? "readonly"/);
  assert.match(app, /function captureActiveScreenState[\s\S]*aiAssistantPrompt/);
  assert.match(app, /event\.key === "Escape"[\s\S]*event\.key !== "Tab"/);
  assert.match(css, /\.ai-assistant-fab[\s\S]*\.ai-assistant-panel/);
});

test("customer creation keeps dedupe in the background", () => {
  const workbench = app.slice(app.indexOf("function workbenchScreen"), app.indexOf("function customersScreen"));
  const form = app.slice(app.indexOf("function customerFormScreen"), app.indexOf("function customerDetailScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(workbench, /data-action="start-customer-create"/);
  assert.match(actions, /action === "start-customer-create"[\s\S]*navigate\("customer-form"\)/);
  assert.match(actions, /action === "save-customer"[\s\S]*dedupeStage = "strong"[\s\S]*dedupeStage = "candidate"/);
  assert.match(form, /data-action="check-customer-duplicate"/);
  assert.match(form, /暂未发现近似客户，保存时将再次校验[\s\S]*✓/);
  assert.match(actions, /action === "check-customer-duplicate"[\s\S]*navigate\("dedupe"\)[\s\S]*customerDedupeStatus = "clear"/);
  assert.equal((form.match(/<details class="form-section"/g) || []).length, 3);
  assert.match(form, /客户信息[\s\S]*id="customerBusinessLine"[\s\S]*id="customerRelation"/);
  assert.match(form, /联系人[\s\S]*id="customerContactMobile"[\s\S]*id="customerContactWechat"[\s\S]*id="customerContactEmail"/);
  assert.match(form, /联系人与跟进负责人[\s\S]*客户跟进负责人[\s\S]*角色由管理员配置[\s\S]*add-customer-owner/);
  assert.match(form, /customerContactRemark" class="compact-textarea" rows="2"/);
  assert.match(form, /data-customer-address[\s\S]*customerPrimaryAddress[\s\S]*add-customer-address/);
  assert.match(form, /更多企业资料[\s\S]*企业性质[\s\S]*统一社会信用代码[\s\S]*企业电话[\s\S]*>备注</);
  assert.match(form, /customer-owner-role[\s\S]*CUSTOMER_OWNER_ROLES[\s\S]*customer-owner-person/);
  assert.doesNotMatch(form, /id="(?:customer)?RoleName"/);
  assert.doesNotMatch(form, /客户备注|>取消</);
  assert.doesNotMatch(form, /save-customer-draft">暂存/);
  assert.match(form, /draftExitDialog\("customer"\)/);
  assert.match(form, /统一社会信用代码/);
  assert.match(form, /仅用于精确识别同名企业/);
  assert.match(app, /function captureCustomerForm[\s\S]*customerContactMobile[\s\S]*customerBusinessLine/);
  assert.match(actions, /action === "add-customer-owner"[\s\S]*action === "remove-customer-owner"[\s\S]*action === "add-customer-address"[\s\S]*action === "remove-customer-address"[\s\S]*action === "set-primary-customer-address"/);
  assert.doesNotMatch(readme, /新增客户 → 查重 → 客户表单/);
});

test("customer detail scopes stage, owners, contacts, and records by business line", () => {
  const detail = app.slice(app.indexOf("function customerDetailScreen"), app.indexOf("function manualRecordScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(detail, /customerDetailBusinessLine[\s\S]*全部业务线/);
  assert.match(detail, /业务线状态/);
  for (const section of ["最近沟通", "跟进负责人", "主要联系人", "客户信息"]) {
    assert.match(detail, new RegExp(section));
  }
  assert.match(detail, /所属行业[\s\S]*客户来源[\s\S]*主地址[\s\S]*企业详细信息/);
  assert.doesNotMatch(detail, /查看完整资料|企业资料与地址/);
  assert.match(detail, /visibleRelations[\s\S]*contacts[\s\S]*timeline/);
  assert.match(detail, /customerTimelineRecords = getFormalRecords\(\)[\s\S]*正式沟通 · 时间倒序/);
  assert.match(detail, /草稿和待处理不会出现在客户时间线中/);
  assert.doesNotMatch(detail, /拨打|进行中|已加入|建档时加入/);
  assert.match(actions, /set-detail-business-line[\s\S]*start-line-record[\s\S]*add-customer-business-line/);
});

test("dedupe covers the enterprise dataset without exposing restricted customer data", () => {
  const dedupe = app.slice(app.indexOf("function dedupeScreen"), app.indexOf("function customerFormScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(dedupe, /dedupeStage === "restricted"/);
  assert.match(dedupe, /客户主体与\$\{selectedLine\}业务线查重/);
  assert.match(dedupe, /lineExists[\s\S]*业务线已存在[\s\S]*业务线尚未建立/);
  assert.match(dedupe, /远航国际商旅\*\*\*\*[\s\S]*无权限/);
  assert.match(dedupe, /客户名称重复/);
  assert.doesNotMatch(dedupe, /强命中|客户详情、联系人、地址和负责人已隐藏/);
  assert.match(dedupe, /data-action="request-restricted-access"/);
  assert.match(actions, /远航国际商旅有限公司[\s\S]*dedupeStage = "restricted"/);
  assert.match(actions, /action === "request-restricted-access"[\s\S]*dedupeAccessRequested = true/);
  assert.match(actions, /open-existing-business-line[\s\S]*add-existing-customer-line/);
});

test("communication forms capture the complete relevant field set", () => {
  const form = app.slice(app.indexOf("function manualRecordScreen"), app.indexOf("function recordsScreen"));
  const aiReview = app.slice(app.indexOf("function aiReviewScreen"), app.indexOf("function versionDiffScreen"));
  const actions = app.slice(app.indexOf("function captureManualForm"));
  assert.match(form, /name="manualBusinessLine"[\s\S]*id="manualChannel"[\s\S]*id="manualTime"[\s\S]*id="manualEndTime"/);
  assert.match(form, /data-manual-topic-field="subject"[\s\S]*沟通要点[\s\S]*沟通结果/);
  assert.match(form, /我方参与人[\s\S]*客户参与人[\s\S]*id="manualSubject"/);
  assert.match(form, /communication-topic-section/);
  assert.match(form, /涉及业务线[\s\S]*可多选/);
  assert.doesNotMatch(form, /toggle-manual-next-action/);
  assert.doesNotMatch(form, /<details|manualDuration|manualRemark|manualConclusion|结论 \/ 后续推进/);
  assert.match(actions, /manualEndTime[\s\S]*manualBusinessLines[\s\S]*manualTopics/);
  assert.match(actions, /errors\.businessLine = "请至少选择一条涉及业务线/);
  assert.match(actions, /recordSnapshot = \{ customer: state\.customerName, time: state\.manualTime, endTime: state\.manualEndTime[\s\S]*businessLines:[\s\S]*topics/);
  assert.match(aiReview, /id="ai-businessLine"[\s\S]*id="ai-channel"[\s\S]*id="ai-time"[\s\S]*id="ai-endTime"/);
  assert.match(aiReview, /我方参与人[\s\S]*客户参与人[\s\S]*id="ai-subject"[\s\S]*id="ai-content"[\s\S]*id="ai-conclusion"/);
  assert.doesNotMatch(aiReview, /toggle-ai-next-action|下一步行动/);
  assert.match(aiReview, /id="aiAttachment"/);
  assert.doesNotMatch(aiReview, /时长（分钟）|沟通正文|结论 \/ 后续推进|参与人、结论与备注/);
});

test("record detail and editing support routine correction with version history", () => {
  const detail = app.slice(app.indexOf("function recordDetailScreen"), app.indexOf("function aiMaterialScreen"));
  const edit = app.slice(app.indexOf("function versionDiffScreen"), app.indexOf("function governanceScreen"));
  const save = app.slice(app.indexOf("function saveRecordEdit"), app.indexOf("function captureActiveScreenState"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(detail, /communication-topic-detail[\s\S]*沟通要点[\s\S]*沟通结果/);
  assert.match(detail, /open-record-edit[\s\S]*参与人[\s\S]*topicSections/);
  assert.doesNotMatch(detail, /下一步行动|recordNextActionStatus/);
  assert.match(detail, /最后更新于[\s\S]*变更信息[\s\S]*版本 1 · 创建记录/);
  assert.doesNotMatch(detail, /记录与变更信息|最新版本/);
  assert.doesNotMatch(detail, /参与人快照|正式记录 · 版本|补充记录|人工确认/);
  assert.match(edit, /编辑沟通记录[\s\S]*editRecordCustomer[\s\S]*我方参与人[\s\S]*客户参与人[\s\S]*editRecordContent[\s\S]*保存修改/);
  assert.doesNotMatch(edit, /修改原因|补录遗漏信息|补充沟通内容/);
  assert.match(save, /ownershipChanged[\s\S]*recordOwnershipConfirmationOpen[\s\S]*recordVersion \+= 1[\s\S]*navigate\("record-detail", \{ replace: true \}\)/);
  assert.match(save, /!state\.selectedRecordIsExisting && state\.createdRecord/);
  assert.match(actions, /action === "open-record-edit"[\s\S]*navigate\("version-diff"\)[\s\S]*action === "save-record-edit"[\s\S]*action === "confirm-record-ownership-save"/);
});

test("navigation returns to the actual entry and closes completed workflows", () => {
  const navigation = app.slice(app.indexOf("function navigate(screenId"), app.indexOf("function showToast"));
  const frame = app.slice(app.indexOf("function mobileFrame"), app.indexOf("function workbenchScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(frame, /data-action="navigate-back"[\s\S]*data-fallback/);
  assert.match(navigation, /navigationStack\.push\(previousScreen\)[\s\S]*function navigateBack[\s\S]*navigationStack\.pop\(\)/);
  assert.match(navigation, /customerFlowReturnTarget[\s\S]*recordFlowReturnTarget[\s\S]*function completeWorkflow/);
  assert.match(actions, /completeWorkflow\("customer", "customer-detail"\)[\s\S]*completeWorkflow\("record", "record-detail"\)/);
  assert.match(app, /classList\.contains\("screen-link"\)[\s\S]*classList\.contains\("bottom-nav-button"\)[\s\S]*reset: resetsHistory/);
});

test("list selections and formal saves preserve cross-screen context", () => {
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(app, /data-action="select-customer"[\s\S]*data-action="select-record"/);
  assert.match(actions, /action === "select-customer"[\s\S]*customerName = target\.dataset\.customer[\s\S]*navigate\("customer-detail"\)/);
  assert.match(actions, /action === "select-record"[\s\S]*recordSnapshot[\s\S]*navigate\("record-detail"\)/);
  assert.match(actions, /action === "save-manual-formal"[\s\S]*createdRecord = [\s\S]*businessLines[\s\S]*topics[\s\S]*recordVersion = 1/);
  assert.match(actions, /action === "confirm-ai"[\s\S]*createdRecord = [\s\S]*recordVersion = 1/);
});

test("mobile controls and text meet the revised usability floor", () => {
  assert.match(css, /\.mobile-icon-button[\s\S]*width: 44px;[\s\S]*height: 44px;/);
  assert.match(css, /\.tab-button \{[^}]*min-height: 44px/);
  assert.match(css, /\.field textarea \{[^}]*font-size: 14px/);
});

test("archived records leave and can return to the formal list", () => {
  const records = app.slice(app.indexOf("function getFormalRecords"), app.indexOf("function getPendingTodos"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(records, /state\.archivedRecord[\s\S]*filter/);
  assert.match(actions, /confirm-deactivate-record[\s\S]*state\.archivedRecord =/);
  assert.match(actions, /navigationStack\.at\(-1\) === "record-detail"[\s\S]*navigationStack\.pop\(\)/);
  assert.match(actions, /target\.dataset\.item === "current-record"[\s\S]*state\.archivedRecord = null[\s\S]*navigate\("records"\)/);
});

test("sales can review their own archive and restore before editing", () => {
  const governance = app.slice(app.indexOf("function governanceScreen"), app.indexOf("function profileScreen"));
  const profile = app.slice(app.indexOf("function profileScreen"), app.indexOf("function renderPhone"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(profile, /data-action="open-my-archive"[\s\S]*我的归档/);
  assert.match(governance, /本人归档 · 恢复后可编辑/);
  assert.match(governance, /查看归档详情[\s\S]*只读/);
  assert.match(governance, /data-action="restore-and-edit"[\s\S]*恢复并编辑客户[\s\S]*恢复并补充记录/);
  assert.match(actions, /action === "open-my-archive"[\s\S]*governanceScope = "self"/);
  assert.match(actions, /action === "restore-and-edit"[\s\S]*navigate\("customer-form"\)[\s\S]*navigate\("version-diff"\)/);
});
