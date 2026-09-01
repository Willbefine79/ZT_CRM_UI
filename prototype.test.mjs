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
  assert.match(workbench, /今日安排[\s\S]*scheduleDetailLayer\(schedules\)/);
  assert.doesNotMatch(workbench, /查看今日日程|open-workbench-calendar/);
  assert.doesNotMatch(workbench, /recentRecords|recentRows|最近沟通/);
  assert.doesNotMatch(workbench, /快速新增|最近事实|通知铃铛|AI 整理/);
  assert.match(app, /AI 不会自动写入正式沟通记录/);
  assert.match(app, /确认正式记录/);
  assert.match(app, /编辑记录不要求填写修改原因，后台自动保留原版本和字段变化/);
  assert.doesNotMatch(app, /AI Job 与草稿尚未同时|READY_FOR_REVIEW|模拟版本冲突/);
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(css, /button:disabled/);
  assert.match(css, /\.switch input:focus-visible \+ span/);
  assert.match(app, /PROTOTYPE_TIME = "17:00"[\s\S]*mobile-status[\s\S]*PROTOTYPE_TIME/);
  assert.doesNotMatch(app, />9:41</);
});

test("business wording and filters stay consistent", () => {
  const customers = app.slice(app.indexOf("function customersScreen"), app.indexOf("function dedupeScreen"));
  const moduleDrafts = app.slice(app.indexOf("function moduleDraftListLayer"), app.indexOf("function recordsScreen"));
  const records = app.slice(app.indexOf("function recordsScreen"), app.indexOf("function recordDetailScreen"));
  const profile = app.slice(app.indexOf("function profileScreen"), app.indexOf("function renderPhone"));
  assert.doesNotMatch(app, /启用|停用|租户/);
  assert.match(app, /customerRelationFilter: ""[\s\S]*customerBusinessLineFilter: ""/);
  assert.match(app, /customerListTab: "saved"/);
  assert.match(customers, /const tabs = \[\["saved", "已保存"\], \["draft", "草稿"\], \["archived", "已归档"\]\]/);
  assert.match(customers, /customer-module-tabs/);
  assert.match(customers, /set-customer-list-tab[\s\S]*customerListTab[\s\S]*role="tabpanel"/);
  assert.match(customers, /搜索客户、联系人或手机号[\s\S]*quick-filter-strip[\s\S]*已选筛选条件/);
  assert.match(customers, /1 条客户草稿[\s\S]*open-customer-draft[\s\S]*远航国际商旅/);
  assert.match(customers, /1 家已归档客户[\s\S]*open-customer-archive[\s\S]*北辰工业系统/);
  assert.doesNotMatch(customers, /titleAction:|open-module-drafts|data-draft-kind="customer"/);
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
  assert.match(records, /titleAction:[\s\S]*open-module-drafts[\s\S]*data-draft-kind="communication"[\s\S]*2 条沟通记录草稿/);
  assert.doesNotMatch(records, /年度会议需求沟通|企业用车方案补充|module-drafts-heading/);
  assert.match(moduleDrafts, /沟通记录草稿/);
  assert.doesNotMatch(moduleDrafts, /客户草稿|远航国际商旅/);
  assert.match(moduleDrafts, /年度会议需求沟通[\s\S]*企业用车方案补充/);
  assert.match(moduleDrafts, /data-action="continue-communication-draft"[\s\S]*data-draft-id="annual-meeting"[\s\S]*data-draft-id="vehicle-plan"/);
  assert.match(records, /筛选正式沟通[\s\S]*业务线[\s\S]*沟通方式[\s\S]*沟通时间/);
  assert.match(records, /近7日[\s\S]*近30日[\s\S]*近90日[\s\S]*本年度[\s\S]*自定义日期/);
  assert.match(records, /recordCustomerScope[\s\S]*recordBusinessLineFilter[\s\S]*recordChannelFilter[\s\S]*recordTimeFilter/);
  assert.match(records, /record-customer-suggestion[\s\S]*set-record-customer-scope/);
  assert.doesNotMatch(records, /待完成|去确认|继续编辑|recordDraftRow|draftRows|参与人：|status-chip formal/);
  assert.match(profile, /所属企业/);
  assert.doesNotMatch(profile, /我的归档|open-my-archive|沟通草稿|open-ready-draft|draftItem|身份、草稿与会话/);
  assert.match(app, /set-customer-line-filter[\s\S]*set-customer-filter[\s\S]*set-record-filter[\s\S]*set-record-line-filter[\s\S]*set-record-time-filter/);
  assert.deepEqual(filterRows([["潜在"], ["已成交"]], 0, "潜在"), [["潜在"]]);
  assert.deepEqual(filterRows([["电话"], ["线下拜访"]], 0, "全部"), [["电话"], ["线下拜访"]]);
});

test("workbench separates shortcuts, today's schedule, and pending work", () => {
  const workbench = app.slice(app.indexOf("function getPendingTodos"), app.indexOf("function customersScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(workbench, /hideHeader: true/);
  assert.match(workbench, /visually-hidden">工作台/);
  assert.match(workbench, /workbench-action-module[\s\S]*新增客户[\s\S]*新增沟通记录/);
  assert.match(workbench, /workbench-header-date[\s\S]*周四[\s\S]*08\.27[\s\S]*今日安排[\s\S]*待处理[\s\S]*open-workbench-pending/);
  assert.match(app, /BASE_SCHEDULES[\s\S]*09:30[\s\S]*14:00[\s\S]*18:30/);
  assert.match(workbench, /workbench-notification[\s\S]*workbenchNotificationPanel/);
  assert.match(actions, /action === "toggle-workbench-notifications"[\s\S]*action === "mark-workbench-notifications-read"/);
  assert.match(workbench, /kind: "AI 草稿"[\s\S]*baseTodos[\s\S]*sort\(\(a, b\) => Number\(a\.priorityClass !== "important"\)/);
  assert.match(workbench, /aiDraftStatus === "confirmed"[\s\S]*\? \[\][\s\S]*AI 草稿/);
  assert.match(workbench, /todo-labels[\s\S]*todo-context[\s\S]*aria-hidden="true">›/);
  assert.match(workbench, /todos\.slice\(0, 3\)/);
  assert.match(workbench, /activeSchedules[\s\S]*progress[\s\S]*upcoming[\s\S]*completedSchedules[\s\S]*ended[\s\S]*recorded/);
  assert.match(workbench, /visibleSchedules[\s\S]*activeSchedules[\s\S]*completedSchedules[\s\S]*schedule-preview-card[\s\S]*今日安排[\s\S]*scheduleDetailLayer\(schedules\)/);
  assert.match(workbench, /schedule-expand-button[\s\S]*toggle-workbench-schedules[\s\S]*收起已结束[\s\S]*已结束 \$\{completedSchedules\.length\} 条/);
  assert.doesNotMatch(workbench, /查看今日日程|open-workbench-calendar/);
  assert.match(workbench, /open-workbench-schedule[\s\S]*data-schedule-id[\s\S]*schedule-state/);
  assert.doesNotMatch(workbench, /跟进记录|open-all-records|communication-preview-card|recentRecords|recentRows|最近沟通|近 1 天/);
  assert.doesNotMatch(workbench, /今天",|本周|所有待办|toggle-workbench-add|actionLabel|完整月历/);
  assert.doesNotMatch(workbench, /workbenchRange|workbenchAddMenuOpen|workbenchSubview|toggle-workbench-add|open-schedule-create|open-todo-create/);
  assert.doesNotMatch(app, /function workbenchCalendarScreen|calendar-grid|toggle-workbench-schedule-form|save-workbench-schedule/);
  assert.match(workbench, /function pendingTodoRow[\s\S]*function workbenchPendingScreen/);
  assert.doesNotMatch(workbench, /去处理/);
  assert.match(workbench, /仅显示最近一周[\s\S]*data-tab="active">待处理[\s\S]*data-tab="processed">已处理/);
  assert.match(actions, /action === "open-workbench-schedule"[\s\S]*selectedScheduleId = target\.dataset\.scheduleId[\s\S]*renderPhone\(\)[\s\S]*action === "open-customer-schedule"/);
  assert.match(actions, /action === "toggle-workbench-schedules"[\s\S]*workbenchSchedulesExpanded = !state\.workbenchSchedulesExpanded[\s\S]*renderPhone\(\)/);
  assert.doesNotMatch(actions, /action === "open-workbench-schedule"[\s\S]{0,250}navigate\("records"\)/);
  assert.match(actions, /action === "open-ready-draft"[\s\S]*aiDraftStatus === "confirmed"[\s\S]*该草稿已确认并生成正式记录/);
});

test("follow-up records provide day and filtered list views", () => {
  const records = app.slice(app.indexOf("function recordsScreen"), app.indexOf("function recordDetailScreen"));
  const moduleDrafts = app.slice(app.indexOf("function moduleDraftListLayer"), app.indexOf("function recordsScreen"));
  const data = app.slice(app.indexOf("function getSchedules"), app.indexOf("function getPendingTodos"));
  const baseRecords = app.slice(app.indexOf("const BASE_FORMAL_RECORDS"), app.indexOf("const screens"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(app, /\["records", "跟进记录", "records"\]/);
  assert.match(app, /recordsCalendarMode: "day"[\s\S]*recordsShowSchedules: true[\s\S]*recordsShowCommunications: true/);
  assert.match(records, /body: `\$\{calendar\}<div class="records-content-controls"><div class="records-type-filters"[\s\S]*日程安排[\s\S]*沟通记录/);
  assert.match(records, /records-view-action[\s\S]*show-all-follow-ups[\s\S]*查看全部/);
  assert.match(records, /titleAction:[\s\S]*2 条沟通记录草稿/);
  assert.match(records, /followUpListFilterLayer[\s\S]*moduleDraftListLayer\("communication"\)/);
  assert.match(moduleDrafts, /module-draft-sheet[\s\S]*module-draft-list/);
  assert.match(records, /show-all-follow-ups[\s\S]*查看全部/);
  assert.match(records, /show-dated-follow-ups[\s\S]*按日期查看/);
  assert.doesNotMatch(records, /records-period-summary|records-calendar-controls|records-view-tabs|records-date-nav|>今天<|>单日<|>列表</);
  assert.match(records, /follow-up-search-row[\s\S]*followUpListSearch[\s\S]*open-follow-up-list-filters[\s\S]*follow-up-active-filters/);
  assert.match(records, /function getFilteredFollowUpList[\s\S]*followUpListBusinessLine[\s\S]*followUpListTime[\s\S]*followUpListSearch[\s\S]*今天[\s\S]*本周[\s\S]*本月/);
  assert.doesNotMatch(records, /follow-up-list-filter-bar|data-filter="customer"|followUpListCustomer/);
  assert.match(records, /function followUpListFilterLayer[\s\S]*筛选列表[\s\S]*全部时间[\s\S]*查看 \$\{resultCount\} 条/);
  assert.match(records, /follow-up-week[\s\S]*followUpListView/);
  assert.doesNotMatch(records, /follow-up-month|shift-follow-up-month|\["month", "月"\]/);
  assert.match(records, /follow-up-section-card schedule-card[\s\S]*follow-up-section-card communication-card/);
  assert.doesNotMatch(records, /follow-up-type-tag|schedule-type|communication-type/);
  assert.match(records.slice(0, records.indexOf("function allRecordsScreen")), /titleAction:[\s\S]*2 条沟通记录草稿/);
  assert.match(records, /toggle-record-create-menu[\s\S]*新增日程[\s\S]*新增沟通记录/);
  assert.match(records, /scheduleDraftTitle[\s\S]*scheduleDraftDate[\s\S]*scheduleDraftTime[\s\S]*scheduleDraftEndTime[\s\S]*scheduleBusinessLine[\s\S]*微信[\s\S]*手机[\s\S]*线下拜访[\s\S]*保存日程/);
  assert.match(records, /function scheduleMeta[\s\S]*businessLines\.join\("\/"\)[\s\S]*item\.channel/);
  assert.doesNotMatch(records.slice(0, records.indexOf("function allRecordsScreen")), /draftRows|recordDraftRow|待完成/);
  assert.doesNotMatch(baseRecords, /实施周期与报价方案沟通/);
  assert.match(app, /aiDraft:[\s\S]*time: "2026-08-27 16:20"/);
  assert.match(data, /duplicateIndex[\s\S]*records\.splice\(duplicateIndex, 1, createdRow\)/);
  assert.match(actions, /action === "open-all-records"[\s\S]*recordsCalendarMode = "list"[\s\S]*recordsShowSchedules = true[\s\S]*recordsShowCommunications = true/);
  assert.match(actions, /action === "toggle-record-type"[\s\S]*至少保留一种内容类型/);
  assert.match(actions, /action === "show-all-follow-ups" \|\| action === "show-dated-follow-ups"[\s\S]*recordsCalendarMode/);
  assert.doesNotMatch(actions, /action === "go-follow-up-today"|action === "shift-follow-up-days"|action === "set-record-calendar-mode"/);
  assert.match(actions, /action === "open-follow-up-list-filters"[\s\S]*action === "set-follow-up-list-filter"[\s\S]*action === "remove-follow-up-list-filter"[\s\S]*action === "reset-follow-up-list-filters"/);
  assert.match(actions, /action === "save-schedule"[\s\S]*scheduleDraftEndTime[\s\S]*scheduleDraftBusinessLines[\s\S]*结束时间需晚于开始时间[\s\S]*createdWorkbenchSchedules\.push/);
  assert.match(actions, /action === "record-schedule-communication"[\s\S]*recordingScheduleId = target\.dataset\.scheduleId[\s\S]*action === "save-manual-formal"[\s\S]*scheduleOverrides\[state\.recordingScheduleId\][\s\S]*linkedRecordSubject: generatedSubject/);
  assert.match(records, /schedule-swipe-row[\s\S]*cancel-schedule[\s\S]*删除/);
  assert.match(records, /function scheduleDetailLayer[\s\S]*status\.key === "recorded"[\s\S]*查看沟通记录[\s\S]*: `<button[^`]*record-schedule-communication[^`]*记录本次沟通[\s\S]*secondary-button[^`]*edit-schedule[\s\S]*编辑日程/);
  assert.doesNotMatch(records, /确认未发生|mark-schedule-not-happened/);
  assert.match(actions, /action === "edit-schedule"[\s\S]*scheduleEditingId[\s\S]*action === "cancel-schedule"[\s\S]*canceledScheduleIds/);
  assert.match(app, /pointerdown[\s\S]*schedule-swipe-content[\s\S]*pointermove[\s\S]*translateX[\s\S]*pointerup/);
  assert.match(actions, /action === "set-follow-up-date"[\s\S]*followUpSelectedDate = target\.dataset\.date[\s\S]*recordsCalendarMode = "day"/);
  assert.match(actions, /action === "open-customer-draft"[\s\S]*navigate\("customer-form"\)[\s\S]*action === "continue-communication-draft"[\s\S]*navigate\("manual-record"\)/);
  assert.match(css, /\.follow-up-week-days[^}]*grid-template-columns: repeat\(7/);
  assert.doesNotMatch(css, /\.records-view-tabs|\.records-date-nav|\.records-period-summary/);
});

test("manual record customer change uses a searchable picker", () => {
  const manual = app.slice(app.indexOf("function recordCustomerPickerLayer"), app.indexOf("function draftExitDialog"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(manual, /更换客户[\s\S]*recordCustomerSearch[\s\S]*搜索客户、联系人或手机号/);
  assert.match(manual, /data-record-customer-option[\s\S]*contact[\s\S]*mobile/);
  assert.match(manual, /<small>\$\{escapeHtml\(customer\.contact\)\}<\/small>/);
  assert.doesNotMatch(manual, /<small>[^<]*customer\.mobile/);
  assert.doesNotMatch(manual, /class="customer-picker"/);
  assert.match(actions, /action === "change-customer"[\s\S]*recordCustomerSearch = ""[\s\S]*focus\(\)/);
  assert.match(actions, /action === "close-record-customer-picker"[\s\S]*action === "choose-record-customer"/);
  assert.match(app, /event\.target\.id === "recordCustomerSearch"[\s\S]*data-record-customer-option[\s\S]*data-record-customer-empty/);
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
  assert.match(form, /从名片或材料识别客户信息/);
  assert.match(form, /prefill-customer-from-material/);
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
  assert.match(actions, /action === "save-customer"[\s\S]*customerFormMode === "create"[\s\S]*customerBusinessRelations\.map\(\(item\) => item\.line === savedRelation\.line[\s\S]*customerSelectedBusinessLines = state\.customerBusinessRelations\.map/);
  assert.doesNotMatch(readme, /新增客户 → 查重 → 客户表单/);
});

test("customer detail scopes stage, owners, contacts, and records by business line", () => {
  const detail = app.slice(app.indexOf("function customerDetailScreen"), app.indexOf("function manualRecordScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(detail, /customerSelectedBusinessLines[\s\S]*customer-relation-row[\s\S]*toggle-customer-relation-filter/);
  assert.match(detail, /业务关系/);
  assert.match(detail, /open-customer-relation-detail/);
  for (const section of ["概览", "沟通记录", "联系人", "详细信息", "日程安排", "最近沟通"]) {
    assert.match(detail, new RegExp(section));
  }
  assert.match(detail, /所属行业[\s\S]*客户来源[\s\S]*主地址[\s\S]*企业性质[\s\S]*信用代码/);
  assert.match(detail, /recordBusinessLines\(row\)\.some\(\(line\) => selectedLines\.includes\(line\)\)/);
  assert.match(detail, /请选择业务线查看相关内容[\s\S]*不影响客户公共资料/);
  assert.match(detail, /relation-stage-flow[\s\S]*负责人[\s\S]*联系人[\s\S]*最近沟通[\s\S]*下次日程/);
  assert.match(detail, /relationLatestRecord[\s\S]*getFormalRecords\(\)\.find[\s\S]*relationSchedule[\s\S]*PROTOTYPE_TODAY/);
  assert.doesNotMatch(detail, /业务线视图|业务线状态|查看完整资料|企业资料与地址/);
  assert.match(actions, /toggle-customer-relation-filter[\s\S]*open-customer-relation-detail[\s\S]*start-line-record[\s\S]*add-customer-business-line/);
});

test("dedupe covers the enterprise dataset without exposing restricted customer data", () => {
  const dedupe = app.slice(app.indexOf("function dedupeScreen"), app.indexOf("function customerFormScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(dedupe, /dedupeStage === "restricted"/);
  assert.match(dedupe, /客户主体与\$\{selectedLine\}业务线查重/);
  assert.match(dedupe, /lineExists[\s\S]*业务线已存在[\s\S]*业务线尚未建立/);
  assert.match(dedupe, /远航国际商旅\*\*\*\*[\s\S]*无权限/);
  assert.match(dedupe, /客户名称重复/);
  assert.match(dedupe, /你输入的客户名[\s\S]*state\.customerName[\s\S]*匹配到已有客户[\s\S]*系统匹配客户/);
  assert.doesNotMatch(dedupe, /强命中|客户详情、联系人、地址和负责人已隐藏/);
  assert.match(dedupe, /data-action="request-restricted-access"/);
  assert.match(actions, /远航国际商旅有限公司[\s\S]*dedupeStage = "restricted"/);
  assert.match(actions, /action === "request-restricted-access"[\s\S]*dedupeAccessRequested = true/);
  assert.match(actions, /open-existing-business-line[\s\S]*add-existing-customer-line/);
});

test("communication forms capture the complete relevant field set", () => {
  const form = app.slice(app.indexOf("function manualRecordScreen"), app.indexOf("function recordsScreen"));
  const aiBridge = app.slice(app.indexOf("function hydrateManualFromAiDraft"), app.indexOf("function manualRecordScreen"));
  const renderers = app.slice(app.indexOf("function renderPhone"), app.indexOf("function syncAssistantDialog"));
  const actions = app.slice(app.indexOf("function captureManualForm"));
  assert.match(form, /name="manualBusinessLine"[\s\S]*id="manualChannel"[\s\S]*id="manualTime"[\s\S]*id="manualEndTime"/);
  assert.match(form, /data-manual-topic-field="subject"[\s\S]*沟通要点[\s\S]*沟通结果/);
  assert.match(form, /我方参与人[\s\S]*客户参与人[\s\S]*id="manualSubject"/);
  assert.match(form, /communication-topic-section/);
  assert.match(form, /涉及业务线[\s\S]*可多选/);
  assert.match(form, /导入录音、纪要或文件[\s\S]*AI 整理后仍回到这套标准字段确认/);
  assert.match(form, /communicationEntryMode === "ai"[\s\S]*AI 已完成预填/);
  assert.doesNotMatch(form, /mobile-segmented/);
  assert.doesNotMatch(form, /toggle-manual-next-action/);
  assert.doesNotMatch(form, /<details|manualDuration|manualRemark|manualConclusion|结论 \/ 后续推进/);
  assert.match(actions, /manualEndTime[\s\S]*manualBusinessLines[\s\S]*manualTopics/);
  assert.match(actions, /errors\.businessLine = "请至少选择一条涉及业务线/);
  assert.match(actions, /recordSnapshot = \{ customer: state\.customerName, time: state\.manualTime, endTime: state\.manualEndTime[\s\S]*businessLines:[\s\S]*topics/);
  assert.match(aiBridge, /hydrateManualFromAiDraft[\s\S]*manualBusinessLines = \[line\][\s\S]*manualTopics[\s\S]*function aiManualReviewScreen[\s\S]*return manualRecordScreen\(\)/);
  assert.match(renderers, /"ai-review": aiManualReviewScreen/);
  assert.doesNotMatch(renderers, /"ai-review": aiReviewScreen/);
  assert.match(actions, /action === "open-ready-draft"[\s\S]*aiManualHydrated = false[\s\S]*navigate\("ai-review"\)/);
  assert.match(actions, /communicationEntryMode === "ai"[\s\S]*aiDraftStatus = "confirmed"/);
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
  assert.match(actions, /action === "select-customer"[\s\S]*customerSelectedBusinessLines = state\.customerBusinessRelations\.map/);
  assert.match(actions, /action === "open-record-customer"[\s\S]*customerSelectedBusinessLines = state\.customerBusinessRelations\.map/);
  assert.match(actions, /action === "select-record"[\s\S]*recordSnapshot[\s\S]*navigate\("record-detail"\)/);
  assert.match(actions, /action === "save-manual-formal"[\s\S]*createdRecord = [\s\S]*businessLines[\s\S]*topics[\s\S]*recordVersion = 1/);
  assert.match(actions, /action === "save-manual-formal"[\s\S]*communicationEntryMode === "ai"[\s\S]*aiDraftStatus = "confirmed"/);
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

test("customer drafts and archives live in the customer module", () => {
  const customers = app.slice(app.indexOf("function customersScreen"), app.indexOf("function dedupeScreen"));
  const governance = app.slice(app.indexOf("function governanceScreen"), app.indexOf("function profileScreen"));
  const profile = app.slice(app.indexOf("function profileScreen"), app.indexOf("function renderPhone"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(customers, /已保存[\s\S]*草稿[\s\S]*已归档/);
  assert.match(governance, /customerModuleScope[\s\S]*已归档客户[\s\S]*恢复后可继续编辑/);
  assert.match(governance, /查看归档详情[\s\S]*只读/);
  assert.match(governance, /data-action="restore-and-edit"[\s\S]*恢复并编辑客户[\s\S]*恢复并补充记录/);
  assert.match(actions, /action === "set-customer-list-tab"[\s\S]*customerListTab = target\.dataset\.tab/);
  assert.match(actions, /action === "open-customer-archive"[\s\S]*governanceScope = "customer-module"/);
  assert.doesNotMatch(profile, /我的归档|open-my-archive/);
  assert.doesNotMatch(actions, /action === "open-my-archive"/);
  assert.match(actions, /action === "restore-and-edit"[\s\S]*navigate\("customer-form"\)[\s\S]*navigate\("version-diff"\)/);
});
