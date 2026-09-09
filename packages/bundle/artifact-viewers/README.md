---
description: "A Web profile bundle layer that adds rendered right-Sidebar artifact viewers for Markdown, JSON, CSV/TSV, and images."
kind: "package-bundle"
---

# @deepseek-ai/dsh-artifact-viewers

English | [中文](README.zh.md)

## Summary

`dsh-artifact-viewers` adds rendered right-Sidebar file previews to a custom Web profile. Markdown, JSON, CSV/TSV, and common image files open with format-aware viewers while unknown extensions continue to use the text fallback. The stock `dsh-web-app` bundle already includes the same viewer row, so install this layer only when composing a custom Web surface. The layer inserts one browser plugin row and adds no model-visible behavior.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

### Install into a profile

Install this layer only into a custom profile that already mounts the Web client, right Sidebar, `file` resource provider, and workspace-files Remote namespace:

```text
dsh plugin --profile <name> add @deepseek-ai/dsh-artifact-viewers
dsh plugin --profile <name> remove @deepseek-ai/dsh-artifact-viewers
```

In-box bundles resolve from the dsh installation. During profile reconciliation, `dsh.bundle.patch` points the launcher to this package's `cordis.patch.yml`; if that declaration is absent, the package is not treated as an installable profile layer. Do not add this package to the stock `web` profile, because `dsh-web-app` already inserts the same `ui-sidebar-artifact-preview` row id.

### What you get

The patch inserts one client plugin row:

```yaml
- insert:
    - id: ui-sidebar-artifact-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview'
```

That row contributes right-Sidebar preview tab types for Markdown, JSON, CSV/TSV, and common browser image formats. The behavior is owned by [`@deepseek-ai/dsh-client-ui-sidebar-artifact-preview`](../../client/ui-sidebar-artifact-preview/README.md).

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals - click to expand</summary>

The bundle is a static patch document with one `insert` list. The row id is the same id used by the stock Web bundle, so a profile that applies both layers addresses one row rather than mounting two independent viewers. Loader row ordering does not define activation order; the client plugin waits on the right-Sidebar tab registry, slot registry, locale service, and workspace-files Remote namespace.

### Source map

| File | Role |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | The installable profile patch, inserting `ui-sidebar-artifact-preview` |
| [`src/index.ts`](src/index.ts) | Package entry; carries no runtime API |
| [`tests/artifact-viewers.spec.ts`](tests/artifact-viewers.spec.ts) | Manifest declaration, patch parsing, and inserted-row dependency checks |
| - | No runtime invariant companion is published; the bundle is a static patch-list carrier and owns no mutable relation to check. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Bundle package map](../README.md) - installable profile layers.
- [dsh-web-app](../web-app/README.md) - the stock Web bundle that already includes the viewer.
- [Artifact preview client plugin](../../client/ui-sidebar-artifact-preview/README.md) - the rendered viewer behavior.
- [app-boot profile section](../../boot/app-boot/README.md) - how profile bundles resolve and layer.

-----

<a id="model-experience"></a>
## Model Experience

None, as the bundle inserts a browser-only viewer row that registers no tool, prompt section, or session event.

#### KV Cache effect

The bundle adds nothing to a model request prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits describe when the bundle is useful and what the inserted viewer does not cover.

- **Web profile prerequisite** - this layer does not insert the Web runtime, right Sidebar, resource provider, or workspace-files Remote namespace.
- **Stock Web duplicate** - the stock `web` profile already includes the same row id through `dsh-web-app`; installing this bundle there is unnecessary.
- **Viewer limits live in the plugin** - file formats, image-size limits, SVG exclusion, and first-page text behavior are documented by the inserted client plugin.
- **Patch override semantics apply** - a later profile patch that rewrites or disables `ui-sidebar-artifact-preview` controls whether the viewer remains mounted.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers - click to expand</summary>

None.

</details>
