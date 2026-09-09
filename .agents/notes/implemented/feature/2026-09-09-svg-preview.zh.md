# Agent Note: SVG preview viewer

Status: implemented

[English](2026-09-09-svg-preview.md) | 中文

## Problem

渲染式产物 preview 需要一条安全处理 SVG 与其他 vector 输出的路径。把 SVG 当作普通 image 处理，会让 XML 特有的主动内容与外部引用在没有明确策略的情况下进入浏览器 image loader。

## Decision

Web client 提供独立的 `@deepseek-ai/dsh-client-ui-sidebar-svg-preview` 右侧栏插件。它只在 `extension` priority band 声明 `.svg` file resource 地址，并继续保留现有 text preview，以便查看源码与处理不支持的内容。

该插件通过 `workspaceFiles.readBytes` 读取完整 document，执行默认 2 MiB、可配置的 `maxSvgBytes` 限制；当 byte window 报告不同文件版本时从 offset `0` 重新读取；当 UTF-8 无效或字节流不再前进时明确失败。它会在净化前解析 XML，根据 `externalResourcePolicy` 移除 script、嵌入 document、事件属性、style 与不符合策略的引用，并把每类移除显示给 viewer。DOMPurify 净化剩余 SVG，浏览器只把结果放入 `image/svg+xml` Blob URL，再交给 `<img>` 元素显示。默认策略是 `strip`；显式配置 `allow` 时保留 HTTP(S) 引用。

Injected face 为每个 tab 持有一个 Blob URL，在 reload 与 tab abort 时撤销，并通过每个 tab 的 generation counter 让旧 read 失效。Store 只保存净化后的 document URL、version、byte size、failure 与 scroll position，不保存 SVG 源码，也不添加 session event。

默认 Web bundle 与可安装的 `@deepseek-ai/dsh-artifact-viewers` bundle 都包含 SVG plugin row。SVG viewer 与普通 image viewer 分开，因为它需要更严格的安全策略与不同的验证失败。

## Alternatives considered

**把 SVG 当作普通 image。** 拒绝，因为浏览器 image loader 无法表达产品的 XML-specific 拒绝策略，普通 image 路径也不应静默接受主动内容或外部内容。

**把净化后的 SVG 当作 HTML 渲染。** 拒绝，因为把 SVG markup 插入 document 会扩大注入面；产品改用 image Blob URL 显示净化结果。

**让 SVG 继续使用 text fallback。** 对渲染式 preview 拒绝，因为 diagram 与生成的 vector asset 是高价值检查产物。fallback 仍用于查看原始源码与结构校验失败的 document。

## Consequences

- Web 用户可以在右侧栏检查普通 SVG 图表与图标，不必打开外部编辑器。
- 无效 SVG 结构会明确失败；主动内容与不允许的外部引用会被移除并显示 notice，而不会隐藏无关的 vector 内容。
- 完整 SVG 字节会在验证与创建 Blob 前保留在浏览器中，因此可配置大小限制仍然重要。
- 该功能保持纯浏览器实现，不改变 model request、持久化 session data 或 Session format。
- 未来 vector viewer 只有在使用相同地址路由、安全策略与 lifecycle 时才适合共享本包；否则应继续拆分为独立 viewer。
