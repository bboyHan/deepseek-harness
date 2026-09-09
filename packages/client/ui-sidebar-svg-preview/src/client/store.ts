/** Store state for SVG preview tabs. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SvgFailure } from './failure-line.ts'
import type { SvgWarning } from './sanitize.ts'

/** Sanitized SVG successfully loaded for one tab. */
export interface SvgDocument {
  /** Blob URL owned by the preview face. */
  readonly src: string
  /** Complete file size. */
  readonly bytes: number
  /** File version the document belongs to. */
  readonly version: string
  /** Non-fatal content changes applied before rendering. */
  readonly warnings: readonly SvgWarning[]
}

/** One tab's loaded SVG and view state. */
export interface SvgTabState {
  /** A read is in flight. */
  loading: boolean
  /** Why the last read failed. */
  failure: SvgFailure | undefined
  /** Sanitized SVG Blob URL. */
  document: SvgDocument | undefined
  /** Scroll offset of the body, in px. */
  scrollTop: number
}

/** Every SVG tab's state, keyed by tab id. */
export interface SvgState {
  byTab: Record<TabId, SvgTabState>
}

/**
 * Create an empty tab bucket.
 * @returns one empty SVG tab state.
 */
export function fresh(): SvgTabState {
  return { loading: false, failure: undefined, document: undefined, scrollTop: 0 }
}

function bucket(state: SvgState, tabId: TabId): SvgTabState {
  const held = state.byTab[tabId]
  if (held !== undefined) return held
  const created = fresh()
  state.byTab[tabId] = created
  return created
}

/** Actions exposed to the SVG preview body and face. */
type SvgActions = {
  loading: (draft: SvgState, tabId: TabId) => void
  document: (draft: SvgState, tabId: TabId, document: SvgDocument) => void
  failed: (draft: SvgState, tabId: TabId, failure: SvgFailure) => void
  reset: (draft: SvgState, tabId: TabId) => void
  scrolled: (draft: SvgState, tabId: TabId, scrollTop: number) => void
  forget: (draft: SvgState, tabId: TabId) => void
}

/**
 * Declare the SVG preview store.
 * @returns store handle used by the SVG body registration.
 */
export function createSvgStore(): EngineStoreHandle<SvgState, SvgActions> {
  return defineStore({
    init: (): SvgState => ({ byTab: {} }),
    actions: {
      loading: (d, tabId) => {
        const state = bucket(d, tabId)
        state.loading = true
        state.failure = undefined
      },
      document: (d, tabId, document) => {
        const state = bucket(d, tabId)
        state.loading = false
        state.failure = undefined
        state.document = document
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
        state.document = undefined
      },
      scrolled: (d, tabId, scrollTop) => {
        const state = d.byTab[tabId]
        if (state !== undefined) state.scrollTop = scrollTop
      },
      forget: (d, tabId) => {
        const byTab: SvgState['byTab'] = {}
        for (const [id, state] of Object.entries(d.byTab) as [TabId, SvgTabState][]) {
          if (id !== tabId) byTab[id] = state
        }
        d.byTab = byTab
      },
    },
  })
}

/** The store handle type declared by each body registration. */
export type SvgStore = ReturnType<typeof createSvgStore>
