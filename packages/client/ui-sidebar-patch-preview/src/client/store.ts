/** Store state for patch preview tabs. */
import type { EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import { defineStore } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PatchFailure } from './failure-line.ts'
import type { ParsedPatch } from './patch.ts'

/** One tab's loaded patch and view state. */
export interface PatchTabState {
  /** The viewer bucket this state belongs to. */
  readonly viewer: 'patch'
  /** A read is in flight. */
  loading: boolean
  /** Why the last read or parse failed. */
  failure: PatchFailure | undefined
  /** Parsed first-page patch. */
  patch: ParsedPatch | undefined
  /** Scroll offset of the body, in px. */
  scrollTop: number
}

/** Every tab's patch state. */
export interface PatchState {
  byTab: Record<TabId, PatchTabState>
}

/**
 * Create an empty patch bucket.
 * @returns one patch tab state with no settled read.
 */
export function fresh(): PatchTabState {
  return {
    viewer: 'patch',
    loading: false,
    failure: undefined,
    patch: undefined,
    scrollTop: 0,
  }
}

function bucket(state: PatchState, tabId: TabId): PatchTabState {
  return state.byTab[tabId] ??= fresh()
}

type PatchActions = {
  loading: (draft: PatchState, tabId: TabId) => void
  patch: (draft: PatchState, tabId: TabId, value: ParsedPatch) => void
  failed: (draft: PatchState, tabId: TabId, failure: PatchFailure) => void
  reset: (draft: PatchState, tabId: TabId) => void
  scrolled: (draft: PatchState, tabId: TabId, scrollTop: number) => void
  forget: (draft: PatchState, tabId: TabId) => void
}

/**
 * Declare the patch preview store.
 * @returns the store handle used by the patch body registration.
 */
export function createPatchStore(): EngineStoreHandle<PatchState, PatchActions> {
  return defineStore({
    init: (): PatchState => ({ byTab: {} }),
    actions: {
      loading: (d, tabId) => {
        const state = bucket(d, tabId)
        state.loading = true
        state.failure = undefined
      },
      patch: (d, tabId, value) => {
        const state = bucket(d, tabId)
        state.loading = false
        state.failure = undefined
        state.patch = value
      },
      failed: (d, tabId, failure) => {
        const state = bucket(d, tabId)
        state.loading = false
        state.failure = failure
      },
      reset: (d, tabId) => {
        const state = bucket(d, tabId)
        state.loading = false
        state.failure = undefined
        state.patch = undefined
      },
      scrolled: (d, tabId, scrollTop) => {
        const state = d.byTab[tabId]
        if (state !== undefined) state.scrollTop = scrollTop
      },
      forget: (d, tabId) => {
        const byTab: PatchState['byTab'] = {}
        for (const [id, state] of Object.entries(d.byTab) as [TabId, PatchTabState][]) {
          if (id !== tabId) byTab[id] = state
        }
        d.byTab = byTab
      },
    },
  })
}

/** The store handle type declared by the body registration. */
export type PatchStore = ReturnType<typeof createPatchStore>
