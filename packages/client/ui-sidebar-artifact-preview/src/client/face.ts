/** Asynchronous read face for artifact preview tabs. */
import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ResolvedConfig } from '../index.ts'
import { base64ToBytes, joinBytes } from './media.ts'
import { artifactFailureOf, type ArtifactFailure } from './failure-line.ts'
import type { ArtifactViewer } from './definitions.ts'
import type { ArtifactStore } from './store.ts'
import type { ReadArtifactBytes, ReadArtifactText, SessionFile } from './rpc.ts'

/** The preview's injected business face, as each body receives it. */
export interface ArtifactInjected {
  /**
   * Read the first text page into the store.
   * @param tabId - the tab being drawn.
   * @param viewer - viewer bucket to write.
   * @param file - file the tab's address names.
   * @param signal - the tab record's lifetime.
   */
  readonly loadText: (tabId: TabId, viewer: ArtifactViewer, file: SessionFile, signal: AbortSignal) => void
  /**
   * Drop existing text and read again from the first page.
   * @param tabId - the tab being drawn.
   * @param viewer - viewer bucket to write.
   * @param file - file the tab's address names.
   * @param signal - the tab record's lifetime.
   */
  readonly reloadText: (tabId: TabId, viewer: ArtifactViewer, file: SessionFile, signal: AbortSignal) => void
  /**
   * Read every byte window needed for one image and publish a Blob URL.
   * @param tabId - the tab being drawn.
   * @param file - file the tab's address names.
   * @param mime - image MIME type assigned to the Blob.
   * @param signal - the tab record's lifetime.
   */
  readonly loadImage: (tabId: TabId, file: SessionFile, mime: string, signal: AbortSignal) => void
  /**
   * Drop the current image and read it again.
   * @param tabId - the tab being drawn.
   * @param file - file the tab's address names.
   * @param mime - image MIME type assigned to the Blob.
   * @param signal - the tab record's lifetime.
   */
  readonly reloadImage: (tabId: TabId, file: SessionFile, mime: string, signal: AbortSignal) => void
}

interface TabReads {
  generation: number
}

function tooLarge(limit: number): ArtifactFailure {
  return {
    code: 'artifact-preview/image-too-large',
    message: `image exceeds ${String(limit)} bytes`,
    details: { limit },
  }
}

function incomplete(): ArtifactFailure {
  return {
    code: 'artifact-preview/image-incomplete',
    message: 'image byte stream did not advance',
    details: {},
  }
}

/**
 * Bind the preview face to Remote calls and one Blob URL owner.
 * @param readText - bound text page read.
 * @param readBytes - bound byte-window read.
 * @param config - viewer runtime limits.
 * @returns the Slot inject factory.
 */
export function artifactFace(
  readText: ReadArtifactText,
  readBytes: ReadArtifactBytes,
  config: ResolvedConfig,
): (sessionId: SessionId, actions: BoundActions<ArtifactStore>) => ArtifactInjected {
  return (_sessionId: SessionId, actions: BoundActions<ArtifactStore>): ArtifactInjected => {
    const tabs = new Map<TabId, TabReads>()
    const urls = new Map<TabId, string>()

    const revoke = (tabId: TabId): void => {
      const url = urls.get(tabId)
      if (url !== undefined) URL.revokeObjectURL(url)
      urls.delete(tabId)
    }

    const readsOf = (tabId: TabId, signal: AbortSignal): TabReads => {
      const held = tabs.get(tabId)
      if (held !== undefined) return held
      const created: TabReads = { generation: 0 }
      tabs.set(tabId, created)
      signal.addEventListener('abort', () => {
        tabs.delete(tabId)
        revoke(tabId)
        actions.forget(tabId)
      }, { once: true })
      return created
    }

    const reset = (tabId: TabId, viewer: ArtifactViewer, signal: AbortSignal): TabReads | undefined => {
      if (signal.aborted) return undefined
      const reads = readsOf(tabId, signal)
      reads.generation += 1
      revoke(tabId)
      actions.reset(tabId, viewer)
      return reads
    }

    const loadText = (tabId: TabId, viewer: ArtifactViewer, file: SessionFile, signal: AbortSignal): void => {
      if (signal.aborted) return
      const reads = readsOf(tabId, signal)
      const { generation } = reads
      actions.loading(tabId, viewer)
      void readText(file.sessionId, file.path, signal).then((result) => {
        if (signal.aborted || reads.generation !== generation) return
        if (!result.ok) {
          actions.failed(tabId, viewer, artifactFailureOf(result.error))
          return
        }
        actions.text(tabId, viewer, result.value)
      }).catch((error: unknown) => {
        if (signal.aborted || reads.generation !== generation) return
        actions.failed(tabId, viewer, {
          code: 'artifact-preview/read-failed',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        })
      })
    }

    const reloadText = (tabId: TabId, viewer: ArtifactViewer, file: SessionFile, signal: AbortSignal): void => {
      const reads = reset(tabId, viewer, signal)
      if (reads !== undefined) loadText(tabId, viewer, file, signal)
    }

    const loadImage = (tabId: TabId, file: SessionFile, mime: string, signal: AbortSignal): void => {
      const viewer: ArtifactViewer = 'image'
      if (signal.aborted) return
      const reads = readsOf(tabId, signal)
      const { generation } = reads
      actions.loading(tabId, viewer)
      void (async () => {
        let restart = true
        while (restart && !signal.aborted) {
          restart = false
          let offset = 0
          let version: string | undefined
          let bytes: number | undefined
          const chunks: Uint8Array[] = []
          while (!signal.aborted) {
            const result = await readBytes(file.sessionId, file.path, offset, signal)
            if (signal.aborted || reads.generation !== generation) return
            if (!result.ok) {
              actions.failed(tabId, viewer, artifactFailureOf(result.error))
              return
            }
            const value = result.value
            if (value.bytes !== undefined && value.bytes > config.maxImageBytes) {
              actions.failed(tabId, viewer, tooLarge(config.maxImageBytes))
              return
            }
            if (version !== undefined && value.version !== version) {
              restart = true
              break
            }
            version = value.version
            bytes = value.bytes
            const chunk = base64ToBytes(value.data)
            const nextOffset = offset + chunk.byteLength
            if (nextOffset > config.maxImageBytes) {
              actions.failed(tabId, viewer, tooLarge(config.maxImageBytes))
              return
            }
            chunks.push(chunk)
            if (value.eof) {
              const blob = new Blob([joinBytes(chunks)], { type: mime })
              const src = URL.createObjectURL(blob)
              revoke(tabId)
              urls.set(tabId, src)
              actions.image(tabId, viewer, {
                src,
                mime,
                version,
                ...bytes === undefined ? {} : { bytes },
              })
              return
            }
            if (nextOffset === offset) {
              actions.failed(tabId, viewer, incomplete())
              return
            }
            offset = nextOffset
          }
        }
      })().catch((error: unknown) => {
        if (signal.aborted || reads.generation !== generation) return
        actions.failed(tabId, viewer, {
          code: 'artifact-preview/read-failed',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        })
      })
    }

    const reloadImage = (tabId: TabId, file: SessionFile, mime: string, signal: AbortSignal): void => {
      const reads = reset(tabId, 'image', signal)
      if (reads !== undefined) loadImage(tabId, file, mime, signal)
    }

    return { loadText, reloadText, loadImage, reloadImage }
  }
}
