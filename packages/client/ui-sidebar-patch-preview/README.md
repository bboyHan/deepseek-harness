---
description: "A unified diff and patch viewer for the dsh Web client's right Sidebar, with bounded reads, changed-line summaries, reload, and text fallback for full context."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-patch-preview

English | [中文](README.zh.md)

## Summary

The right Sidebar can render `.diff`, `.patch`, and `.udiff` files as changed lines with file, hunk, added-line, and removed-line counts. The viewer reads the existing `file` resource through the workspace-files Remote, so it adds no artifact registry, model-visible input, or Session event.

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

### Minimal configuration

Add one client row to the profile:

```yaml
- insert:
    - id: ui-sidebar-patch-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-patch-preview'
```

The stock [`dsh-web-app`](../../bundle/web-app/README.md) includes this row. The [`dsh-artifact-viewers`](../../bundle/artifact-viewers/README.md) bundle adds the same row for custom Web profiles.

| Field | Default | Meaning |
|---|---|---|
| `maxHunks` | `500` | Largest number of unified diff hunks retained from the first text page. |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-sidebar-patch-preview) is the exhaustive source for accepted fields.

## Understand the implementation

<details>
<summary>Implementation internals - click to expand</summary>

The package registers one `extension` tab definition for `*.diff`, `*.patch`, and `*.udiff`, plus one keyed `sidebar.right.pane.tab` body. The tab address stays the content identity, and the standard `file` resource supplies the absolute path and change notice.

The body reads the first text page with `workspaceFiles.read(..., { offset: 1 })`. The parser recognizes Git and plain unified diff headers, groups changed lines into file hunks, and applies `maxHunks` before the body renders the shared `DiffBlock` primitive. The body keeps the read result, reload generation, and scroll position in one tab store.

The viewer shows a truncation notice when the first page is not EOF and a separate notice when `maxHunks` stops parsing. It does not silently treat invalid patch text as ordinary text; the existing text preview remains the path for complete context and unsupported syntax.

### Source map

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client registration, locale, store, and body assembly |
| [`src/client/definitions.ts`](src/client/definitions.ts) | Extension patterns, address acceptance, and tab titles |
| [`src/client/patch.ts`](src/client/patch.ts) | Unified diff parsing and line statistics |
| [`src/client/face.ts`](src/client/face.ts) | Bounded read ownership, reload generations, and tab cleanup |
| [`src/client/PatchPreview.tsx`](src/client/PatchPreview.tsx) | Sidebar body and user-visible states |
| [`tests/`](tests/) | Parser, store, face, component, registration, and bundle behavior |
| - | No runtime invariant companion is published because the viewer has no independent runtime observation to compare. |

</details>

## Further Exploration

- [Right Sidebar subsystem](../../../docs/subsystems/sidebar-right.md) - tab routing, resources, and body slots.
- [Workspace file API](../../api/workspace-files/README.md) - file metadata and bounded text reads.
- [Artifact preview viewers](../ui-sidebar-artifact-preview/README.md) - rendered Markdown, JSON, CSV/TSV, and image viewers.
- [Document preview](../ui-sidebar-documentpreview/README.md) - full sequential text paging and fallback behavior.
- [Patch preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-patch-preview.md) - the ownership and scope decision.

## Model Experience

None, as this package is a browser-only viewer that registers no tool, prompt section, or Session event.

#### KV Cache effect

No direct effect; the patch text read by the user never enters a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **First page only** - the viewer reads one Host text page. Use the text preview for a complete large patch.
- **Changed lines only** - the first phase omits unified diff context lines from `DiffBlock`; the file and hunk counts remain visible.
- **Bounded hunks** - `maxHunks` limits parser work and display size; the UI reports when the limit truncates the result.
- **Syntax scope** - Git and plain unified diff headers are supported. Binary patches, combined diffs, and malformed text fail visibly.
- **No patch editing** - the viewer is read-only and does not apply, save, or export patches.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers - click to expand</summary>

None.

</details>
