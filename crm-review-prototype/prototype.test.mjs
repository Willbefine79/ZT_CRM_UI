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
  assert.match(customers, /当前业务线[\s\S]*按该业务线的合作关系筛选/);
  assert.match(customers, /filterRows\(customerRows, 5, state\.customerRelationFilter\)/);
  assert.match(records, /按沟通渠道筛选/);
  assert.match(records, /filterRows\(visibleRows, 2, state\.recordChannelFilter\)/);
  assert.match(profile, /所属企业/);
  assert.match(app, /set-customer-filter[\s\S]*set-record-filter/);
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
  assert.match(form, /createMode \? "" : `<details class="form-section"><summary>客观资料与工商信息/);
  assert.match(form, /统一社会信用代码（选填）/);
  assert.match(form, /仅用于精确识别同名企业/);
  assert.doesNotMatch(readme, /新增客户 → 查重 → 客户表单/);
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
