---
description: "dsh Web 客户端右侧 Sidebar 的 unified diff 与 patch viewer：有界读取、变更统计、重新读取，以及通过 text fallback 查看完整上下文。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-patch-preview

[English](README.md) | 中文

## 概述

右侧栏可以把 `.diff`、`.patch` 与 `.udiff` 文件渲染成变更行，并显示文件数、hunk 数、新增行数与删除行数。viewer 通过现有 `file` resource 和 workspace-files Remote 读取，因此不添加 artifact registry、模型可见输入或 Session event。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在已经挂载右侧栏、`file` resource provider 与 workspace-files Remote namespace 的 Web profile 中使用本包。

### 最小配置

向 profile 添加一条 client row：

```yaml
- insert:
    - id: ui-sidebar-patch-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-patch-preview'
```

默认 [`dsh-web-app`](../../bundle/web-app/README.zh.md) 已包含这条 row。[`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.zh.md) bundle 为自定义 Web profile 添加同一条 row。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxHunks` | `500` | 从第一页文本中保留的 unified diff hunk 数量上限。 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-sidebar-patch-preview)是受支持字段的穷尽式真源。

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本包注册一个 `extension` tab definition，匹配 `*.diff`、`*.patch` 与 `*.udiff`，并注册一个 keyed `sidebar.right.pane.tab` body。tab 地址仍是内容身份，标准 `file` resource 提供绝对路径与变更提示。

body 用 `workspaceFiles.read(..., { offset: 1 })` 读取第一页文本。parser 识别 Git 与普通 unified diff header，把变更行分组为文件 hunk，并在 body 使用共享的 `DiffBlock` primitive 前应用 `maxHunks`。读取结果、reload generation 与滚动位置保存在同一个 tab store 中。

当第一页不是 EOF 时，viewer 显示截断提示；当 `maxHunks` 停止解析时，viewer 显示单独提示。非法 patch 文本不会静默按普通文本处理；完整上下文和不支持的语法仍通过现有 text preview 查看。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client 注册、locale、store 与 body 组装 |
| [`src/client/definitions.ts`](src/client/definitions.ts) | extension pattern、地址接受与 tab 标题 |
| [`src/client/patch.ts`](src/client/patch.ts) | unified diff 解析与行统计 |
| [`src/client/face.ts`](src/client/face.ts) | 有界读取归属、reload generation 与 tab 清理 |
| [`src/client/PatchPreview.tsx`](src/client/PatchPreview.tsx) | Sidebar body 与用户可见状态 |
| [`tests/`](tests/) | parser、store、face、component、注册与 bundle 行为 |
| — | 不发布运行时不变式伴生入口，因为 viewer 没有可比较的独立运行时观察。 |

</details>

<a id="further-exploration"></a>
## 进一步探索

- [Right Sidebar 子系统](../../../docs/subsystems/sidebar-right.zh.md)——tab 路由、资源与 body slot。
- [Workspace file API](../../api/workspace-files/README.zh.md)——文件 metadata 与有界文本读取。
- [Artifact preview viewers](../ui-sidebar-artifact-preview/README.zh.md)——Markdown、JSON、CSV/TSV 与图片 viewer。
- [Document preview](../ui-sidebar-documentpreview/README.zh.md)——完整顺序文本分页与 fallback 行为。
- [Patch preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-patch-preview.zh.md)——归属与范围决定。

<a id="model-experience"></a>
## 模型体验

无，因为本包是纯浏览器 viewer，不注册 tool、prompt section 或 Session event。

#### KV Cache 影响

没有直接影响；用户读取的 patch 文本不会进入模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **只读取第一页**——viewer 读取一页 Host 文本。大型 patch 应使用 text preview 查看完整内容。
- **只显示变更行**——第一期不把 unified diff context 行交给 `DiffBlock`；文件数与 hunk 数仍然可见。
- **hunk 有上限**——`maxHunks` 限制 parser 工作量与显示规模；达到上限时 UI 会报告结果已截断。
- **语法范围**——支持 Git 与普通 unified diff header。Binary patch、combined diff 与格式错误的文本会明确失败。
- **不能编辑 patch**——viewer 只读，不应用、保存或导出 patch。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
