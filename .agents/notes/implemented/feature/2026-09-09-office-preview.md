# Agent Note: Office preview viewer

Status: implemented

English | [中文](2026-09-09-office-preview.zh.md)

## Problem

The first artifact viewer phase covers Markdown, JSON, CSV/TSV, raster images, patches, and sanitized SVG, but common Office files still fall back to raw text or an external application. PDF, DOCX, and XLSX need format-aware inspection without adding a new artifact registry or changing Session data.

## Decision

The Web client uses one `@deepseek-ai/dsh-client-ui-sidebar-office-preview` plugin for PDF, DOCX, and XLSX. The plugin shares file identity, byte-window reads, version restart, cancellation, limits, Store state, localized failure handling, and right-Sidebar registration across the three formats. It keeps parser dependencies in this package instead of loading them into the generic artifact viewer.

PDF bytes become a browser PDF Blob URL. DOCX bytes are converted by Mammoth and sanitized by DOMPurify before rendering. XLSX bytes are parsed by SheetJS and projected into configured worksheet, row, and column limits. The browser stops assembling a file at `maxOfficeBytes`; the existing text or external-application fallback remains available outside the claimed formats or when preview limits reject a file.

The default Web bundle and the installable `dsh-artifact-viewers` bundle both mount the Office plugin row. The installable bundle continues to be one user-facing layer for rendered artifact viewers, while runtime packages remain separated by parser and security policy.

The feature adds no model-visible input, durable Session event, Host service, or artifact registry. The existing `file` resource address remains the content identity, and the workspace-files Remote remains the read owner.

## Alternatives considered

**Merge Office into the generic artifact viewer.** Rejected because Mammoth and SheetJS are format-specific, larger dependencies with different memory and failure behavior. A separate package keeps the common Markdown, JSON, CSV/TSV, and image path smaller and lets profiles replace Office independently.

**Create one package per Office format.** Rejected for this phase because all three formats use the same right-Sidebar lifecycle, byte reader, limits, Store, and profile installation path. Splitting them would duplicate registration and resource ownership without an independent consumer.

**Parse Office files on the Host.** Rejected because the first phase already exposes bounded byte windows to the browser, and browser-only parsing avoids a new Host service, wire method, and persistence contract.

## Consequences

- PDF, DOCX, and XLSX files receive format-aware previews in the default Web profile.
- Custom Web profiles install the complete rendered viewer family through one bundle.
- Parser dependencies are loaded only when the Office client package is mounted.
- Large files and unsupported Office formats retain explicit fallback paths.
- Future format viewers can join the bundle without changing the existing Session log or artifact identity.
