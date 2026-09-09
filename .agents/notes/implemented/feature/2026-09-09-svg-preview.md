# Agent Note: SVG preview viewer

Status: implemented

English | [中文](2026-09-09-svg-preview.zh.md)

## Problem

Rendered artifact previews need a safe path for SVG and other vector output. Treating SVG as an ordinary image would allow XML-specific active content and external references to reach the browser's image loader without an explicit policy.

## Decision

The Web client provides `@deepseek-ai/dsh-client-ui-sidebar-svg-preview` as an independent right-Sidebar plugin. It claims only `.svg` file resource addresses at the `extension` priority band and keeps the existing text preview available for source inspection and unsupported content.

The plugin reads the complete document through `workspaceFiles.readBytes`, enforces the configurable `maxSvgBytes` limit with a default of 2 MiB, restarts from offset `0` when byte windows report different file versions, and rejects invalid UTF-8 or a byte stream that stops advancing. It parses the XML before sanitization, removes scripts, embedded documents, event attributes, styles, and references that do not satisfy `externalResourcePolicy`, and reports each removal to the viewer. DOMPurify sanitizes the remaining SVG, and the browser renders it only through an `image/svg+xml` Blob URL assigned to an `<img>` element. The default policy is `strip`; `allow` preserves HTTP(S) references explicitly.

The injected face owns one Blob URL per tab, revokes it on reload and tab abort, and uses a per-tab generation counter to retire stale reads. The store keeps only the sanitized document URL, version, byte size, failure, and scroll position; it does not keep SVG source text or add session events.

The stock Web bundle and the installable `@deepseek-ai/dsh-artifact-viewers` bundle include the SVG plugin row. The SVG viewer remains separate from the generic image viewer because its input needs a stricter security policy and different validation failures.

## Alternatives considered

**Treat SVG as a generic image.** Rejected because the browser image loader does not express the product's XML-specific rejection policy, and the generic image path should not silently accept active or external content.

**Render sanitized SVG as HTML.** Rejected because inserting SVG markup into the document would widen the injection surface; the product displays the sanitized result through an image Blob URL instead.

**Keep SVG in the text fallback.** Rejected for the rendered preview because diagrams and generated vector assets are high-value inspection outputs. The fallback remains available for original source and documents that fail structural validation.

## Consequences

- Web users can inspect ordinary SVG diagrams and icons in the right Sidebar without an external editor.
- Invalid SVG structure fails visibly; active content and disallowed external references are removed with a visible notice instead of hiding unrelated vector content.
- Complete SVG bytes are held in the browser until validation and Blob creation, so the configurable size limit remains important.
- The feature stays browser-only and does not change model requests, durable session data, or Session format.
- Future vector viewers can share the same package only when they use the same address routing, security policy, and lifecycle; otherwise they should remain separate viewers.
