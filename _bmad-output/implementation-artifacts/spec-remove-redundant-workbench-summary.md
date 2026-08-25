---
title: '删除工作台重复状态摘要'
type: 'refactor'
created: '2026-08-25'
status: 'done'
route: 'one-shot'
---

# 删除工作台重复状态摘要

## Intent

**Problem:** “今日状态摘要”与下方待处理卡片重复表达相同系统状态，增加一层没有独立价值的展开操作。

**Approach:** 删除摘要入口、数量卡片及关联状态和样式，让待处理列表直接承载待确认草稿、查重和处理失败等状态。

## Suggested Review Order

- 工作台直接从问候进入待处理列表，减少重复层级。
  [`app.js:286`](../../crm-review-prototype/app.js#L286)

- 右侧评审说明同步为“状态融合到待处理列表”。
  [`app.js:11`](../../crm-review-prototype/app.js#L11)

- 回归测试锁定摘要彻底移除及三个核心状态入口。
  [`prototype.test.mjs:25`](../../crm-review-prototype/prototype.test.mjs#L25)

- 原主规格同步记录用户重新确认后的工作台结构。
  [`spec-crm-mobile-review-prototype.md:56`](spec-crm-mobile-review-prototype.md#L56)
