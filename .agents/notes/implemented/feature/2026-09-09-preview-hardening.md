# Agent Note: Preview hardening for external SVG resources and Office metadata

Status: implemented

English | [中文](2026-09-09-preview-hardening.zh.md)

## Problem

An SVG containing one external reference should not make an otherwise useful diagram unavailable. File-resource metadata can also describe an older version while a preview is reading a newer version, which makes displayed sizes misleading. Embedded PDF viewers need an explicit recovery path when the browser cannot render the document in the Sidebar.

## Decision

The SVG preview removes active content and references that do not satisfy its configured external-resource policy, then renders the remaining document and exposes localized warnings for removals and retained network resources. The default `externalResourcePolicy` is `allow`; `strip` removes HTTP(S) references for offline or deterministic deployments. Rendering remains isolated through a sanitized `image/svg+xml` Blob URL assigned to an image element.

The SVG face records the complete byte count used for the rendered document. The Office face records the complete byte count used for PDF, DOCX, and XLSX output. Preview headers prefer the rendered version's byte count and fall back to file-resource metadata only when the reader did not report one.

The PDF viewer keeps the embedded browser document viewer and adds open-in-new-window and download actions that use the owned Blob URL. These actions remain available when embedded PDF rendering is unavailable.

Patch and Artifact text readers convert rejected Remote promises into retryable tab failures, and the Patch parser removes carriage returns from CRLF input before interpreting paths or changed lines. PDF renders the shared empty-file state when no source, failure, or active read remains.

## Alternatives considered

**Fail the entire SVG when one external reference is present.** Rejected because a single link or linked image should not hide unrelated vector content; the preview can remove the unsafe or unavailable part and explain the result.

**Allow external SVG resources by default.** Accepted because visual preview fidelity is the primary product outcome; the viewer restricts protocols, removes active content, and warns when a browser network request may occur.

**Use resource metadata as the only file-size source.** Rejected because metadata can lag behind a file replacement observed during the read; the bytes used to render the current preview are the authoritative display value.

**Rely only on the browser's embedded PDF viewer.** Rejected because browser support can vary by host and embedding context; opening or downloading the owned Blob gives the user a reliable fallback.

## Consequences

- Ordinary SVG diagrams retain HTTP(S) linked assets by default, while deployments can set `externalResourcePolicy: strip` when they require offline or deterministic rendering.
- Users can see when an SVG resource was removed and when the browser may request a retained external resource.
- Users can identify when SVG content was removed and can see the size of the rendered file version.
- PDF, DOCX, and XLSX previews show the size of the bytes they actually consumed, and PDF users have two explicit fallback actions.
- Patch and Artifact readers settle transport exceptions visibly, and Patch files produced on Windows retain clean paths and changed-line text.
- PDF files with no renderable source show an explicit empty state instead of a blank body.
- The hardening changes no model-visible input, durable Session event, or artifact identity.
- External resources are not proxied or rewritten; deployments that require offline or deterministic rendering should set the `strip` policy.
