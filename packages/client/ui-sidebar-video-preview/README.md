---
description: "A Range-backed right-Sidebar video viewer for workspace file resources, with native browser playback and explicit download or external-app fallback."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-sidebar-video-preview

English | [中文](README.zh.md)

## Summary

The right Sidebar can preview workspace video files with native browser playback. Use this client and Host plugin when a Web profile already provides the right Sidebar, file resources, Connection, Session Controller, filesystem, and sandbox policy. The Host serves session-confined HTTP Range responses; the browser loads metadata lazily and exposes play, seek, download, new-window, and system-app actions. Unsupported codecs show a visible failure with fallback actions instead of leaving an empty player.

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

Mount this package in a Web profile that already includes the Connection, Session Controller, filesystem, sandbox policy, right Sidebar, file resources, and client Session services.

### When to choose it

Choose this package for quick playback and inspection of generated video files. Keep the text or generic file fallback for unsupported extensions. Keep download and system-app actions available for containers or codecs that the browser cannot decode.

### Minimal configuration

Mount the plugin as one row:

```yaml
- insert:
    - id: ui-sidebar-video-preview
      name: '@deepseek-ai/dsh-client-ui-sidebar-video-preview'
```

| Field | Default | Meaning |
|---|---:|---|
| `maxVideoBytes` | `536870912` | Largest source video the Host serves. |
| `maxRangeBytes` | `4194304` | Largest single HTTP Range response and full-response stream read. |

The generated [configuration catalog](../../../docs/config-catalog.md#deepseek-aidsh-client-ui-sidebar-video-preview) is the exhaustive source for every accepted field.

### Supported extensions

The viewer claims `.mp4`, `.m4v`, `.webm`, `.ogv`, `.ogg`, `.mov`, `.mkv`, `.avi`, `.wmv`, `.flv`, and `.3gp`. The first six use common browser MIME declarations. The remaining containers are recognized so users receive the same viewer and explicit fallback when the browser lacks a decoder.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals - click to expand</summary>

The Host route is `/api/sidebar-video-preview/file?sessionId=<id>&path=<workspace-path>`. Connection authenticates the request before the route runs. The route resolves the Session Agent, obtains its policy workspace root, rejects symlinks and paths outside that root, checks the regular-file type and configured source cap, then reads only the requested byte window through `ctx.fs.readByteRange`.

`HEAD` reports the complete size, MIME type, and `Accept-Ranges: bytes`. A valid single range returns `206 Partial Content` with `Content-Range`; malformed, multi-range, unsatisfied, or over-limit ranges return `416`. A GET without Range streams the complete file in bounded windows. Responses use `private, no-store` and `nosniff`.

The browser body uses `<video controls preload="metadata" playsInline>`. It stores only the route URL, reload revision, metadata, and failure state. Native media events provide duration and resolution. A browser error is mapped to an explicit unsupported, decode, network, or aborted state. Download, new-window, and system-default-app actions remain available.

### Source map

| File | Role |
|---|---|
| [`src/index.ts`](src/index.ts) | Host configuration and session-confined HTTP Range route |
| [`src/config.ts`](src/config.ts) | Shared validated limits |
| [`src/client/index.ts`](src/client/index.ts) | Client registration, locale, Store, face, and body assembly |
| [`src/client/definitions.ts`](src/client/definitions.ts) | Video extensions, address acceptance, and tab title |
| [`src/client/face.ts`](src/client/face.ts) | URL revisions, tab cleanup, and native-app dispatch |
| [`src/client/VideoPreview.tsx`](src/client/VideoPreview.tsx) | Native browser video body and media error mapping |
| [`tests/`](tests/) | Range route, registration, lifecycle, state, and component behavior |
| - | No runtime invariant companion is published; the package has no independent mutable observation to compare with its route and viewer registrations. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Right Sidebar subsystem](../../../docs/subsystems/sidebar-right.md) - tab routing, resource addresses, and body slots.
- [Workspace file API](../../api/workspace-files/README.md) - workspace containment and file metadata.
- [Session Controller](../../api/session-controller/README.md) - Session identity resolution and native path opening.
- [Artifact viewer bundle](../../bundle/artifact-viewers/README.md) - installable Web profile layer.
- [Client package map](../README.md) - browser package ownership and composition.
- [Video preview Agent Note](../../../.agents/notes/implemented/feature/2026-09-09-video-preview.md) - Range delivery and browser fallback decisions.

-----

<a id="model-experience"></a>
## Model Experience

None, as this package registers a browser viewer and an authenticated file route but no tool, prompt section, or Session event.

#### KV Cache effect

No direct effect; video bytes and playback metadata stay in the Web UI and do not enter model requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits describe the viewer's playback and delivery behavior.

- **Codec support** - Browser support depends on the installed browser's decoder. Recognizing `.mkv`, `.avi`, `.wmv`, `.flv`, or `.3gp` does not promise direct playback.
- **No transcoding** - The plugin does not invoke ffmpeg, transcode files, or generate alternate streams.
- **Single-range responses** - The Host accepts one byte range per request. Multi-range requests are refused with `416`.
- **Source size cap** - Files above `maxVideoBytes` are refused before content reads.
- **No custom streaming protocols** - HLS, DASH, MSE, and WebCodecs are outside this viewer.
- **Read-only viewer** - The UI does not edit, trim, annotate, or export video.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers - click to expand</summary>

None.

</details>
