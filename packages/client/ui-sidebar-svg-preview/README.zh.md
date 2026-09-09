---
description: "通过 file resource 地址打开 SVG 的安全净化右侧栏 viewer，支持有界字节读取、安全 Blob URL、重新读取，以及通过 text fallback 查看完整源码。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-svg-preview

[English](README.md) | 中文

## 概述

右侧栏可以渲染通过 `file` resource 地址打开的 SVG 文件。viewer 通过 workspace-files Remote 读取完整文件，拒绝无效 UTF-8，移除危险内容，默认保留安全的 HTTP(S) 资源，并把结果作为 image 显示；发生移除或网络加载时会显示 notice。默认 Web profile 已包含本包；自定义 Web profile 可以直接挂载本包，或使用 `dsh-artifact-viewers` bundle。需要查看原始 XML 时仍可使用 text preview。

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

### 何时选择

当用户需要检查生成的图表、图标或其他 SVG 输出，而不想打开外部编辑器时选择本包。当用户需要原始 XML 源码，或 SVG 使用本 viewer 拒绝的内容时，保留 text preview。

### 最小配置

把浏览器插件挂载为一条 client row：

```yaml
- insert:
    - id: ui-sidebar-svg-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-svg-preview'
```

默认 [`dsh-web-app`](../../bundle/web-app/README.zh.md) bundle 已包含这条 row。自定义 Web profile 可以安装 [`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.zh.md)，该 bundle 会与其他产物 viewer 一起插入这条 row。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxSvgBytes` | `2097152` | 浏览器读取、净化并组装成 Blob URL 的最大 SVG 大小。 |
| `externalResourcePolicy` | `allow` | 控制渲染后的 SVG 是否保留 HTTP(S) 引用。`allow` 保留引用并允许浏览器发起网络加载；`strip` 保持预览离线友好。 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-sidebar-svg-preview)是每个受支持字段的穷尽式真源。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本包为 `*.svg` 贡献一个 `extension` tab definition，并在 `sidebar.right.pane.tab` 下贡献一个 keyed body。地址仍是 tab content identity，标准 `file` resource 提供绝对路径与变更提示。

body 读取 byte window 直到 EOF。当后续 window 报告其他文件版本时，它会从 offset `0` 重新读取；当读取不再前进时会失败，并同时对报告大小与累计字节执行 `maxSvgBytes` 限制。face 使用 fatal UTF-8 解码，解析 XML document，根据配置移除 script、嵌入 document、事件属性、不安全 CSS 与策略之外的 reference，然后通过 DOMPurify 净化剩余 SVG，最后创建 `image/svg+xml` Blob URL。body 会报告用于渲染的完整字节数，并说明移除内容或网络加载资源。

face 持有每个 Blob URL，并在 reload 前和 tab abort 时撤销它。generation counter 防止旧 read 在 reload 后发布。component 通过 `<img>` 渲染净化后的 URL，从不把 SVG 文本作为 HTML 插入。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | Host 配置 schema 与 inert Host entry |
| [`src/client/index.ts`](src/client/index.ts) | Client 注册、locale、store 与 body 组装 |
| [`src/client/definitions.ts`](src/client/definitions.ts) | SVG pattern、地址接受与 tab 标题 |
| [`src/client/face.ts`](src/client/face.ts) | 字节读取、版本重读、净化、大小限制与 Blob URL 清理 |
| [`src/client/sanitize.ts`](src/client/sanitize.ts) | XML 检查与 DOMPurify SVG 净化 |
| [`src/client/store.ts`](src/client/store.ts) | 按 tab 保存的 document、failure 与滚动状态 |
| [`src/client/SvgPreview.tsx`](src/client/SvgPreview.tsx) | 右侧栏 body |
| [`tests/`](tests/) | routing、sanitizer、读取 lifecycle、store、component 与 registration 行为 |
| — | 不发布运行时不变式伴生入口；本包没有可与已注册 viewer state 比较的独立观察。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Web Client 子系统](../../../docs/subsystems/web-client.zh.md)——浏览器插件分层与模块加载。
- [Right Sidebar 子系统](../../../docs/subsystems/sidebar-right.zh.md)——tab 路由、resource 地址与 body slot。
- [Workspace file API](../../api/workspace-files/README.zh.md)——有界字节读取与文件 metadata。
- [Artifact preview viewers](../ui-sidebar-artifact-preview/README.zh.md)——Markdown、JSON、CSV/TSV 与常见图片 viewer。
- [Text preview](../ui-sidebar-textpreview/README.zh.md)——完整源码分页与 fallback 行为。
- [SVG preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-svg-preview.zh.md)——安全与归属决定。
- [Preview hardening Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-preview-hardening.zh.md)——外部资源策略、文件大小来源与 PDF fallback。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包是纯浏览器 viewer，不注册 tool、prompt section 或 Session event。

#### KV Cache 影响

没有直接影响；用户读取的 SVG 源码不会进入模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明 viewer 接受什么内容，以及何时应使用 text fallback。

- **只处理 SVG**——tab definition 声明 `.svg` 文件，不从其他扩展名或 MIME 声明推断 vector 内容。
- **净化后渲染**——script、嵌入 document、事件属性、不安全 CSS 与策略之外的 reference 会被移除；body 会报告移除内容与网络加载资源，源码查看仍可通过 text preview 完成。
- **浏览器组装完整文件**——viewer 把整个 document 读入内存，当报告大小或累计大小超过 `maxSvgBytes` 时失败。
- **没有源码编辑器**——viewer 只读，不修改、保存、导出或栅格化 SVG。
- **没有 artifact registry**——文件仍通过普通 `dsh-resource://file/` 地址发现。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
