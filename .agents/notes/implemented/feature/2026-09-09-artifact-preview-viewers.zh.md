# Agent Note: Artifact preview viewers

Status: implemented

[English](2026-09-09-artifact-preview-viewers.md) | 中文

## Problem

Web client 可以通过右侧栏 `file` resource 地址打开工作区文件，plain-text fallback 可以读取任何受支持的文本文件。Markdown report、JSON data、CSV/TSV table 与 image 这类生成产物，需要比原始文本或外部编辑器更快的检查路径。独立 artifact registry 会在第一个有用 preview 交付前要求新的 lifecycle、discovery、persistence 与模型可见归属。

## Decision

第一期 artifact-preview 是一个纯浏览器 client plugin：`@deepseek-ai/dsh-client-ui-sidebar-artifact-preview`。它在 `extension` priority band 注册四个右侧栏 tab definition：Markdown 对应 `*.md` 与 `*.markdown`，image 对应 PNG、JPEG、GIF、WebP、BMP 与 AVIF，JSON 对应 `*.json`，CSV/TSV 对应 `*.csv` 与 `*.tsv`。现有 `@deepseek-ai/dsh-client-ui-sidebar-textpreview` fallback 继续处理未知扩展名与不支持的格式。

该插件通过现有 workspace-files Remote namespace 读取内容。Markdown、JSON 与 CSV/TSV 只用 `workspaceFiles.read(..., { offset: 1 })` 读取第一个文本页；当该页不是 EOF 时，UI 会显示截断提示。Image viewer 用 `workspaceFiles.readBytes(..., { offset })` 读取 byte window，执行浏览器侧 `maxImageBytes` 限制，在后续 window 报告不同文件版本时重新开始读取，并在 reload 或 tab dispose 时撤销自己持有的 Blob URL。SVG 在本阶段不被声明，因此仍由 text fallback 处理。

默认 `dsh-web-app` bundle 插入 viewer row，因此默认 Web profile 具备渲染式 preview。单独的 `@deepseek-ai/dsh-artifact-viewers` bundle 为自定义 Web profile 插入同一个 row id，让它们不用复制 patch entry 就能使用该功能。该 bundle 不安装到默认 Web profile，因为那里已经有这条 row。

该功能不添加模型可见输入、持久化 session event 或 artifact registry。open resource address 仍是内容身份，`file` resource provider 仍是 metadata owner。

## Alternatives considered

**先构建 artifact registry。** 第一阶段拒绝此方案，因为现有 file resource address 已经能标识右侧栏可打开的文件。registry 对 grouping、lifecycle、thumbnail 与 produced-artifact discovery 有价值，但会让 preview rendering 先受新的 persistence 与 ownership 规则阻塞。

**把 render mode 加进 text preview package。** 拒绝此方案，因为 raw text paging 与 rendered preview 的读取策略、UI control 和状态不同。把 rendered viewer 放在独立包里可以让 fallback 保持简单，也让自定义 profile 能作为一层安装或移除这些 viewer。

**把 SVG 当作图片声明。** 拒绝此方案，因为 SVG 可携带 active content 与 XML-specific 行为。让 SVG 继续走 text fallback，可以避免第一阶段引入 image sandbox policy。

**为 Markdown、JSON 与 CSV/TSV 添加 load-more 行为。** 拒绝此方案，因为第一阶段优化的是快速检查，并避免跨多个文本页混合 parser state。截断提示会明确说明这一点，text fallback 仍可用于完整顺序分页。

## Consequences

- 默认 Web profile 可以对通过现有 file resource 地址打开的常见生成产物显示渲染式 preview。
- 自定义 Web profile 可以通过 `@deepseek-ai/dsh-artifact-viewers` 安装同一 viewer；没有 Web client 的 profile 不能单独使用该 bundle。
- 该功能只做浏览器 presentation，不改变模型请求、prompt prefix 或 Session log format。
- 大图片会在已配置的浏览器限制处停止，文本类格式只显示第一个 Host page。
- 后续可以添加 artifact registry，而无需迁移这一阶段的 tab state，因为 viewer 已经接受普通 file resource address。
