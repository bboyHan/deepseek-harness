/** Store state for video preview tabs. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'

/** Failure payload stored by a video tab. */
export interface VideoFailure {
  /** Stable failure code. */
  readonly code: string
  /** Fallback diagnostic message. */
  readonly message: string
}

/** Video metadata reported by the browser once available. */
export interface VideoMetadata {
  /** Duration in seconds. */
  readonly duration?: number
  /** Intrinsic video width in CSS pixels. */
  readonly width?: number
  /** Intrinsic video height in CSS pixels. */
  readonly height?: number
}

/** Source URL and revision for one video element. */
export interface VideoSource {
  /** Same-origin HTTP URL served by the Host route. */
  readonly src: string
  /** Monotonic reload revision. */
  readonly revision: number
}

/** One tab's loaded video state. */
export interface VideoTabState {
  /** The video element has not reported metadata or failure for the current source. */
  loading: boolean
  /** A native open request is in flight. */
  opening: boolean
  /** Why the current source failed. */
  failure: VideoFailure | undefined
  /** Source URL held by the video element. */
  source: VideoSource
  /** Browser-reported media metadata. */
  metadata: VideoMetadata | undefined
}

/** Every video tab's state, keyed by tab id. */
export interface VideoState {
  byTab: Record<TabId, VideoTabState>
}

type VideoActions = {
  load: (draft: VideoState, tabId: TabId, src: string) => void
  reload: (draft: VideoState, tabId: TabId, src: string) => void
  metadata: (draft: VideoState, tabId: TabId, metadata: VideoMetadata) => void
  failed: (draft: VideoState, tabId: TabId, failure: VideoFailure) => void
  opening: (draft: VideoState, tabId: TabId) => void
  opened: (draft: VideoState, tabId: TabId) => void
  forget: (draft: VideoState, tabId: TabId) => void
}

/**
 * Declare the video preview store.
 * @returns store handle used by the video body registration.
 */
export function createVideoStore(): EngineStoreHandle<VideoState, VideoActions> {
  return defineStore({
    init: (): VideoState => ({ byTab: {} }),
    actions: {
      load: (d, tabId, src) => {
        d.byTab[tabId] = {
          loading: true,
          opening: false,
          failure: undefined,
          source: { src, revision: 0 },
          metadata: undefined,
        }
      },
      reload: (d, tabId, src) => {
        const current = d.byTab[tabId]
        d.byTab[tabId] = {
          loading: true,
          opening: current?.opening ?? false,
          failure: undefined,
          source: { src, revision: (current?.source.revision ?? 0) + 1 },
          metadata: undefined,
        }
      },
      metadata: (d, tabId, metadata) => {
        const current = d.byTab[tabId]
        if (current === undefined) return
        current.loading = false
        current.failure = undefined
        current.metadata = metadata
      },
      failed: (d, tabId, failure) => {
        const current = d.byTab[tabId]
        if (current === undefined) return
        current.loading = false
        current.failure = failure
      },
      opening: (d, tabId) => {
        const current = d.byTab[tabId]
        if (current !== undefined) current.opening = true
      },
      opened: (d, tabId) => {
        const current = d.byTab[tabId]
        if (current !== undefined) current.opening = false
      },
      forget: (d, tabId) => {
        const byTab: VideoState['byTab'] = {}
        for (const [id, state] of Object.entries(d.byTab) as [TabId, VideoTabState][]) {
          if (id !== tabId) byTab[id] = state
        }
        d.byTab = byTab
      },
    },
  })
}

/** The store handle type declared by the body registration. */
export type VideoStore = ReturnType<typeof createVideoStore>
