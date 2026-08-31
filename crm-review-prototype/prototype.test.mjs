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
  const workbench = app.slice(app.indexOf("function workbenchScreen"), app.indexOf("function customersScreen"));
  assert.doesNotMatch(app, /今日状态摘要|summaryOpen|toggle-summary/);
  assert.match(workbench, /<h3>需要我确认<\/h3>/);
  assert.match(workbench, /data-action="open-ready-draft"[\s\S]*沟通草稿待确认/);
  assert.match(workbench, /data-action="open-dedupe-candidate"[\s\S]*客户名称存在近似候选/);
  assert.match(workbench, /workbench-disclosure[\s\S]*会议纪要整理失败/);
  assert.match(app, /AI 不会自动写入正式沟通记录/);
  assert.match(app, /确认正式记录/);
  assert.match(app, /补充记录是销售主动补录，不是 AI 差异建议/);
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
  assert.match(customers, /选择业务线[\s\S]*按所选业务线的合作关系筛选/);
  assert.match(customers, /filterRows\(customerRows, 4, state\.customerBusinessLineFilter\)[\s\S]*filterRows\(lineRows, 5, state\.customerRelationFilter\)/);
  assert.match(records, /按沟通渠道筛选/);
  assert.match(records, /filterRows\(visibleRows, 2, state\.recordChannelFilter\)/);
  assert.match(profile, /所属企业/);
  assert.match(app, /set-customer-line-filter[\s\S]*set-customer-filter[\s\S]*set-record-filter/);
  assert.deepEqual(filterRows([["潜在"], ["已成交"]], 0, "潜在"), [["潜在"]]);
  assert.deepEqual(filterRows([["电话"], ["拜访"]], 0, "全部"), [["电话"], ["拜访"]]);
});

test("every workbench pending item includes a time", () => {
  const workbench = app.slice(app.indexOf("function workbenchScreen"), app.indexOf("function customersScreen"));
  assert.match(workbench, /沟通草稿待确认[\s\S]*8 月 25 日 09:31/);
  assert.match(workbench, /客户名称存在近似候选[\s\S]*8 月 25 日 09:09/);
  assert.match(workbench, /会议纪要整理失败[\s\S]*8 月 25 日 08:40/);
  assert.match(workbench, /客户资料待补充[\s\S]*8 月 24 日 16:20/);
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
  assert.match(form, /业务线信息[\s\S]*id="customerBusinessLine"[\s\S]*id="customerRelation"/);
  assert.match(form, /联系人[\s\S]*id="customerContactMobile"[\s\S]*id="customerContactWechat"[\s\S]*id="customerContactEmail"/);
  assert.match(form, /企业规模与来源[\s\S]*工商信息[\s\S]*公开联系[\s\S]*主地址[\s\S]*客户跟进负责人[\s\S]*客户备注/);
  assert.match(form, /销售管理员配置[\s\S]*客户拓展[\s\S]*id="customerFrontendSales"[\s\S]*方案与合同[\s\S]*id="customerBackendSales"[\s\S]*待分配/);
  assert.doesNotMatch(form, /id="(?:customer)?RoleName"/);
  assert.match(form, /统一社会信用代码/);
  assert.match(form, /仅用于精确识别同名企业/);
  assert.match(app, /function captureCustomerForm[\s\S]*customerContactMobile[\s\S]*customerBusinessLine/);
  assert.doesNotMatch(readme, /新增客户 → 查重 → 客户表单/);
});

test("customer detail supports different follow-up owner join times", () => {
  const detail = app.slice(app.indexOf("function customerDetailScreen"), app.indexOf("function manualRecordScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(detail, /业务线与客户跟进负责人[\s\S]*客户拓展 · 前端销售 · 建档时加入/);
  assert.match(detail, /方案与合同 · 后端销售[\s\S]*data-action="assign-backend-sales"/);
  assert.match(actions, /action === "assign-backend-sales"[\s\S]*customerBackendSales = "李程"/);
});

test("dedupe covers the enterprise dataset without exposing restricted customer data", () => {
  const dedupe = app.slice(app.indexOf("function dedupeScreen"), app.indexOf("function customerFormScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(dedupe, /dedupeStage === "restricted"/);
  assert.match(dedupe, /所属企业全量查重/);
  assert.match(dedupe, /远航国际商旅\*\*\*\*[\s\S]*无权限/);
  assert.match(dedupe, /客户详情、联系人、地址和负责人已隐藏/);
  assert.match(dedupe, /data-action="request-restricted-access"/);
  assert.match(actions, /远航国际商旅有限公司[\s\S]*dedupeStage = "restricted"/);
  assert.match(actions, /action === "request-restricted-access"[\s\S]*dedupeAccessRequested = true/);
});

test("communication forms capture the complete relevant field set", () => {
  const form = app.slice(app.indexOf("function manualRecordScreen"), app.indexOf("function recordsScreen"));
  const actions = app.slice(app.indexOf("function captureManualForm"));
  assert.match(form, /id="manualBusinessLine"[\s\S]*id="manualTime"[\s\S]*id="manualChannel"/);
  assert.match(form, /id="manualDuration"[\s\S]*id="manualLocation"[\s\S]*id="manualConclusion"[\s\S]*id="manualRemark"/);
  assert.match(actions, /manualBusinessLine[\s\S]*manualDuration[\s\S]*manualLocation[\s\S]*manualRemark/);
  assert.match(actions, /errors\.businessLine = "请选择本次沟通所属业务线/);
  assert.match(actions, /recordSnapshot = \{ customer: state\.customerName, time: state\.manualTime, channel: state\.manualChannel, businessLine: state\.manualBusinessLine, duration: state\.manualDuration, location: state\.manualLocation[\s\S]*remark: state\.manualRemark/);
});

test("supplementing a record is a manual omission-recovery flow", () => {
  const supplement = app.slice(app.indexOf("function versionDiffScreen"), app.indexOf("function governanceScreen"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(supplement, /补录遗漏信息/);
  assert.match(supplement, /补充沟通正文/);
  assert.match(supplement, /保存为版本 \$\{state\.recordVersion \+ 1\}/);
  assert.doesNotMatch(supplement, /建议值|接受建议|模拟版本冲突/);
  assert.match(actions, /action === "open-supplement"[\s\S]*supplementContent = ""[\s\S]*navigate\("version-diff"\)/);
  assert.match(actions, /action === "save-supplement"[\s\S]*recordSnapshot\.content[\s\S]*recordConclusion[\s\S]*recordVersion \+= 1[\s\S]*navigate\("record-detail"\)/);
});

test("list selections and formal saves preserve cross-screen context", () => {
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(app, /data-action="select-customer"[\s\S]*data-action="select-record"/);
  assert.match(actions, /action === "select-customer"[\s\S]*customerName = target\.dataset\.customer[\s\S]*navigate\("customer-detail"\)/);
  assert.match(actions, /action === "select-record"[\s\S]*recordSnapshot[\s\S]*navigate\("record-detail"\)/);
  assert.match(actions, /action === "save-manual-formal"[\s\S]*createdRecord = [\s\S]*recordVersion = 1/);
  assert.match(actions, /action === "confirm-ai"[\s\S]*createdRecord = [\s\S]*recordVersion = 1/);
});

test("mobile controls and text meet the revised usability floor", () => {
  assert.match(css, /\.mobile-icon-button[\s\S]*width: 44px;[\s\S]*height: 44px;/);
  assert.match(css, /\.tab-button \{[^}]*min-height: 44px/);
  assert.match(css, /\.field textarea \{[^}]*font-size: 14px/);
});

test("archived records leave and can return to the formal list", () => {
  const records = app.slice(app.indexOf("function recordsScreen"), app.indexOf("function recordRow"));
  const actions = app.slice(app.indexOf("function handleAction"));
  assert.match(records, /state\.archivedRecord[\s\S]*filter/);
  assert.match(actions, /confirm-deactivate-record[\s\S]*state\.archivedRecord =/);
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
