import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("./", import.meta.url);
const [html, css, app] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("styles.css", root), "utf8"),
  readFile(new URL("app.js", root), "utf8")
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
  assert.match(app, /待确认草稿、待处理查重和处理失败直接融合在待处理列表/);
  assert.match(workbench, /<h3>待处理<\/h3>/);
  assert.match(workbench, /电话记录待确认[\s\S]*data-screen="dedupe"[\s\S]*会议纪要处理失败/);
  assert.match(workbench, /data-screen="ai-review"[\s\S]*data-screen="ai-processing"/);
  assert.match(app, /AI 不会自动写入正式沟通记录/);
  assert.match(app, /确认正式记录/);
  assert.match(app, /版本冲突未解决，不能确认新版本/);
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(css, /button:disabled/);
  assert.match(css, /\.switch input:focus-visible \+ span/);
});
