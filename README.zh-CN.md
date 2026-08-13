<div align="center">

# 📝 dsh-plannotator

### *让 Coding Agent 动手写代码前，先把计划审清楚。*

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek_Harness-Web-4D6BFE)](https://github.com/deepseek-ai)
[![Plan Review](https://img.shields.io/badge/workflow-Plan_Review-4D6BFE)](#核心功能)
[![MIT License](https://img.shields.io/badge/license-MIT-4D6BFE)](LICENSE)

<br>

<table align="center">
<tr>
<td align="left">
① 计划看起来没问题，但其中一句可能藏着迁移风险？<br>
② 你发现了几个相互独立的问题，却只能选择批准或拒绝？<br>
③ 你希望每条意见都牢牢挂在 Agent 必须修改的准确原文上？
</td>
</tr>
</table>

### ✨ 把二选一的计划审批，变成精准的多意见审阅。

直接选中计划原文、逐条精准批注，再把一份结构化审阅送回 Agent——整个过程都在 DeepSeek Harness 里完成。

[为什么需要它](#为什么需要-dsh-plannotator) · [核心功能](#核心功能) · [安装](#安装) · [使用流程](#使用流程)

[English](README.md) · **简体中文**

![梁小鲸正在审阅精准批注计划的 DSH Plannotator 横幅](docs/social-preview.png)

</div>

---

![与 DeepSeek Harness 对话区并排的计划审阅栏](docs/01-sidebar-open-zh.png)

> “第三步改一下”很模糊。把意见直接挂在准确原句上，Agent 才能保留上下文，
> 正确修改计划。

**选中原文 → 批注多个风险 → 一次发送审阅 → 满意后再批准。**

---

<a id="为什么需要-dsh-plannotator"></a>

## 🎯 为什么需要 dsh-plannotator

Coding Agent 很会写计划，但严肃的软件工程任务很少能靠一个简单的
**批准 / 拒绝**决定完成审阅。架构迁移、API 变更、安全修复和灰度发布，
往往需要在实现前同时修正多个相互独立的问题。

`dsh-plannotator` 把 DSH 原生 Plan Review 变成一条紧凑入口和一个响应式
审阅面板。宽屏上，对话区和审阅区分别占据独立列，打开审阅不会遮住聊天文字。
审阅栏可以缩成右缘蓝色入口，随时再打开而不提交当前请求。所有意见仍通过
DSH 已有响应流程，以结构化 Markdown 送回 Agent；Agent 留在 Plan mode 修改
方案，然后再次请你审阅。

这是一个受 [Plannotator](https://github.com/backnotprop/plannotator) 启发的
非官方集成。

---

<a id="核心功能"></a>

## 🧰 核心功能

### 评论准确的论点，而不是“计划里的某个地方”

拖选文字即可精准批注；也可以双击段落、列表项、标题、加粗短语或代码片段，
快速选中整个内容块。在当前计划版本内，引用原文与修改意见始终成对保留。

![在并排审阅栏中为安全要求添加精准批注](docs/02-precise-annotation-zh.png)

### 一轮审完整份计划

可以同时收集兼容性、安全、回滚和测试等多处意见，再补充整体反馈；
在右侧审阅栏点击批注即可回到对应原文，最后一次发送完整审阅。这会让审阅
更集中，也比几条彼此脱节的聊天消息更不容丢失上下文。

![一次审阅中的三条原文批注与整体意见](docs/03-multi-comment-sidebar-zh.png)

### 收起审阅栏，也不会丢掉当前进度

完整审阅栏可以缩成右缘蓝色入口，同时输入区保留一条紧凑提示。点击任意入口
即可继续刚才的批注和整体意见。

![审阅栏收起后，右缘入口与输入区提示仍然可用](docs/04-collapsed-rail-zh.png)

### 把可执行的反馈真正送回 Agent

点击 **发送反馈** 会回答真实的 `exit_plan_mode` 交互。DSH 会把引用的计划原文、
每一条修改要求和整体意见记录在 tool result 与 Session Log 中。Agent 会继续留在
Plan mode，并可以立刻给出修订版方案。

### 保护尚未完成的审阅

未发送的意见会保存在当前浏览器本地，并按 Session、待处理请求和计划版本隔离。
如果还有意见没有发送就点击批准，插件会要求第二次明确确认，不会悄悄丢掉你的工作。

![存在未发送批注时，批准计划需要二次确认](docs/05-safe-approval-zh.png)

| 能力 | 你得到什么 |
| --- | --- |
| 精准批注 | 文字拖选，以及稳定的“双击内容块”后备方式 |
| 多意见审阅 | 原文锚点、来源跳转、删除与整体意见 |
| 响应式审阅栏 | 宽屏并排、中等宽度按需抽屉、手机端底部面板 |
| DSH 响应闭环 | 通过现有 pending interaction 批准、要求修改或回到聊天 |
| 草稿恢复 | 无插件服务器、无第三方服务的本地尽力恢复 |
| 审阅保护 | 拒绝过期计划草稿；丢弃未发送意见前必须明确确认 |
| 界面适配 | 中英文文案、键盘快捷键、响应式布局与 DSH 主题变量 |

---

<a id="安装"></a>

## 📦 安装

把 GitHub bundle 安装到 DSH Web profile，然后重启 `dsh web`：

```bash
dsh plugin --profile web add github:titanwings/dsh-plannotator#v0.1.2
```

仓库已随附构建完成的 Host 与 Web bundle，因此安装时不会运行包构建脚本，
也不需要添加 `allowBuilds`。如果需要锁定到准确源码版本，可以用已经审阅的
commit SHA 替换 release tag。

<details>
<summary>从本地 checkout 安装</summary>

需要 Node.js 22.19+：

```bash
pnpm install
pnpm check

cd /path/to/deepseek-harness
pnpm dsh plugin --profile web add /path/to/dsh-plannotator
```

修改已安装的 Client 插件集合后，请重启 `dsh web`。

</details>

---

<a id="使用流程"></a>

## 🔄 使用流程

1. 在 DSH Plan mode 中让 Coding Agent 生成一份计划。
2. `exit_plan_mode` 进入 Plan Review 后，DSH 会显示紧凑入口。宽屏会在对话区
   右侧并排打开审阅栏；较窄屏幕默认保持收起，点击 **打开审阅栏** 后再显示。
3. 选中需要修改的准确原文；随时可以收起和重新打开审阅栏，不会提交审阅。
4. 添加多条针对性意见，并按需填写整体反馈。
5. 点击 **发送反馈**。Agent 会收到一份结构化审阅，并留在 Plan mode。
6. 审阅修订版，确认可以实施后再点击 **批准计划**。

**继续讨论**会关闭当前 gate，回到普通输入框。卸载插件后，DSH 原生 Plan Review
会自动恢复。

### 适合真实的 Coding 计划

上面的截图使用一个贴近生产场景的认证迁移示例，不是占位文案。只要一个计划在首次
修改代码前需要同时确认多个细节，这套工作流就很有用：

| 计划类型 | 很适合批注的内容 |
| --- | --- |
| 数据库或认证迁移 | 兼容窗口、幂等迁移、回滚阈值、零停机顺序 |
| 公共 API 重构 | 契约保持、废弃路径、版本策略、移动端或 SDK 兼容 |
| 安全变更 | 信任边界、CSRF 与 secret 处理、审计证据、失败语义 |
| 部署与灰度 | Feature flag 阶段、可观测停止条件、负责人、回滚演练 |
| 测试策略 | 遗漏的失败场景、并发、重启恢复、回归与验收标准 |

---

## 🧩 兼容性与边界

- 面向 DeepSeek Harness **Web** 客户端，需要 Node.js 22.19+。
- 只接管合法、单问题的 DSH `plan-review` 交互；其他问题会自动交还内置渲染器。
- 它审阅 Markdown 计划，不是通用文档编辑器、Git diff viewer、PR 发布器、
  文件树，也不是完整的 Plannotator 独立 SPA。
- 草稿保存在当前浏览器 local storage，不会云同步；计划版本变化时会主动拒绝旧草稿。
- 1480px 及以上会在 DSH 右侧预留 440–560px 的 companion column，审阅栏和
  对话区不会重叠；较窄桌面使用按需抽屉，手机端使用紧凑底部面板。
- 该面板由插件自身提供，不是 DSH core 的 `details` 面板。插件只在稳定的 Web
  `#root` 挂载边界旁预留空间，让 AppFrame 正常重排，不向 core details grid
  注册内容，也不改写它的列定义。
- 不使用自定义 Host route、第三方服务或遥测；反馈走 DSH 现有响应通道。

<details>
<summary>它如何遵循 DSH 的 Cordis 架构</summary>

这个 bundle 只插入一条 Cordis Loader row。Host 入口有意保持 no-op；
`package.json#dsh.client` 暴露 Web bundle。Client 注册自己的 locale namespace，
并在优先级 `-10` 注册一条 `conversation.composer` chain entry，只选择 Plan
Review 请求，排在默认问题渲染器之前。这个 contribution 负责渲染紧凑入口，
并通过 React portal 挂载插件自有的审阅面板。宽屏会在稳定的 Web root 旁预留
同等宽度，较窄布局则复用同一个面板作为按需抽屉或底部面板。

它没有 DSH core patch、平行 Agent loop、重复的持久化层或自建 scheduler。
卸载 Cordis row 后，slot contribution 会被移除，内置界面自然重新出现。

</details>

---

## 🛠️ 开发

```bash
pnpm typecheck
pnpm test
pnpm build
```

浏览器 bundle 遵循 DSH 的 `window.__ModuleLoader__` contract，并把 React、
ReactDOM 与 DSH UI primitives 当作平台模块，确保页面里只有一份 React runtime。
