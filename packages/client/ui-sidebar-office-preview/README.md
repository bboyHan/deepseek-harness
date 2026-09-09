---
description: "Rendered right-Sidebar viewers for PDF, DOCX, and XLSX files opened from workspace file resources, with bounded browser reads and format-specific previews."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-office-preview

English | [中文](README.zh.md)

## Summary

The right Sidebar can preview PDF, DOCX, and XLSX files instead of opening them as raw text. Use this browser plugin when a Web profile already provides the right Sidebar, file resources, and workspace-files Remote. PDF uses the browser document viewer with open and download fallback actions, DOCX becomes sanitized HTML, and XLSX becomes bounded worksheet tables. The browser assembles each complete file up to the configured byte limit and shows the size of the bytes used for the current preview.

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

Mount this client plugin in a Web composition that already includes the right Sidebar and the workspace file Remote.

### When to choose it

Choose this package for quick inspection of generated PDF, Word, and Excel files inside the Web UI. Keep the generic artifact viewer, text preview, or external application available for formats outside PDF, DOCX, and XLSX, and for files that exceed the browser limit.

### Minimal configuration

Mount the browser plugin as one client row:

```yaml
- insert:
    - id: ui-sidebar-office-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-office-preview'
```

| Field | Default | Meaning |
|---|---|---|
| `maxOfficeBytes` | `2097152` | Largest Office file the browser assembles before preview parsing or display. |
| `maxSpreadsheetRows` | `5000` | Maximum rows retained from each worksheet. |
| `maxSpreadsheetColumns` | `100` | Maximum columns retained from each worksheet. |
| `maxSpreadsheetSheets` | `20` | Maximum worksheets retained from each workbook. |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-sidebar-office-preview) is the exhaustive source for every accepted field.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package registers three extension-band tab definitions for workspace file addresses and three keyed Sidebar bodies. One shared Store tracks each tab, while one injected face owns byte-window reads, file-version restarts, parser dispatch, cancellation, byte-size metadata, and Blob URL cleanup.

PDF bytes become an `application/pdf` Blob URL for the browser document viewer and its open/download actions. DOCX bytes pass through Mammoth and DOMPurify before the sanitized HTML is stored. XLSX bytes pass through SheetJS and are projected into bounded rows, columns, and worksheet counts before React renders the tables. Every parsed result retains the complete byte count used by the current preview.

### Source map

| File | Role |
|---|---|
| [`src/client/index.ts`](src/client/index.ts) | Client plugin assembly: definitions, locale, Store, face, and body registrations |
| [`src/client/definitions.ts`](src/client/definitions.ts) | PDF, DOCX, and XLSX address patterns and tab titles |
| [`src/client/face.ts`](src/client/face.ts) | Complete byte reads, version restarts, parser dispatch, limits, cancellation, and Blob URL ownership |
| [`src/client/docx-parser.ts`](src/client/docx-parser.ts) | DOCX conversion and HTML sanitization |
| [`src/client/xlsx-parser.ts`](src/client/xlsx-parser.ts) | XLSX validation and bounded worksheet projection |
| [`src/client/*.tsx`](src/client/DocxPreview.tsx) | PDF, DOCX, and XLSX viewer bodies |
| [`tests/`](tests/) | Registration, resource routing, parsing, Store, read lifecycle, and component behavior |
| - | No runtime invariant companion is published; the package has one Store and one injected face without diverging observations to compare. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Right Sidebar subsystem](../../../docs/subsystems/sidebar-right.md) - tab routing, extension priorities, and keyed bodies.
- [Workspace file API](../../api/workspace-files/README.md) - bounded byte windows and file-version metadata.
- [Rendered artifact viewers](../ui-sidebar-artifact-preview/README.md) - Markdown, JSON, CSV/TSV, and raster image previews.
- [Artifact viewer bundle](../../bundle/artifact-viewers/README.md) - installable Web profile layer for the viewer family.
- [Client package map](../README.md) - browser package ownership and composition.
- [Preview hardening Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-preview-hardening.md) - file-size authority and PDF fallback.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package is a browser-only viewer that registers no tool, prompt section, or Session event.

#### KV Cache effect

No direct effect; content shown in the Sidebar never enters a model request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits define the current Office preview behavior.

- **Three formats** - The package claims PDF, DOCX, and XLSX; legacy `.doc`, `.xls`, and `.pptx` files remain with another viewer or external application.
- **Browser assembly** - The browser retains the complete Office file before parsing or displaying it and stops at `maxOfficeBytes`.
- **DOCX fidelity** - DOCX becomes sanitized HTML, so exact pagination, fonts, fields, and embedded application behavior are not reproduced.
- **XLSX preview scope** - XLSX retains bounded display values only; formulas, charts, workbook editing, sorting, and filtering are not interactive.
- **PDF browser support** - Embedded PDF rendering depends on the browser's built-in document viewer; opening the Blob in a new window or downloading it remains available as a fallback.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
