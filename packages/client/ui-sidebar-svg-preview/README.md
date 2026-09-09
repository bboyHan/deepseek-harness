---
description: "A sanitized right-Sidebar SVG viewer for file resource addresses, with bounded byte reads, safe Blob URLs, reload, and text fallback for full source."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-svg-preview

English | [中文](README.zh.md)

## Summary

The right Sidebar can render SVG files opened through `file` resource addresses. The viewer reads the complete file through the workspace-files Remote, rejects invalid UTF-8, removes unsafe content, keeps safe HTTP(S) resources by default, and displays the result as an image with notices for removed or network-loaded content. The stock Web profile includes this package; custom Web profiles can mount it directly or use the `dsh-artifact-viewers` bundle. The text preview remains available for source inspection.

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

Use this package in a Web profile that already mounts the right Sidebar, the `file` resource provider, and the workspace-files Remote namespace.

### When to choose it

Choose it when users need to inspect generated diagrams, icons, or other SVG output without opening an external editor. Keep the text preview available when users need the original XML source or when the SVG uses content this viewer rejects.

### Minimal configuration

Mount the browser plugin as one client row:

```yaml
- insert:
    - id: ui-sidebar-svg-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-svg-preview'
```

The stock [`dsh-web-app`](../../bundle/web-app/README.md) bundle includes the row. Custom Web profiles can install [`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.md), which inserts this row with the other artifact viewers.

| Field | Default | Meaning |
|---|---|---|
| `maxSvgBytes` | `2097152` | Largest SVG file the browser reads, sanitizes, and assembles into a Blob URL. |
| `externalResourcePolicy` | `allow` | Whether HTTP(S) references remain in the rendered SVG. `allow` preserves them and permits browser network loads; `strip` keeps the preview offline-friendly. |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-sidebar-svg-preview) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals - click to expand</summary>

The package contributes one `extension` tab definition for `*.svg` and one keyed body under `sidebar.right.pane.tab`. The address remains the tab content identity, while the standard `file` resource supplies the absolute path and change notice.

The body reads byte windows until EOF. It restarts from offset `0` when a later window reports another file version, rejects a stream that stops advancing, and enforces `maxSvgBytes` against both reported and accumulated bytes. The face decodes with fatal UTF-8 handling, parses the XML document, removes scripts, embedded documents, event attributes, unsafe CSS, and references outside the configured policy, then passes the remaining SVG through DOMPurify before creating an `image/svg+xml` Blob URL. The body reports the complete bytes used for rendering and explains removed content or network-loaded resources.

The face owns each Blob URL and revokes it before reload and when the tab aborts. Generation counters prevent stale reads from publishing after reload. The component renders the sanitized URL through `<img>` and never inserts SVG text as HTML.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Host configuration schema and inert Host entry |
| [`src/client/index.ts`](src/client/index.ts) | Client registration, locale, store, and body assembly |
| [`src/client/definitions.ts`](src/client/definitions.ts) | SVG pattern, address acceptance, and tab title |
| [`src/client/face.ts`](src/client/face.ts) | Byte reads, version restart, sanitization, size limits, and Blob URL cleanup |
| [`src/client/sanitize.ts`](src/client/sanitize.ts) | XML checks and DOMPurify SVG sanitization |
| [`src/client/store.ts`](src/client/store.ts) | Per-tab document, failure, and scroll state |
| [`src/client/SvgPreview.tsx`](src/client/SvgPreview.tsx) | Right-Sidebar body |
| [`tests/`](tests/) | Routing, sanitizer, read lifecycle, store, component, and registration behavior |
| - | No runtime invariant companion is published; the package has no independent observation to compare with its registered viewer state. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Web Client subsystem](../../../docs/subsystems/web-client.md) - browser plugin layering and module loading.
- [Right Sidebar subsystem](../../../docs/subsystems/sidebar-right.md) - tab routing, resource addresses, and body slots.
- [Workspace file API](../../api/workspace-files/README.md) - bounded byte reads and file metadata.
- [Artifact preview viewers](../ui-sidebar-artifact-preview/README.md) - Markdown, JSON, CSV/TSV, and common image viewers.
- [Text preview](../ui-sidebar-textpreview/README.md) - full source paging and fallback behavior.
- [SVG preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-svg-preview.md) - security and ownership decisions.
- [Preview hardening Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-preview-hardening.md) - external-resource policy, file-size authority, and PDF fallback.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package is a browser-only viewer that registers no tool, prompt section, or Session event.

#### KV Cache effect

No direct effect; the SVG source read by the user never enters a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits describe what the viewer accepts and when users should use the text fallback.

- **SVG only** - the tab definition claims `.svg` files and does not infer vector content from other extensions or MIME declarations.
- **Sanitized rendering** - scripts, embedded documents, event attributes, unsafe CSS, and references outside the configured policy are removed; the body reports those removals and network-loaded resources, and source inspection remains available through text preview.
- **Complete browser assembly** - the viewer reads the whole document into memory and fails when the reported or accumulated size exceeds `maxSvgBytes`.
- **No source editor** - the viewer is read-only and does not modify, save, export, or rasterize the SVG.
- **No artifact registry** - files are still discovered through ordinary `dsh-resource://file/` addresses.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers - click to expand</summary>

None.

</details>
