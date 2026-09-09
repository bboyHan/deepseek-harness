---
description: "从工作区 file resource 打开的 PDF、DOCX 与 XLSX 文件的右侧栏渲染式 viewer，支持有上限的浏览器读取与按格式预览。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-office-preview

[English](README.md) | 中文

## 概述

右侧栏可以预览 PDF、DOCX 与 XLSX 文件，而不是把它们当作原始文本打开。当 Web profile 已经提供右侧栏、file resource 与 workspace-files Remote 时，使用这个浏览器插件。PDF 使用浏览器文档 viewer，并提供打开与下载 fallback；DOCX 转换为经过净化的 HTML，XLSX 转换为有上限的工作表表格。浏览器会在配置的字节上限内组装完整文件，并显示当前 preview 实际读取的文件大小。

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

在已经包含右侧栏与 workspace file Remote 的 Web 组合中挂载这个 client plugin。

### 何时选择

需要在 Web UI 中快速检查生成的 PDF、Word 与 Excel 文件时选择本包。对于 PDF、DOCX 与 XLSX 之外的格式，以及超过浏览器限制的文件，继续保留通用产物 viewer、text preview 或外部应用作为 fallback。

### 最小配置

把浏览器插件挂载为一条 client row：

```yaml
- insert:
    - id: ui-sidebar-office-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-office-preview'
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `maxOfficeBytes` | `2097152` | 浏览器在预览解析或显示前组装的最大 Office 文件大小。 |
| `maxSpreadsheetRows` | `5000` | 每个工作表保留的最大行数。 |
| `maxSpreadsheetColumns` | `100` | 每个工作表保留的最大列数。 |
| `maxSpreadsheetSheets` | `20` | 每个工作簿保留的最大工作表数量。 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-sidebar-office-preview)是每个受支持字段的穷尽式真源。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

本包为 workspace file 地址注册三个 extension-band tab definition，并注册三个 keyed Sidebar body。一个共享 Store 保存每个 tab 的状态，一个 injected face 负责 byte-window 读取、文件版本重启、解析分发、限制、字节大小 metadata、取消与 Blob URL 清理。

PDF 字节会生成 `application/pdf` Blob URL，由浏览器文档 viewer 与打开/下载操作使用。DOCX 字节先经过 Mammoth 与 DOMPurify，再保存净化后的 HTML。XLSX 字节经过 SheetJS，先按行、列与工作表数量投影，再由 React 渲染表格。每种解析结果都会保留当前 preview 实际使用的完整字节数。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client plugin 组装：definition、locale、Store、face 与 body registration |
| [`src/client/definitions.ts`](src/client/definitions.ts) | PDF、DOCX 与 XLSX 地址 pattern 及 tab 标题 |
| [`src/client/face.ts`](src/client/face.ts) | 完整字节读取、版本重启、解析分发、限制、取消与 Blob URL 所有权 |
| [`src/client/docx-parser.ts`](src/client/docx-parser.ts) | DOCX 转换与 HTML 净化 |
| [`src/client/xlsx-parser.ts`](src/client/xlsx-parser.ts) | XLSX 校验与有上限的工作表投影 |
| [`src/client/*.tsx`](src/client/DocxPreview.tsx) | PDF、DOCX 与 XLSX viewer body |
| [`tests/`](tests/) | Registration、resource routing、解析、Store、读取 lifecycle 与 component 行为 |
| — | 不发布运行时不变式伴生入口；本包只有一个 Store 与一个 injected face，没有需要比较的分叉观察。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [右侧栏子系统](../../../docs/subsystems/sidebar-right.zh.md)——tab routing、extension priority 与 keyed body。
- [Workspace file API](../../api/workspace-files/README.zh.md)——有上限的 byte window 与文件版本 metadata。
- [渲染式产物 viewer](../ui-sidebar-artifact-preview/README.zh.md)——Markdown、JSON、CSV/TSV 与栅格图片预览。
- [产物 viewer bundle](../../bundle/artifact-viewers/README.zh.md)——可安装的 Web profile viewer family layer。
- [客户端包映射](../README.zh.md)——浏览器包的归属与组合。
- [Preview hardening Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-preview-hardening.zh.md)——文件大小来源与 PDF fallback。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包是纯浏览器 viewer，不注册 tool、prompt section 或 Session event。

#### KV Cache 影响

没有直接影响；右侧栏显示的内容不会进入模型请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制定义当前 Office preview 的行为。

- **三种格式**——本包声明 PDF、DOCX 与 XLSX；旧式 `.doc`、`.xls` 与 `.pptx` 仍由其他 viewer 或外部应用处理。
- **浏览器组装**——浏览器会在解析或显示前保留完整 Office 文件，并在达到 `maxOfficeBytes` 时停止。
- **DOCX fidelity**——DOCX 会转换为净化后的 HTML，因此不会复现精确分页、字体、域与嵌入式应用行为。
- **XLSX preview 范围**——XLSX 只保留有上限的显示值；公式、图表、工作簿编辑、排序与筛选不是交互式功能。
- **PDF 浏览器支持**——嵌入式 PDF 渲染依赖浏览器内置的文档 viewer；打开 Blob 新窗口或下载文件仍可作为 fallback。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
