# Agent Note: Patch preview

Status: implemented

English | [中文](2026-09-09-patch-preview.zh.md)

## Problem

The right Sidebar can open workspace patch files, but raw text is slow to scan when a user needs the changed files and lines first. The first preview phase needs useful diff rendering without creating a second artifact discovery or persistence system.

## Decision

The patch viewer is an independent browser-only client plugin, `@deepseek-ai/dsh-client-ui-sidebar-patch-preview`, for `.diff`, `.patch`, and `.udiff` file resource addresses. It reuses the existing `file` resource metadata, `workspaceFiles.read`, and `DiffBlock` primitive. It owns one tab store and one injected read face, registers no Host service, artifact registry, Session event, tool, or prompt section, and uses `maxHunks` as explicit validated configuration.

The parser accepts Git and plain unified diff headers, keeps file hunks in source order, counts added and removed lines, and reports invalid non-empty text as a visible failure. The first phase passes only changed lines to `DiffBlock`; it does not retain context lines. The text fallback remains the complete-context path.

The viewer reads only the first Host text page. It reports a non-EOF page and a hunk-limit stop separately, retires older reads on reload, and forgets tab state when the tab signal aborts. The default Web profile and the installable artifact-viewers bundle each insert the plugin row.

## Alternatives considered

**Merge it into the artifact preview plugin.** Rejected because patch routing, parsing, failure handling, and state are independent from rendered Markdown, JSON, CSV/TSV, image, and future Office viewers. Separate packages let profiles install or replace one capability without importing another feature plugin's runtime values.

**Add patch parsing to the text preview.** Rejected because the text preview owns sequential line paging and wrap, while a diff viewer owns hunk limits, changed-line statistics, and compact diff presentation.

**Build an artifact registry first.** Rejected because existing `file` resource addresses already identify the files users can open. A registry can be added later for grouping and produced-artifact discovery without making this viewer depend on it.

**Retain all context lines in `DiffBlock`.** Rejected for the first phase because the shared primitive renders changed sides and has no context-row input. Showing the limitation explicitly keeps the compact viewer honest and leaves complete context to text preview.

## Consequences

- Common patch files open as a compact changed-line view in the default Web profile.
- Custom Web profiles can add the same row through the artifact-viewers bundle.
- Invalid patch text fails visibly instead of silently changing viewer type.
- Large or multi-page patches are bounded by Host page limits and `maxHunks`; full context remains available through text preview.
- Future artifact discovery can be added independently because this plugin uses ordinary file resource addresses and no new durable format.
