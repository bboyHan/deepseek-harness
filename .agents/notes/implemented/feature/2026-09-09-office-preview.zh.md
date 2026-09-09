# Agent Note: Office preview viewer

Status: implemented

[English](2026-09-09-office-preview.md) | 中文

## 问题

第一期 artifact viewer 已经覆盖 Markdown、JSON、CSV/TSV、栅格图片、patch 与经过净化的 SVG，但常见 Office 文件仍会回落到原始文本或外部应用。PDF、DOCX 与 XLSX 需要按格式检查，同时不能为第一期引入新的 artifact registry 或改变 Session data。

## 决策

Web client 使用一个 `@deepseek-ai/dsh-client-ui-sidebar-office-preview` 插件处理 PDF、DOCX 与 XLSX。该插件在三种格式之间共享文件身份、byte-window 读取、版本重启、取消、限制、Store 状态、本地化失败处理与右侧栏 registration。解析器依赖保留在本包中，不会加载进通用产物 viewer。

PDF 字节会生成浏览器 PDF Blob URL。DOCX 字节由 Mammoth 转换，再由 DOMPurify 净化后渲染。XLSX 字节由 SheetJS 解析，并按已配置的工作表、行与列限制投影。浏览器在 `maxOfficeBytes` 处停止组装文件；对于未声明的格式或被 preview 限制拒绝的文件，仍保留现有 text 或外部应用 fallback。

默认 Web bundle 与可安装的 `dsh-artifact-viewers` bundle 都会挂载 Office plugin row。可安装 bundle 继续作为用户侧的一层渲染式产物 viewer，而运行时包仍按解析器与安全策略分离。

该功能不添加模型可见输入、持久化 Session event、Host service 或 artifact registry。现有 `file` resource 地址仍是内容身份，workspace-files Remote 仍是读取 owner。

## 考虑过的替代方案

**把 Office 合并进通用 artifact viewer。** 拒绝，因为 Mammoth 与 SheetJS 是格式专用且更大的依赖，并且有不同的内存与失败行为。独立包可以让通用 Markdown、JSON、CSV/TSV 与图片路径更小，也让 profile 能独立替换 Office。

**每种 Office 格式拆成一个包。** 本阶段拒绝，因为三种格式共享同一个右侧栏 lifecycle、byte reader、限制、Store 与 profile 安装路径。拆分会重复 registration 与 resource ownership，但没有独立 consumer。

**在 Host 侧解析 Office 文件。** 拒绝，因为第一期已经向浏览器提供有上限的 byte window，浏览器侧解析不需要新增 Host service、wire method 与 persistence contract。

## 后果

- 默认 Web profile 可以对 PDF、DOCX 与 XLSX 文件提供按格式的 preview。
- 自定义 Web profile 可以通过一个 bundle 安装完整的渲染式 viewer family。
- 只有挂载 Office client package 时才会加载解析器依赖。
- 大文件与不支持的 Office 格式保留明确的 fallback 路径。
- 后续格式 viewer 可以加入 bundle，而不改变现有 Session log 或 artifact identity。
