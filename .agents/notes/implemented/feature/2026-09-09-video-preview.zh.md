# Agent Note: video preview viewer

Status: implemented

[English](2026-09-09-video-preview.md) | 中文

## Problem

渲染式产物 preview 需要在不把大源文件全部缓存在浏览器中的情况下检查视频。普通文件下载不提供原生视频播放需要的 HTTP Range 与 metadata 行为，而浏览器支持某种 container 也不代表一定能解码其中的 codec。

## Decision

Web client 提供独立的 `@deepseek-ai/dsh-client-ui-sidebar-video-preview` Host 与 Client 插件。Client 声明主流视频扩展名，并渲染一个使用 metadata preload、浏览器控件与明确下载、新窗口、系统应用操作的原生 `<video>`。Host 拥有 `/api/sidebar-video-preview/file`，通过 `sessionController` 解析目标 Session，把请求路径限制在该 Session 的 workspace 内，并提供认证的单段 Range 响应。

Host 接受 `.mp4`、`.m4v`、`.webm`、`.ogv`、`.ogg`、`.mov`、`.mkv`、`.avi`、`.wmv`、`.flv` 与 `.3gp`。它验证 `maxVideoBytes` 与 `maxRangeBytes`，返回 `HEAD` metadata，对一个有效 Range 返回 `206`，对格式错误、多段、无法满足或超过上限的 Range 返回 `416`，并对没有 Range 的 GET 使用有界 `readByteRange` window 流式返回。

浏览器保存路由 URL 与原生 media metadata，不保存完整 Blob。Media event 更新时长与分辨率。Media error 会变成可见的 unsupported、decode、network 或 aborted 状态，同时保留 fallback 操作。Reload 会修改 URL revision，tab 清理会删除 store state。

默认 Web bundle 与可安装的 `@deepseek-ai/dsh-artifact-viewers` bundle 都包含该插件 row。本包与图片 preview 分开，因为视频播放依赖 Range 交付、原生 media lifecycle 与 decoder failure 处理。

## Alternatives considered

**把完整视频读成 Blob URL。** 拒绝，因为 seek 与长视频播放需要把整个源文件保留在浏览器内存中。

**扩展共享的 `/api/file` 路由。** 拒绝，因为该路由已有任意绝对路径媒体引用语义与共享 attachment 上限；视频需要基于 Session 的 workspace containment，以及独立的源文件与 Range 限制。

**对所有不支持的视频使用 ffmpeg 转码。** 拒绝，因为它增加 process 依赖、CPU 与磁盘成本、启动与取消 lifecycle，以及新的输出所有权问题。Viewer 报告 decoder 限制，并保留下载与系统应用 fallback。

**构建自定义 MSE、HLS 或 WebCodecs 播放。** 拒绝，因为第一期产品能力是原生文件检查；在浏览器原生行为尚未耗尽前，自定义 streaming protocol 会增加更大的状态机。

## Consequences

- Web 用户可以 seek 与播放支持的本地视频文件，不必把完整源文件加载为 Blob。
- 路由执行 Session workspace containment，并在解析最终 target 前拒绝符号链接。
- Range 行为明确且可测试，因此浏览器 seek 请求会收到符合标准形态的响应。
- 浏览器无法解码的已识别 container 会明确失败，并保留可用 fallback 操作。
- 插件不编辑视频、不转码、不增加 model-visible data，也不改变 Session format。
- 默认 512 MiB 源文件上限与 4 MiB Range 上限属于 deployment config，产品部署可以调节资源使用而不改路由代码。

## Verification

视频 focused test set 通过 17 个测试，另有一个 Windows-only symlink 测试按平台策略跳过。Host 与 Client package typecheck 通过。未安装 Playwright Chromium 时，完整 browser replay lane 仍受环境限制。
