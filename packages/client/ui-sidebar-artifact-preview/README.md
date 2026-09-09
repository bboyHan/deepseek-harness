---
description: "Rendered right-Sidebar artifact previews for the dsh web client: Markdown, JSON, CSV/TSV, and common image formats opened from file resource addresses."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-artifact-preview

English | [中文](README.zh.md)

## Summary

The right Sidebar can render common artifact files instead of showing their raw text. Markdown, JSON, CSV/TSV, PNG, JPEG, GIF, WebP, BMP, and AVIF files opened through `file` resource addresses get their own viewer tab. The stock Web profile includes this package; custom Web profiles can mount it directly or install the `dsh-artifact-viewers` bundle. It reads only through the existing workspace-files Remote, and it does not create an artifact registry or add model-visible input.

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

Use this package when a Web profile already has the right Sidebar, the `file` resource provider, and the workspace-files Remote namespace.

### When to choose it

Choose it for browser-side inspection of generated or edited artifacts that fit common preview formats. Leave it out when a profile has no Web client, no right Sidebar, or a product wants all files to open as raw text. The fallback text preview remains responsible for unknown extensions and unsupported formats.

### Minimal configuration

Mount the browser plugin as one client row:

```yaml
- insert:
    - id: ui-sidebar-artifact-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-artifact-preview'
```

The stock [`dsh-web-app`](../../bundle/web-app/README.md) bundle includes the row. Custom Web profiles that already mount the Web surface can install [`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.md) instead of editing their patch by hand.

| Field | Default | Meaning |
|---|---|---|
| `maxImageBytes` | `8388608` | Largest image the browser assembles into a Blob URL. |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-sidebar-artifact-preview) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals - click to expand</summary>

The package contributes four right-Sidebar tab definitions at the `extension` priority band and four keyed bodies under `sidebar.right.pane.tab`. Each tab keeps its address as the content identity, so the same basename under different sessions or directories opens as distinct content. The standard `file` resource supplies metadata and change notices; this package reads content itself through `remote.workspaceFiles`.

Markdown, JSON, and CSV/TSV viewers call `workspaceFiles.read(sessionId, path, { offset: 1 })` and keep only that first text page. Markdown renders through `MarkdownText`; JSON renders object and array roots through `JsonTree` and scalar roots as formatted text; CSV/TSV uses a package-local quoted-field parser and caps displayed columns. A non-EOF first page stays on screen with a truncation note rather than paging on demand.

The image viewer calls `workspaceFiles.readBytes(sessionId, path, { offset })` until EOF, the configured browser byte limit, or a failure. If a later byte window reports a different file version, the viewer restarts at offset `0` so one image Blob never mixes bytes from two versions. Blob URLs are owned by the injected face and revoked on reload or when the tab record's abort signal fires.

### Source map

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client plugin assembly: tab definitions, dictionaries, store, and body registrations |
| [`src/client/definitions.ts`](src/client/definitions.ts) | Extension patterns, title extraction, and file-address acceptance |
| [`src/client/face.ts`](src/client/face.ts) | Asynchronous read owner, generation retirement, image limits, and Blob URL cleanup |
| [`src/client/store.ts`](src/client/store.ts) | Per-tab preview state and view position |
| [`src/client/*.tsx`](src/client/MarkdownPreview.tsx) | Viewer bodies for Markdown, JSON, CSV/TSV, and images |
| [`tests/`](tests/) | Registration, routing, parsing, store, face, and component behavior |
| - | No runtime invariant companion is published; the package owns one Slot store and one injected read face, with no independent observation to compare. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Web Client subsystem](../../../docs/subsystems/web-client.md) - browser plugin layering and module loading.
- [Slots subsystem](../../../docs/subsystems/slots.md) - keyed body registration and store props.
- [Right Sidebar text preview](../ui-sidebar-textpreview/README.md) - fallback file viewer and paging behavior.
- [Workspace file API](../../api/workspace-files/README.md) - metadata, text pages, and byte windows.
- [Artifact preview viewers note](../../../.agents/notes/implemented/feature/2026-09-09-artifact-preview-viewers.md) - why the first phase stays on existing file resources.

-----

<a id="model-experience"></a>
## Model Experience

None, as the preview is a browser-only viewer that registers no tool, prompt section, or session event.

#### KV Cache effect

No direct effect; what the user reads here never enters a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define the first preview phase and the conditions that still fall back to raw text.

- **No artifact registry** - files are discovered and opened through existing `dsh-resource://file/` addresses; there is no separate produced-artifact index, manifest, or lifecycle.
- **First text page only** - Markdown, JSON, and CSV/TSV viewers do not page further, search, or syntax-highlight raw text.
- **SVG is not claimed** - SVG remains with the text fallback so XML and active-content handling stay out of the first image viewer.
- **Images are assembled in the browser** - very large images fail once the reported size or accumulated bytes exceeds `maxImageBytes`.
- **CSV/TSV is a preview parser** - quoted fields and line breaks are supported, but delimiter detection, type inference, sorting, filtering, and pinned headers are not part of this package.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers - click to expand</summary>

None.

</details>
