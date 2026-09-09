# Agent Note: Artifact preview viewers

Status: implemented

English | [中文](2026-09-09-artifact-preview-viewers.zh.md)

## Problem

The Web client can open workspace files through right-Sidebar `file` resource addresses, and the plain-text fallback can read any supported text file. Generated artifacts such as Markdown reports, JSON data, CSV/TSV tables, and images need a faster inspection path than raw text or an external editor. A separate artifact registry would require new lifecycle, discovery, persistence, and model-visible ownership before the first useful preview can ship.

## Decision

The first artifact-preview phase is a browser-only client plugin, `@deepseek-ai/dsh-client-ui-sidebar-artifact-preview`. It registers four right-Sidebar tab definitions at the `extension` priority band: Markdown for `*.md` and `*.markdown`, image for PNG, JPEG, GIF, WebP, BMP, and AVIF, JSON for `*.json`, and CSV/TSV for `*.csv` and `*.tsv`. The existing `@deepseek-ai/dsh-client-ui-sidebar-textpreview` fallback keeps unknown extensions and unsupported formats.

The plugin reads content through the existing workspace-files Remote namespace. Markdown, JSON, and CSV/TSV read only the first text page with `workspaceFiles.read(..., { offset: 1 })`; the UI shows a truncation note when that page is not EOF. The image viewer reads byte windows with `workspaceFiles.readBytes(..., { offset })`, enforces a browser-side `maxImageBytes` limit, restarts when a later window reports a different file version, and revokes owned Blob URLs on reload or tab disposal. SVG is not claimed in this phase, so it remains under the text fallback.

The stock `dsh-web-app` bundle inserts the viewer row, so the default Web profile has rendered previews. A separate `@deepseek-ai/dsh-artifact-viewers` bundle inserts the same row id for custom Web profiles that want the feature without copying the patch entry. The bundle is not installed on the stock Web profile because the row is already present there.

The feature does not add model-visible input, durable session events, or an artifact registry. The open resource address remains the content identity and the `file` resource provider remains the metadata owner.

## Alternatives considered

**Build an artifact registry first.** Rejected for the first phase because the existing file resource address already identifies the files the right Sidebar can open. A registry would be useful for grouping, lifecycle, thumbnails, and produced-artifact discovery, but it would delay preview rendering behind new persistence and ownership rules.

**Extend the text preview package with render modes.** Rejected because raw text paging and rendered previews have different read strategies, UI controls, and state. Keeping rendered viewers in a separate package lets the fallback remain simple and lets custom profiles install or remove the rendered viewers as one layer.

**Claim SVG as an image.** Rejected because SVG can carry active content and XML-specific behavior. Keeping SVG with the text fallback avoids introducing an image sandbox policy in the first phase.

**Add load-more behavior for Markdown, JSON, and CSV/TSV.** Rejected because the first phase optimizes quick inspection and avoids mixing parser state across multiple text pages. The truncation note is explicit, and the text fallback remains available for full sequential paging.

## Consequences

- The default Web profile can show rendered previews for common generated artifacts opened through existing file resource addresses.
- Custom Web profiles can install the same viewer through `@deepseek-ai/dsh-artifact-viewers`, while profiles without the Web client cannot use that bundle alone.
- No model request, prompt prefix, or Session log format changes because the feature is browser-only presentation.
- Large images stop at the configured browser limit, and text-like formats show only the first Host page.
- Future work can add an artifact registry without migrating this phase's tab state, because the viewer already accepts ordinary file resource addresses.
