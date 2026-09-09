# Agent Note: video preview viewer

Status: implemented

English | [中文](2026-09-09-video-preview.zh.md)

## Problem

Rendered artifact previews need to inspect video without buffering a large source file in the browser. A normal file download does not provide the HTTP Range and metadata behavior required by native video playback, and a browser-supported container does not guarantee that its codec can decode.

## Decision

The Web client provides `@deepseek-ai/dsh-client-ui-sidebar-video-preview` as an independent Host and Client plugin. The Client claims mainstream video extensions and renders one native `<video>` element with metadata preload, browser controls, and explicit download, new-window, and system-app actions. The Host owns `/api/sidebar-video-preview/file`, resolves the addressed Session through `sessionController`, confines the requested path to that Session's workspace, and serves authenticated single-range responses.

The Host accepts `.mp4`, `.m4v`, `.webm`, `.ogv`, `.ogg`, `.mov`, `.mkv`, `.avi`, `.wmv`, `.flv`, and `.3gp`. It validates `maxVideoBytes` and `maxRangeBytes`, returns `HEAD` metadata, returns `206` for one valid range, returns `416` for malformed, multi-range, unsatisfied, or over-limit ranges, and streams an un-ranged GET in bounded `readByteRange` windows.

The browser keeps a route URL and native media metadata rather than a complete Blob. Media events update duration and resolution. Media errors become visible unsupported, decode, network, or aborted states, while fallback actions remain usable. Reload changes the URL revision and tab cleanup removes store state.

The stock Web bundle and the installable `@deepseek-ai/dsh-artifact-viewers` bundle include the plugin row. The package remains separate from image preview because video playback depends on range delivery, native media lifecycle, and decoder failure handling.

## Alternatives considered

**Read the complete video into a Blob URL.** Rejected because seeking and long-video playback would require retaining the entire source in browser memory.

**Extend the shared `/api/file` route.** Rejected because that route has an established arbitrary absolute-path media-reference contract and a shared attachment cap; video needs Session workspace containment and independent source and range limits.

**Transcode every unsupported video with ffmpeg.** Rejected because it adds a process dependency, CPU and disk cost, startup and cancellation lifecycle, and a new output ownership problem. The viewer reports decoder limits and keeps download and system-app fallback.

**Build custom MSE, HLS, or WebCodecs playback.** Rejected because the first product capability is native file inspection; custom streaming protocols would add a larger state machine before browser-native behavior is exhausted.

## Consequences

- Web users can seek and play supported local video files without loading the complete source into a Blob.
- The route applies Session workspace containment and refuses symlinks before resolving the final target.
- Range behavior is explicit and testable, so browser seek requests receive standards-shaped responses.
- Recognized containers that the browser cannot decode fail visibly and retain practical fallback actions.
- The plugin does not edit video, transcode content, add model-visible data, or change Session format.
- The default 512 MiB source cap and 4 MiB range cap are deployment configuration, so a product deployment can tune resource use without changing the route code.

## Verification

The focused video test set passes 17 tests with one Windows-only symlink test skipped by platform policy. Host and Client package typechecks pass. The full browser replay lane remains environment-limited when Playwright Chromium is not installed.
