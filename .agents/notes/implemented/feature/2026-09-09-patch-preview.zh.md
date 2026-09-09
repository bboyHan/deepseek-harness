# Agent Note: Patch preview

Status: implemented

[English](2026-09-09-patch-preview.md) | 中文

## Problem

右侧栏可以打开工作区 patch 文件，但用户需要先看变更文件与变更行时，原始文本扫描速度较慢。第一期 preview 需要提供有用的 diff rendering，同时不建立第二套 artifact discovery 或 persistence 系统。

## Decision

patch viewer 是一个独立的纯浏览器 client plugin：`@deepseek-ai/dsh-client-ui-sidebar-patch-preview`，处理 `.diff`、`.patch` 与 `.udiff` file resource 地址。它复用现有 `file` resource metadata、`workspaceFiles.read` 与 `DiffBlock` primitive。它拥有一个 tab store 与一个 injected read face，不注册 Host service、artifact registry、Session event、tool 或 prompt section，并把 `maxHunks` 作为显式校验配置。

parser 接受 Git 与普通 unified diff header，按源文件顺序保留 file hunk，统计新增与删除行，并把非空非法文本作为可见失败报告。第一期只把变更行交给 `DiffBlock`，不保留 context 行。text fallback 仍是查看完整上下文的路径。

viewer 只读取第一页 Host 文本。它分别报告未到 EOF 的页面与 hunk limit 停止，在 reload 时废弃旧读取，并在 tab signal abort 时忘记 tab 状态。默认 Web profile 与可安装的 artifact-viewers bundle 都会插入这个 plugin row。

## Alternatives considered

**合并到 artifact preview plugin。** 拒绝此方案，因为 patch 路由、解析、失败处理与状态都独立于渲染式 Markdown、JSON、CSV/TSV、image 及未来 Office viewer。独立包可以让 profile 安装或替换一个能力，而不 runtime import 另一个 feature plugin 的值。

**把 patch parser 加到 text preview。** 拒绝此方案，因为 text preview 负责顺序行分页与换行，而 diff viewer 负责 hunk 上限、变更统计与紧凑 diff 呈现。

**先构建 artifact registry。** 拒绝此方案，因为现有 `file` resource 地址已经能标识用户可以打开的文件。后续可以为 grouping 与 produced-artifact discovery 添加 registry，而不让 viewer 依赖它。

**在 `DiffBlock` 中保留所有 context 行。** 第一阶段拒绝此方案，因为共享 primitive 渲染变更两侧且没有 context-row 输入。明确显示限制可以保持紧凑 viewer 的事实准确，完整上下文交给 text preview。

## Consequences

- 常见 patch 文件会在默认 Web profile 中打开为紧凑的变更行视图。
- 自定义 Web profile 可以通过 artifact-viewers bundle 添加同一 row。
- 非法 patch 文本会明确失败，不会静默改变 viewer 类型。
- 大型或多页 patch 受 Host page limit 与 `maxHunks` 限制；完整上下文仍可通过 text preview 查看。
- 后续可以独立添加 artifact discovery，因为本插件使用普通 file resource 地址，不增加新的持久化格式。
