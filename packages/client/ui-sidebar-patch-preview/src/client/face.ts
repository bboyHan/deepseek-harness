/** Asynchronous read owner for patch preview tabs. */
import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ResolvedConfig } from '../index.ts'
import { patchFailureOf } from './failure-line.ts'
import type { ReadPatchText, SessionFile } from './rpc.ts'
import type { PatchStore } from './store.ts'
import { parsePatch } from './patch.ts'

/** The face injected into the patch body. */
export interface PatchInjected {
  /**
   * Read and parse the first page.
   * @param tabId - the tab being drawn.
   * @param file - the Session and path named by the address.
   * @param signal - the tab record's lifetime.
   */
  readonly loadPatch: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
  /**
   * Drop the current page and read it again.
   * @param tabId - the tab being drawn.
   * @param file - the Session and path named by the address.
   * @param signal - the tab record's lifetime.
   */
  readonly reloadPatch: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
}

interface TabReads {
  generation: number
}

/**
 * Bind the patch face to a text read and store actions.
 * @param read - bound workspace-files text read.
 * @param config - parser limits.
 * @returns a Slot inject factory.
 */
export function patchFace(
  read: ReadPatchText,
  config: ResolvedConfig,
): (sessionId: SessionId, actions: BoundActions<PatchStore>) => PatchInjected {
  return (_sessionId, actions) => {
    const reads = new Map<TabId, TabReads>()
    const readsOf = (tabId: TabId, signal: AbortSignal): TabReads => {
      const held = reads.get(tabId)
      if (held !== undefined) return held
      const created: TabReads = { generation: 0 }
      reads.set(tabId, created)
      signal.addEventListener('abort', () => {
        reads.delete(tabId)
        actions.forget(tabId)
      }, { once: true })
      return created
    }
    const loadPatch = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      if (signal.aborted) return
      const state = readsOf(tabId, signal)
      const { generation } = state
      actions.loading(tabId)
      void read(file.sessionId, file.path, signal).then((result) => {
        if (signal.aborted || state.generation !== generation) return
        if (!result.ok) {
          actions.failed(tabId, patchFailureOf(result.error))
          return
        }
        const parsed = parsePatch(result.value.text, result.value.version, result.value.eof, config.maxHunks, result.value.bytes)
        if (!parsed.ok) {
          actions.failed(tabId, patchFailureOf({
            code: 'patch-preview/invalid-patch',
            message: parsed.message,
            details: {},
          }))
          return
        }
        actions.patch(tabId, parsed.value)
      }).catch((error: unknown) => {
        if (signal.aborted || state.generation !== generation) return
        actions.failed(tabId, patchFailureOf({
          code: 'patch-preview/read-failed',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        }))
      })
    }
    const reloadPatch = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      if (signal.aborted) return
      const state = readsOf(tabId, signal)
      state.generation += 1
      actions.reset(tabId)
      loadPatch(tabId, file, signal)
    }
    return { loadPatch, reloadPatch }
  }
}
