---
title: '在途 CRM 手机端可评审交互原型'
type: 'feature'
created: '2026-08-25'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '/Users/mikexu/Downloads/workspace-pm/bmad-method-for-PM/_bmad-output/planning-artifacts/prds/prd-商旅Saas-2026-08-25/prd.md'
  - '/Users/mikexu/Downloads/workspace-pm/bmad-method-for-PM/_bmad-output/planning-artifacts/prds/prd-商旅Saas-2026-08-25/field-contract.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 现有移动端画板只覆盖部分事实流程，且混入评分、任务和销售判断，无法作为新版 PRD 的完整评审载体；评审意见也没有逐页沉淀位置。

**Approach:** 新建一个无需构建即可打开的 HTML 原型：桌面端采用“页面目录 / 390×844 手机画布 / PRD 评审栏”三栏结构，手机画布覆盖一期核心旅程，右栏随页面切换展示评审要点并保存该页修改意见。

## Boundaries & Constraints

**Always:** 遵循 PRD v2.1 与字段契约；底部导航固定为工作台、客户、沟通记录、我的；手工流程不依赖 AI；AI 草稿必须人工确认；每页意见独立持久化；支持键盘焦点及 375、390、430px 手机宽度。

**Ask First:** 若需要改动现有 `figma-crm-generator`、向 Figma 画布写入内容、引入联网依赖或扩展到完整后台管理端，先取得用户确认。

**Never:** 不展示销售额、漏斗、评分、等级、价值、热度、风险、赢单概率、任务、提醒、截止日期、负责人或 AI 销售建议；不让草稿自动转正式；不物理删除历史；不把我方与客户方参与人混成单一字段。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| 页面评审 | 切换目录或手机内导航 | 手机界面、右侧条款和该页意见同步 | 存储不可用时保留当前输入并提示 |
| 客户新增 | 填写客户资料并保存 | 后台查重；无匹配直接进入详情，仅候选时显示提醒 | 强重复阻止新增；近似候选需填写理由 |
| 沟通录入 | 手工表单或 AI 材料 | 手工可直接正式保存；AI 逐步到人工确认 | 缺项就地提示；AI 失败可重试或转手工 |
| 归档治理 | 查看已归档对象 | 默认隐藏，治理视图可查看原因并恢复 | 历史只读，不级联删除 |

</frozen-after-approval>

## Code Map

- `figma-crm-generator/entry-example-preview.html` -- 已有视觉语言与手机尺寸参考，只读。
- `crm-review-prototype/index.html` -- 评审壳、手机画布和语义结构。
- `crm-review-prototype/styles.css` -- 冰蓝玻璃视觉、三栏布局和多视口适配。
- `crm-review-prototype/app.js` -- 页面状态、原型交互、评审内容、意见持久化与导出。
- `crm-review-prototype/README.md` -- 打开方式、交互地图与评审说明。

## Tasks & Acceptance

**Execution:**
- [x] `crm-review-prototype/index.html` -- 建立三栏评审结构与无脚本兜底。
- [x] `crm-review-prototype/styles.css` -- 实现紧凑手机界面、折叠层级和响应式评审栏。
- [x] `crm-review-prototype/app.js` -- 实现 14 个界面状态、核心旅程、逐页意见和导出。
- [x] `crm-review-prototype/README.md` -- 记录页面清单、关键路径和已覆盖 PRD 条目。

**Acceptance Criteria:**
- Given 首次打开, when 未操作, then 工作台直接显示待处理列表且不重复展示状态摘要。
- Given 切换任一界面, when 查看右栏, then 条款、验收项和独立意见同步；刷新后意见仍存在并可汇总导出。
- Given 从任一新增客户入口进入, when 填写资料并保存, then 后台自动查重；无重复直接进入详情，有候选才显示提醒。
- Given AI 客户不唯一或字段未确认, when 尝试确认, then 不创建正式记录；明确确认后才进入正式详情。
- Given 三种目标手机视口, when 操作主要表单, then 无横向溢出且底部操作可达。

## Design Notes

目录覆盖工作台、客户主流程、沟通主流程、AI 材料到人工确认、销售补充记录、归档治理和我的。瞬时状态在所属页面内交互切换，避免复制画板。

## Verification

**Commands:**
- `node --check crm-review-prototype/app.js` -- JavaScript 语法通过。
- `node --test crm-review-prototype/prototype.test.mjs` -- 3 项静态合同测试通过。
- `tidy -qe crm-review-prototype/index.html` -- 本机旧版不支持 UTF-8 / HTML5 语义标签；以浏览器解析回归替代。

**Manual checks (if no CLI):**
- 在桌面与三种手机视口完成客户、手工沟通、AI 草稿确认、归档恢复和意见保存/导出路径。

**Browser regression:**
- 手工正式记录必填、草稿保留、强重复阻断和客户名称上下文传递通过。
- AI 空材料拦截、候选选择和字段编辑保留通过；销售可从沟通详情补录遗漏信息并生成新版本。
- 销售角色治理拒绝、归档原因必填、逐页意见持久化和 375 / 430 像素视口通过。

## Suggested Review Order

**评审框架**

- 三栏入口把页面目录、手机画布和逐页意见放在同一上下文。
  [`index.html:11`](../../crm-review-prototype/index.html#L11)

- 十四个页面集中声明评审目标、PRD 对照与边界。
  [`app.js:6`](../../crm-review-prototype/app.js#L6)

**核心流程**

- 工作台将系统状态直接融合到待处理列表，避免重复摘要入口。
  [`app.js:286`](../../crm-review-prototype/app.js#L286)

- 手工沟通独立于 AI，并在正式保存前验证必要事实。
  [`app.js:394`](../../crm-review-prototype/app.js#L394)

- AI 材料、客户匹配和人工确认形成完整闭环；补充记录独立于 AI 流程。
  [`app.js:443`](../../crm-review-prototype/app.js#L443)

- 单一动作路由集中处理查重、确认、权限与治理边界。
  [`app.js:669`](../../crm-review-prototype/app.js#L669)

**评审持久化与表现**

- 逐页意见显式保存并在存储不可用时反馈。
  [`app.js:578`](../../crm-review-prototype/app.js#L578)

- 响应式三栏与固定手机尺寸支持桌面评审和移动宽度检查。
  [`styles.css:60`](../../crm-review-prototype/styles.css#L60)

**验证与使用**

- 静态合同测试锁定评审壳、页面数量与关键安全行为。
  [`prototype.test.mjs:12`](../../crm-review-prototype/prototype.test.mjs#L12)

- README 提供页面清单、走查路径和原型边界。
  [`README.md:1`](../../crm-review-prototype/README.md#L1)
