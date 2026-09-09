/** Complete office-file reader and Blob URL owner. */
import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ResolvedConfig } from '../index.ts'
import { base64ToBytes, joinBytes } from './media.ts'
import { officeFailureOf, type OfficeFailure } from './failure-line.ts'
import type { OfficeViewer } from './definitions.ts'
import type { OfficeStore, OfficeBinary } from './store.ts'
import type { ReadOfficeBytes, SessionFile } from './rpc.ts'
import { parseDocx } from './docx-parser.ts'
import { parseXlsx } from './xlsx-parser.ts'

/** Injected business face for each office viewer body. */
export interface OfficeInjected {
  /** Read, assemble, and publish one office file. */
  readonly load: (tabId: TabId, viewer: OfficeViewer, file: SessionFile, signal: AbortSignal) => void
  /** Retire the active read and start it again. */
  readonly reload: (tabId: TabId, viewer: OfficeViewer, file: SessionFile, signal: AbortSignal) => void
}

interface TabReads {
  generation: number
}

function tooLarge(limit: number): OfficeFailure {
  return { code: 'office-preview/too-large', message: `office file exceeds ${String(limit)} bytes`, details: { limit } }
}

function incomplete(): OfficeFailure {
  return { code: 'office-preview/incomplete', message: 'office byte stream did not advance', details: {} }
}

function parseFailure(message: string): OfficeFailure {
  return { code: 'office-preview/parse-failed', message, details: {} }
}

/**
 * Bind byte-window reads to a per-tab URL owner.
 * @param readBytes - bounded byte reader.
 * @param config - office size limit.
 * @returns a Slot inject factory.
 */
export function officeFace(
  readBytes: ReadOfficeBytes,
  config: ResolvedConfig,
): (sessionId: SessionId, actions: BoundActions<OfficeStore>) => OfficeInjected {
  return (_sessionId, actions) => {
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

    const reset = (tabId: TabId, viewer: OfficeViewer, signal: AbortSignal): TabReads | undefined => {
      if (signal.aborted) return undefined
      const reads = readsOf(tabId, signal)
      reads.generation += 1
      revoke(tabId)
      actions.reset(tabId, viewer)
      return reads
    }

    const load = (tabId: TabId, viewer: OfficeViewer, file: SessionFile, signal: AbortSignal): void => {
      if (signal.aborted) return
      const reads = readsOf(tabId, signal)
      const { generation } = reads
      actions.loading(tabId, viewer)
      void (async () => {
        let restart = true
        while (restart && !signal.aborted) {
          restart = false
          let offset = 0
          let version = ''
          let versionKnown = false
          let bytes: number | undefined
          const chunks: Uint8Array[] = []
          while (!signal.aborted) {
            const result = await readBytes(file.sessionId, file.path, offset, signal)
            if (signal.aborted || reads.generation !== generation) return
            if (!result.ok) {
              actions.failed(tabId, viewer, officeFailureOf(result.error))
              return
            }
            const value = result.value
            if (value.bytes !== undefined && value.bytes > config.maxOfficeBytes) {
              actions.failed(tabId, viewer, tooLarge(config.maxOfficeBytes))
              return
            }
            if (versionKnown && value.version !== version) {
              restart = true
              break
            }
            version = value.version
            versionKnown = true
            bytes = value.bytes
            const chunk = base64ToBytes(value.data)
            const nextOffset = offset + chunk.byteLength
            if (nextOffset > config.maxOfficeBytes) {
              actions.failed(tabId, viewer, tooLarge(config.maxOfficeBytes))
              return
            }
            chunks.push(chunk)
            if (value.eof) {
              break
            }
            if (nextOffset === offset) {
              actions.failed(tabId, viewer, incomplete())
              return
            }
            offset = nextOffset
          }
          if (restart) continue
          if (reads.generation !== generation) return
          const buffer = joinBytes(chunks)
          if (viewer === 'pdf') {
            const src = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
            revoke(tabId)
            urls.set(tabId, src)
            const binary: OfficeBinary = {
              src,
              version,
              ...bytes === undefined ? {} : { bytes },
            }
            actions.binary(tabId, viewer, binary)
            return
          }
          if (viewer === 'docx') {
            const parsed = await parseDocx(buffer)
            if (signal.aborted || reads.generation !== generation) return
            if (!parsed.ok) {
              actions.failed(tabId, viewer, parseFailure(parsed.message))
              return
            }
            actions.docx(tabId, viewer, { html: parsed.html, version, bytes: bytes ?? buffer.byteLength })
            return
          }
          const parsed = parseXlsx(buffer, {
            maxRows: config.maxSpreadsheetRows,
            maxColumns: config.maxSpreadsheetColumns,
            maxSheets: config.maxSpreadsheetSheets,
          })
          if (reads.generation !== generation) return
          if (!parsed.ok) {
            actions.failed(tabId, viewer, parseFailure(parsed.message))
            return
          }
          actions.xlsx(tabId, viewer, { ...parsed.workbook, version, bytes: bytes ?? buffer.byteLength })
          return
        }
      })().catch((error: unknown) => {
        if (signal.aborted || reads.generation !== generation) return
        actions.failed(tabId, viewer, {
          code: 'office-preview/read-failed',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        })
      })
    }

    const reload = (tabId: TabId, viewer: OfficeViewer, file: SessionFile, signal: AbortSignal): void => {
      const reads = reset(tabId, viewer, signal)
      if (reads !== undefined) load(tabId, viewer, file, signal)
    }

    return { load, reload }
  }
}
