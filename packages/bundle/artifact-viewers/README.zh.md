---
description: "Web profile bundle layer，为 Markdown、JSON、CSV/TSV、图片、Office 文件、patch 与 SVG 添加右侧栏渲染式产物 viewer。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-artifact-viewers

[English](README.md) | 中文

## 概述

`dsh-artifact-viewers` 为自定义 Web profile 添加右侧栏渲染式文件 preview。Markdown、JSON、CSV/TSV、常见图片文件、PDF、DOCX、XLSX、unified diff 文件与经过净化的 SVG 会用理解格式的 viewer 打开，未知扩展名继续使用 text fallback。默认 `dsh-web-app` bundle 已经包含相同的 viewer row，因此只有在组合自定义 Web 表层时才安装这一层。该层插入四条浏览器插件 row，不添加模型可见行为。

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

### 安装到 profile

只把这一层安装到已经挂载 Web client、右侧栏、`file` resource provider 与 workspace-files Remote namespace 的自定义 profile：

```text
dsh plugin --profile <name> add @deepseek-ai/dsh-artifact-viewers
dsh plugin --profile <name> remove @deepseek-ai/dsh-artifact-viewers
```

内置 bundle 从 dsh 安装中解析。profile reconcile 期间，`dsh.bundle.patch` 会把 launcher 指向本包的 `cordis.patch.yml`；如果该声明缺失，本包不会被当作可安装 profile layer。不要把本包添加到默认 `web` profile，因为 `dsh-web-app` 已经插入相同的 viewer row id。

### 你会获得什么

patch 插入四条 client plugin row：

```yaml
- insert:
    - id: ui-sidebar-artifact-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview'
    - id: ui-sidebar-office-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-office-preview'
    - id: ui-sidebar-patch-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-patch-preview'
    - id: ui-sidebar-svg-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-svg-preview'
```

这些 row 贡献用于 Markdown、JSON、CSV/TSV、常见浏览器图片格式、PDF、DOCX、XLSX、unified diff 文件与经过净化 SVG 的右侧栏 preview tab type。格式行为与限制由对应的 client package README 负责。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节 - 点击展开</summary>

该 bundle 是一个静态 patch document，包含一个 `insert` list。每条 row id 都与默认 Web bundle 使用的 id 相同，因此同时应用两层的 profile 会定位同一批 row，而不是挂载重复 viewer。Loader row 顺序不定义激活顺序；每个 client plugin 会等待右侧栏 tab registry、slot registry、locale service 与 workspace-files Remote namespace。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | 可安装 profile patch，插入渲染式 viewer row |
| [`src/index.ts`](src/index.ts) | 包入口；不承载运行时 API |
| [`tests/artifact-viewers.spec.ts`](tests/artifact-viewers.spec.ts) | Manifest 声明、patch 解析与插入 row 的依赖检查 |
| - | 不发布运行时不变式伴生入口；bundle 是静态 patch-list carrier，不拥有可检查的可变关系。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [组合包包映射](../README.zh.md) - 可安装 profile layer。
- [dsh-web-app](../web-app/README.zh.md) - 已经包含 viewer 的默认 Web bundle。
- [Artifact preview client plugin](../../client/ui-sidebar-artifact-preview/README.zh.md) - 渲染式 viewer 行为。
- [app-boot profile section](../../boot/app-boot/README.zh.md) - profile bundle 如何解析与分层。

-----

<a id="model-experience"></a>
## 模型体验

无，因为 bundle 插入的是纯浏览器 viewer row，不注册 tool、prompt section 或 session event。

#### KV Cache 影响

该 bundle 不向模型请求前缀添加任何内容。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

这些限制说明 bundle 何时有用，以及被插入的 viewer 不覆盖什么。

- **需要 Web profile 前置条件** - 这一层不插入 Web runtime、右侧栏、resource provider 或 workspace-files Remote namespace。
- **默认 Web 已内置同一批 row** - 默认 `web` profile 已通过 `dsh-web-app` 包含相同 viewer row id；在那里安装本 bundle 没有必要。
- **Viewer 限制属于插件** - 文件格式、图片大小限制、SVG 净化、patch 语法与 first-page text 行为由被插入的 client plugin 文档说明。
- **Patch override 语义适用** - 后续 profile patch 重写或禁用 `ui-sidebar-artifact-preview` 时，会控制 viewer 是否继续挂载。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文 - 点击展开</summary>

无。

</details>
