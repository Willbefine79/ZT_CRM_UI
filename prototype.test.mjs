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
  assert.match(app, /summaryOpen: false/);
  assert.match(app, /AI 不会自动写入正式沟通记录/);
  assert.match(app, /确认正式记录/);
  assert.match(app, /版本冲突未解决，不能确认新版本/);
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(css, /button:disabled/);
  assert.match(css, /\.switch input:focus-visible \+ span/);
});
