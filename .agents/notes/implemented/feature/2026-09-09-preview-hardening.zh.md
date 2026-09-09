# Agent Note: Preview hardening for external SVG resources and Office metadata

Status: implemented

[English](2026-09-09-preview-hardening.md) | 中文

## Problem

包含一个外部引用的 SVG 不应让整个有用图表都无法查看。文件 resource metadata 也可能在 preview 读取新版本时仍描述旧版本，导致显示的大小不准确。嵌入式 PDF viewer 在浏览器无法在 Sidebar 中渲染时，也需要明确的恢复路径。

## Decision

SVG preview 会根据配置的外部资源策略移除主动内容与不符合策略的引用，然后渲染剩余 document，并为移除内容与保留的网络资源显示本地化 warning。默认 `externalResourcePolicy` 为 `allow`；需要离线或确定性渲染的部署可以使用 `strip` 移除 HTTP(S) 引用。渲染仍通过净化后的 `image/svg+xml` Blob URL 赋给 image element，与页面 DOM 隔离。

SVG face 记录当前渲染 document 使用的完整字节数。Office face 记录 PDF、DOCX 与 XLSX 输出使用的完整字节数。Preview header 优先显示当前渲染版本的字节数，只有 reader 没有报告时才回退到 file resource metadata。

PDF viewer 保留浏览器内嵌 document viewer，并使用由 viewer 持有的 Blob URL 增加“在新窗口打开”和“下载”操作。即使嵌入式 PDF 渲染不可用，这些操作仍然可用。

Patch 与 Artifact 的文本 reader 会把 Remote Promise reject 转换为可重试的 tab failure；Patch parser 会在解释路径与变更行之前移除 CRLF 输入中的回车符。没有 source、failure 或进行中读取时，PDF 会显示统一的空文件状态。

## Alternatives considered

**存在一个外部引用时让整个 SVG 失败。** 不采用，因为一个链接或链接图片不应隐藏无关的 vector 内容；viewer 可以移除不安全或不可用部分并说明结果。

**默认允许 SVG 外部资源。** 采用，因为视觉预览完整性是产品的主要结果；viewer 会限制协议、移除主动内容，并在可能发起浏览器网络请求时显示 warning。

**只使用 resource metadata 作为文件大小来源。** 不采用，因为文件替换发生在读取期间时 metadata 可能滞后；当前 preview 实际渲染使用的字节才是显示大小的权威来源。

**只依赖浏览器内嵌 PDF viewer。** 不采用，因为浏览器与嵌入上下文的支持可能不同；打开或下载由 viewer 持有的 Blob 可以提供可靠 fallback。

## Consequences

- 普通 SVG 默认保留 HTTP(S) 链接资源；需要离线或确定性渲染的部署可以设置 `externalResourcePolicy: strip`。
- 用户可以看到 SVG 资源何时被移除，以及浏览器何时可能请求保留的外部资源。
- 用户可以看到 SVG 内容被移除的提示，并看到渲染文件版本的大小。
- PDF、DOCX 与 XLSX preview 显示实际读取的字节大小，PDF 用户还有两个明确的 fallback 操作。
- Patch 与 Artifact reader 会显式收敛传输异常；Windows 生成的 CRLF Patch 会保持干净的路径与变更行文本。
- 没有可渲染 source 的 PDF 会显示明确的空状态，而不是空白 body。
- 本次 hardening 不改变 model-visible input、持久化 Session event 或 artifact identity。
- 外部资源不会被代理或重写；需要离线或确定性渲染的部署应设置 `strip` 策略。
