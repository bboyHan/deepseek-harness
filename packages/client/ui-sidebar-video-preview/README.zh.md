---
description: "基于 Range 的工作区 file resource 右侧栏视频 viewer，使用浏览器原生播放，并提供明确的下载与外部应用 fallback。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-video-preview

[English](README.md) | 中文

## 概述

右侧栏可以使用浏览器原生能力预览工作区视频文件。当 Web profile 已经提供 Connection、Session Controller、filesystem、sandbox policy、右侧栏、file resource 与 client Session service 时，使用这个 Client 与 Host 插件。Host 提供会话工作区内的 HTTP Range 响应；浏览器延迟读取元数据，并提供播放、seek、下载、新窗口与系统应用操作。浏览器不支持当前编码时会显示明确失败与 fallback 操作，而不是留下空白播放器。

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

在已经包含 Connection、Session Controller、filesystem、sandbox policy、右侧栏、file resource 与 client Session service 的 Web profile 中挂载本包。

### 何时选择

需要快速播放与检查生成的视频文件时选择本包。未知扩展名继续使用 text 或通用 file fallback。对于浏览器无法解码的 container 或 codec，继续使用下载与系统应用操作。

### 最小配置

把插件挂载为一条 row：

```yaml
- insert:
    - id: ui-sidebar-video-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-video-preview'
```

| 字段 | 默认值 | 含义 |
|---|---:|---|
| `maxVideoBytes` | `536870912` | Host 提供服务的最大源视频大小。 |
| `maxRangeBytes` | `4194304` | 单个 HTTP Range 响应与完整响应流单次读取的最大字节数。 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-client-ui-sidebar-video-preview)是每个受支持字段的穷尽式来源。

### 支持的扩展名

viewer 声明 `.mp4`、`.m4v`、`.webm`、`.ogv`、`.ogg`、`.mov`、`.mkv`、`.avi`、`.wmv`、`.flv` 与 `.3gp`。前六种使用常见浏览器 MIME 声明。其余 container 也会被识别，因此浏览器缺少 decoder 时仍能显示同一个 viewer，并提供明确 fallback。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 - 点击展开</summary>

Host 路由为 `/api/sidebar-video-preview/file?sessionId=<id>&path=<workspace-path>`。Connection 在路由运行前完成认证。路由解析 Session Agent，取得其 policy workspace root，拒绝符号链接与工作区外路径，检查普通文件类型与配置的源文件上限，然后通过 `ctx.fs.readByteRange` 只读取请求的字节窗口。

`HEAD` 返回完整大小、MIME type 与 `Accept-Ranges: bytes`。有效的单段 Range 返回带 `Content-Range` 的 `206 Partial Content`。格式错误、多段、无法满足或超过上限的 Range 返回 `416`。没有 Range 的 GET 会使用有界窗口流式返回完整文件。响应使用 `private, no-store` 与 `nosniff`。

浏览器 body 使用 `<video controls preload="metadata" playsInline>`。它只保存路由 URL、reload revision、metadata 与 failure state。原生 media event 提供时长与分辨率。浏览器错误会映射为明确的 unsupported、decode、network 或 aborted 状态。下载、新窗口与系统默认应用操作始终保留。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | Host 配置与会话工作区内的 HTTP Range 路由 |
| [`src/config.ts`](src/config.ts) | 共享的验证限制 |
| [`src/client/index.ts`](src/client/index.ts) | Client registration、locale、Store、face 与 body 组装 |
| [`src/client/definitions.ts`](src/client/definitions.ts) | 视频扩展名、地址接受与 tab 标题 |
| [`src/client/face.ts`](src/client/face.ts) | URL revision、tab 清理与系统应用分发 |
| [`src/client/VideoPreview.tsx`](src/client/VideoPreview.tsx) | 浏览器原生视频 body 与 media error 映射 |
| [`tests/`](tests/) | Range 路由、registration、lifecycle、state 与 component 行为 |
| — | 不发布运行时不变式伴生入口；本包没有可与路由和 viewer registration 比较的独立可变观察。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [右侧栏子系统](../../../docs/subsystems/sidebar-right.zh.md)——tab routing、resource address 与 body slot。
- [Workspace file API](../../api/workspace-files/README.zh.md)——工作区 containment 与文件 metadata。
- [Session Controller](../../api/session-controller/README.zh.md)——Session identity 解析与原生路径打开。
- [产物 viewer bundle](../../bundle/artifact-viewers/README.zh.md)——可安装的 Web profile layer。
- [客户端包映射](../README.zh.md)——浏览器包的归属与组合。
- [视频 preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-video-preview.zh.md)——Range 交付与浏览器 fallback 决策。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包注册浏览器 viewer 与认证文件路由，但不注册 tool、prompt section 或 Session event。

#### KV Cache 影响

没有直接影响；视频字节与播放 metadata 保留在 Web UI 中，不进入 model request。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明 viewer 当前的播放与交付行为。

- **Codec 支持**——浏览器支持取决于已安装浏览器的 decoder。识别 `.mkv`、`.avi`、`.wmv`、`.flv` 或 `.3gp` 不代表一定可以直接播放。
- **不做转码**——插件不调用 ffmpeg，不转码文件，也不生成备用 stream。
- **单段 Range 响应**——Host 每次请求接受一个字节范围，多段请求以 `416` 拒绝。
- **源文件大小限制**——超过 `maxVideoBytes` 的文件会在读取内容前被拒绝。
- **不做自定义 streaming protocol**——HLS、DASH、MSE 与 WebCodecs 不属于本 viewer。
- **只读 viewer**——UI 不编辑、裁剪、批注或导出视频。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文 - 点击展开</summary>

无。

</details>
