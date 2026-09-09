/** Video source URL and native-open owner. */
import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { VideoRemote, SessionFile } from './rpc.ts'
import { videoUrlOf } from './rpc.ts'
import type { VideoStore } from './store.ts'

/** Injected business face for the video viewer body. */
export interface VideoInjected {
  /** Create the current video source URL and bind tab cleanup. */
  readonly load: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
  /** Retire the current browser media request and point the element at a fresh URL. */
  readonly reload: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
  /** Ask the Host to open one path in the system default app. */
  readonly openExternal: (tabId: TabId, path: string, signal: AbortSignal) => void
}

/**
 * Bind same-origin video URLs and native open requests to one store.
 * @param remote - Client Remote carrying the Session namespace.
 * @returns a Slot inject factory.
 */
export function videoFace(
  remote: VideoRemote,
): (sessionId: SessionId, actions: BoundActions<VideoStore>) => VideoInjected {
  return (_sessionId, actions) => {
    const revisions = new Map<TabId, number>()
    const bind = (tabId: TabId, signal: AbortSignal): number | undefined => {
      if (signal.aborted) return undefined
      const held = revisions.get(tabId)
      if (held !== undefined) return held
      revisions.set(tabId, 0)
      signal.addEventListener('abort', () => {
        revisions.delete(tabId)
        actions.forget(tabId)
      }, { once: true })
      return 0
    }
    const load = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      const revision = bind(tabId, signal)
      if (revision === undefined) return
      actions.load(tabId, videoUrlOf(file, revision))
    }
    const reload = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      const revision = bind(tabId, signal)
      if (revision === undefined) return
      const next = revision + 1
      revisions.set(tabId, next)
      actions.reload(tabId, videoUrlOf(file, next))
    }
    const openExternal = (tabId: TabId, path: string, signal: AbortSignal): void => {
      if (signal.aborted) return
      actions.opening(tabId)
      void remote.session.openWorkspacePath({ path }, signal).then((result) => {
        if (signal.aborted) return
        if (!result.ok) {
          actions.failed(tabId, { code: 'video-preview/open-failed', message: result.error.message })
          return
        }
        actions.opened(tabId)
      }, (error: unknown) => {
        if (signal.aborted) return
        actions.failed(tabId, {
          code: 'video-preview/open-failed',
          message: error instanceof Error ? error.message : String(error),
        })
      })
    }
    return { load, reload, openExternal }
  }
}
