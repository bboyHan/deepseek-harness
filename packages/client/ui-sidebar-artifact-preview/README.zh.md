---
description: "dsh Web 客户端的右侧栏渲染式产物预览：从 file resource 地址打开 Markdown、JSON、CSV/TSV 与常见图片格式。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-artifact-preview

[English](README.md) | 中文

## 概述

右侧栏可以渲染常见产物文件，而不是只显示原始文本。通过 `file` resource 地址打开的 Markdown、JSON、CSV/TSV、PNG、JPEG、GIF、WebP、BMP 与 AVIF 文件会获得自己的 viewer tab。默认 Web profile 已包含本包；自定义 Web profile 可以直接挂载它，或安装 `dsh-artifact-viewers` bundle。它只通过现有 workspace-files Remote 读取内容，不创建 artifact registry，也不添加模型可见输入。

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

当 Web profile 已经包含右侧栏、`file` resource provider 与 workspace-files Remote namespace 时，使用本包。

### 何时选择

当需要在浏览器侧检查生成或编辑出的常见格式产物时选择它。当 profile 没有 Web client、没有右侧栏，或产品希望全部文件都以原始文本打开时，请不要挂载它。未知扩展名与不支持的格式仍由 fallback text preview 负责。

### 最小配置

把浏览器插件挂载为一条 client row：

```yaml
- insert:
    - id: ui-sidebar-artifact-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview'
```

默认 [`dsh-web-app`](../../bundle/web-app/README.zh.md) bundle 已包含这条 row。已经挂载 Web 表层的自定义 Web profile，可以安装 [`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.zh.md)，而不用手写 patch。

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxImageBytes` | `8388608` | 浏览器会组装成 Blob URL 的最大图片大小。 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-sidebar-artifact-preview)是每个受支持字段的穷尽式真源。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本包在 `extension` priority band 贡献四个右侧栏 tab definition，并在 `sidebar.right.pane.tab` 下贡献四个 keyed body。每个 tab 以自己的地址作为内容身份，因此不同 session 或目录下的同名文件会作为不同内容打开。标准 `file` resource 提供 metadata 与 change notice；本包通过 `remote.workspaceFiles` 自行读取内容。

Markdown、JSON 与 CSV/TSV viewer 调用 `workspaceFiles.read(sessionId, path, { offset: 1 })`，并且只保留第一个文本页。Markdown 通过 `MarkdownText` 渲染；JSON 的 object 与 array root 通过 `JsonTree` 渲染，scalar root 以格式化文本渲染；CSV/TSV 使用包内 quoted-field parser，并限制显示列数。非 EOF 的第一页会留在屏幕上并显示截断提示，而不会继续分页。

Image viewer 调用 `workspaceFiles.readBytes(sessionId, path, { offset })`，直到 EOF、达到已配置的浏览器字节限制，或遇到失败。如果后续 byte window 报告了不同文件版本，viewer 会从 offset `0` 重新开始，因此一个图片 Blob 不会混合两个版本的字节。Blob URL 由 injected face 持有，并在 reload 或 tab record 的 abort signal 触发时撤销。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client plugin assembly：tab definition、dictionary、store 与 body registration |
| [`src/client/definitions.ts`](src/client/definitions.ts) | 扩展名 pattern、标题提取与 file-address 接受规则 |
| [`src/client/face.ts`](src/client/face.ts) | 异步读取 owner、generation retirement、图片限制与 Blob URL 清理 |
| [`src/client/store.ts`](src/client/store.ts) | 按 tab 保存的预览状态与视图位置 |
| [`src/client/*.tsx`](src/client/MarkdownPreview.tsx) | Markdown、JSON、CSV/TSV 与图片 viewer body |
| [`tests/`](tests/) | Registration、routing、parsing、store、face 与组件行为 |
| — | 不发布运行时不变式伴生入口；本包只拥有一个 Slot store 与一个 injected read face，没有可比较的独立观察。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Web Client subsystem](../../../docs/subsystems/web-client.zh.md)——浏览器插件分层与模块加载。
- [Slots subsystem](../../../docs/subsystems/slots.zh.md)——keyed body registration 与 store props。
- [右侧栏文档预览](../ui-sidebar-documentpreview/README.zh.md)——fallback file viewer 与分页行为。
- [Workspace file API](../../api/workspace-files/README.zh.md)——metadata、文本页与 byte window。
- [产物预览 viewer note](../../../.agents/notes/implemented/feature/2026-09-09-artifact-preview-viewers.zh.md)——为什么第一期停留在现有 file resource 上。

-----

<a id="model-experience"></a>
## 模型体验

无，因为 preview 是纯浏览器 viewer，不注册 tool、prompt section 或 session event。

#### KV Cache 影响

没有直接影响；用户在这里阅读的内容不会进入模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制定义第一期 preview，以及仍会回落到原始文本的条件。

- **没有 artifact registry**——文件通过现有 `dsh-resource://file/…` 地址发现和打开；没有独立的 produced-artifact index、manifest 或 lifecycle。
- **只读取第一个文本页**——Markdown、JSON 与 CSV/TSV viewer 不继续分页、不搜索，也不对原始文本做语法高亮。
- **不声明 SVG**——SVG 仍交给 text fallback，因此 XML 与主动内容处理不会进入第一期 image viewer。
- **图片在浏览器中组装**——当报告大小或累计字节超过 `maxImageBytes` 时，超大图片会失败。
- **CSV/TSV 是 preview parser**——支持 quoted field 与换行，但 delimiter detection、type inference、sorting、filtering 与 pinned header 不属于本包。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
