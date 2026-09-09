/** Store state for the artifact preview tab bodies. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { ArtifactFailure } from './failure-line.ts'
import type { ArtifactViewer } from './definitions.ts'

/** Successful text read kept by Markdown, JSON, and CSV viewers. */
export interface ArtifactText {
  /** Text from the first Host page. */
  readonly text: string
  /** Host page line count. */
  readonly lines: number
  /** Whether the first page reached the file's end. */
  readonly eof: boolean
  /** File version the text belongs to. */
  readonly version: string
  /** Byte size of the complete file, when the backend reports it. */
  readonly bytes?: number
}

/** Successful image read kept by the image viewer. */
export interface ArtifactImage {
  /** Blob URL owned by the preview face. */
  readonly src: string
  /** Browser media type assigned to the Blob. */
  readonly mime: string
  /** Complete byte size when known. */
  readonly bytes?: number
  /** File version the image belongs to. */
  readonly version: string
}

/** One tab's loaded content and view state. */
export interface ArtifactTabState {
  /** Which viewer started this bucket. */
  viewer: ArtifactViewer
  /** A read is in flight. */
  loading: boolean
  /** Why the last read failed; cleared by the next successful read. */
  failure: ArtifactFailure | undefined
  /** First text page for Markdown, JSON, and CSV viewers. */
  text: ArtifactText | undefined
  /** Complete image URL for the image viewer. */
  image: ArtifactImage | undefined
  /** Scroll offset of the body, in px. */
  scrollTop: number
}

/** Every tab's state, keyed by tab id. */
export interface ArtifactState {
  byTab: Record<TabId, ArtifactTabState>
}

/**
 * Create the tab's empty bucket.
 * @param viewer - artifact viewer that owns the bucket.
 * @returns one empty artifact tab state.
 */
export function fresh(viewer: ArtifactViewer): ArtifactTabState {
  return {
    viewer,
    loading: false,
    failure: undefined,
    text: undefined,
    image: undefined,
    scrollTop: 0,
  }
}

function bucket(state: ArtifactState, tabId: TabId, viewer: ArtifactViewer): ArtifactTabState {
  const held = state.byTab[tabId]
  if (held !== undefined && held.viewer === viewer) return held
  const created = fresh(viewer)
  state.byTab[tabId] = created
  return created
}

/** The preview store's write set; every action names the tab it writes. */
type ArtifactActions = {
  loading: (draft: ArtifactState, tabId: TabId, viewer: ArtifactViewer) => void
  text: (draft: ArtifactState, tabId: TabId, viewer: ArtifactViewer, page: WorkspaceFileText) => void
  image: (draft: ArtifactState, tabId: TabId, viewer: ArtifactViewer, image: ArtifactImage) => void
  failed: (draft: ArtifactState, tabId: TabId, viewer: ArtifactViewer, failure: ArtifactFailure) => void
  reset: (draft: ArtifactState, tabId: TabId, viewer: ArtifactViewer) => void
  scrolled: (draft: ArtifactState, tabId: TabId, scrollTop: number) => void
  forget: (draft: ArtifactState, tabId: TabId) => void
}

/**
 * Declare the preview's store.
 * @returns the store handle to declare on each viewer body registration.
 */
export function createArtifactStore(): EngineStoreHandle<ArtifactState, ArtifactActions> {
  return defineStore({
    init: (): ArtifactState => ({ byTab: {} }),
    actions: {
      loading: (d, tabId: TabId, viewer: ArtifactViewer) => {
        const state = bucket(d, tabId, viewer)
        state.loading = true
        state.failure = undefined
      },
      text: (d, tabId: TabId, viewer: ArtifactViewer, page: WorkspaceFileText) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.image = undefined
        state.text = {
          text: page.text,
          lines: page.lines,
          eof: page.eof,
          version: page.version,
          ...page.bytes === undefined ? {} : { bytes: page.bytes },
        }
      },
      image: (d, tabId: TabId, viewer: ArtifactViewer, image: ArtifactImage) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.text = undefined
        state.image = image
      },
      failed: (d, tabId: TabId, viewer: ArtifactViewer, failure: ArtifactFailure) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = failure
      },
      reset: (d, tabId: TabId, viewer: ArtifactViewer) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.text = undefined
        state.image = undefined
      },
      scrolled: (d, tabId: TabId, scrollTop: number) => {
        const state = d.byTab[tabId]
        if (state !== undefined) state.scrollTop = scrollTop
      },
      forget: (d, tabId: TabId) => {
        const byTab: ArtifactState['byTab'] = {}
        for (const [id, state] of Object.entries(d.byTab) as [TabId, ArtifactTabState][]) {
          if (id !== tabId) byTab[id] = state
        }
        d.byTab = byTab
      },
    },
  })
}

/** The store handle type each registration declares. */
export type ArtifactStore = ReturnType<typeof createArtifactStore>
