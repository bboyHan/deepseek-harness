/** Per-tab state for PDF, DOCX, and XLSX office previews. */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { OfficeFailure } from './failure-line.ts'
import type { OfficeViewer } from './definitions.ts'

/** Parsed PDF or source document bytes held by one tab. */
export interface OfficeBinary {
  /** Blob URL owned by the read face. */
  readonly src: string
  /** File version used to produce the Blob. */
  readonly version: string
  /** Complete byte size when reported. */
  readonly bytes?: number
}

/** Sanitized DOCX HTML held by one tab. */
export interface OfficeDocx {
  /** Sanitized HTML converted from the DOCX package. */
  readonly html: string
  /** File version used to produce the conversion. */
  readonly version: string
  /** Complete byte size used for the conversion. */
  readonly bytes?: number
}

/** One worksheet's bounded display rows. */
export interface OfficeSheet {
  /** Worksheet name. */
  readonly name: string
  /** Display rows and cells. */
  readonly rows: readonly (readonly string[]) []
  /** Whether the configured row or column cap omitted cells. */
  readonly truncated: boolean
}

/** Parsed XLSX workbook held by one tab. */
export interface OfficeWorkbook {
  /** Bounded worksheet display data. */
  readonly sheets: readonly OfficeSheet[]
  /** File version used to produce the workbook. */
  readonly version: string
  /** Complete byte size used for the projection. */
  readonly bytes?: number
}

/** Loaded data for one office tab. */
export interface OfficeTabState {
  /** Viewer bucket that owns the tab. */
  viewer: OfficeViewer
  /** A byte read or parser is active. */
  loading: boolean
  /** Last read or parser failure. */
  failure: OfficeFailure | undefined
  /** PDF source URL. */
  source: OfficeBinary | undefined
  /** Converted DOCX document. */
  docx: OfficeDocx | undefined
  /** Parsed XLSX workbook. */
  xlsx: OfficeWorkbook | undefined
}

/** Store state keyed by tab id. */
export interface OfficeState {
  byTab: Record<TabId, OfficeTabState>
}

/**
 * Create an empty bucket for one viewer.
 * @param viewer - office viewer that owns the bucket.
 * @returns one empty office tab state.
 */
export function fresh(viewer: OfficeViewer): OfficeTabState {
  return { viewer, loading: false, failure: undefined, source: undefined, docx: undefined, xlsx: undefined }
}

function bucket(state: OfficeState, tabId: TabId, viewer: OfficeViewer): OfficeTabState {
  const held = state.byTab[tabId]
  if (held !== undefined && held.viewer === viewer) return held
  const created = fresh(viewer)
  state.byTab[tabId] = created
  return created
}

type OfficeActions = {
  loading: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer) => void
  binary: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer, value: OfficeBinary) => void
  docx: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer, value: OfficeDocx) => void
  xlsx: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer, value: OfficeWorkbook) => void
  failed: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer, failure: OfficeFailure) => void
  reset: (draft: OfficeState, tabId: TabId, viewer: OfficeViewer) => void
  forget: (draft: OfficeState, tabId: TabId) => void
}

/**
 * Declare the office preview store.
 * @returns store handle shared by the office tab body registrations.
 */
export function createOfficeStore(): EngineStoreHandle<OfficeState, OfficeActions> {
  return defineStore({
    init: (): OfficeState => ({ byTab: {} }),
    actions: {
      loading: (d, tabId: TabId, viewer: OfficeViewer) => {
        const state = bucket(d, tabId, viewer)
        state.loading = true
        state.failure = undefined
      },
      binary: (d, tabId: TabId, viewer: OfficeViewer, value: OfficeBinary) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.source = value
        state.docx = undefined
        state.xlsx = undefined
      },
      docx: (d, tabId: TabId, viewer: OfficeViewer, value: OfficeDocx) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.source = undefined
        state.docx = value
        state.xlsx = undefined
      },
      xlsx: (d, tabId: TabId, viewer: OfficeViewer, value: OfficeWorkbook) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.source = undefined
        state.docx = undefined
        state.xlsx = value
      },
      failed: (d, tabId: TabId, viewer: OfficeViewer, failure: OfficeFailure) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = failure
      },
      reset: (d, tabId: TabId, viewer: OfficeViewer) => {
        const state = bucket(d, tabId, viewer)
        state.loading = false
        state.failure = undefined
        state.source = undefined
        state.docx = undefined
        state.xlsx = undefined
      },
      forget: (d, tabId: TabId) => {
        const byTab: OfficeState['byTab'] = {}
        for (const [id, state] of Object.entries(d.byTab) as [TabId, OfficeTabState][]) {
          if (id !== tabId) byTab[id] = state
        }
        d.byTab = byTab
      },
    },
  })
}

/** Store handle type used by the Slot registration. */
export type OfficeStore = ReturnType<typeof createOfficeStore>
