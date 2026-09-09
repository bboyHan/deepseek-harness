/** Complete SVG reader, sanitizer, and Blob URL owner. */
import type { BoundActions } from '@deepseek-ai/dsh-client-store'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ResolvedConfig } from '../index.ts'
import { base64ToBytes, joinBytes } from './media.ts'
import { svgFailureOf, type SvgFailure } from './failure-line.ts'
import type { SvgStore } from './store.ts'
import type { ReadSvgBytes, SessionFile } from './rpc.ts'
import { sanitizeSvg } from './sanitize.ts'

/** Injected business face for the SVG viewer body. */
export interface SvgInjected {
  /** Read, sanitize, and publish one SVG document. */
  readonly load: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
  /** Retire the active read and start it again. */
  readonly reload: (tabId: TabId, file: SessionFile, signal: AbortSignal) => void
}

interface TabReads {
  generation: number
}

function tooLarge(limit: number): SvgFailure {
  return { code: 'svg-preview/too-large', message: `SVG exceeds ${String(limit)} bytes`, details: { limit } }
}

function incomplete(): SvgFailure {
  return { code: 'svg-preview/incomplete', message: 'SVG byte stream did not advance', details: {} }
}

function invalidUtf8(): SvgFailure {
  return { code: 'svg-preview/invalid-utf8', message: 'SVG is not valid UTF-8', details: {} }
}

/**
 * Bind byte-window reads to per-tab sanitization and Blob URL ownership.
 * @param readBytes - bounded byte reader.
 * @param config - SVG size limit.
 * @returns a Slot inject factory.
 */
export function svgFace(
  readBytes: ReadSvgBytes,
  config: ResolvedConfig,
): (sessionId: SessionId, actions: BoundActions<SvgStore>) => SvgInjected {
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

    const reset = (tabId: TabId, signal: AbortSignal): TabReads | undefined => {
      if (signal.aborted) return undefined
      const reads = readsOf(tabId, signal)
      reads.generation += 1
      revoke(tabId)
      actions.reset(tabId)
      return reads
    }

    const load = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      if (signal.aborted) return
      const reads = readsOf(tabId, signal)
      const { generation } = reads
      const retired = (): boolean => signal.aborted || reads.generation !== generation
      actions.loading(tabId)
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
            if (retired()) return
            if (!result.ok) {
              actions.failed(tabId, svgFailureOf(result.error))
              return
            }
            const value = result.value
            if (value.bytes !== undefined && value.bytes > config.maxSvgBytes) {
              actions.failed(tabId, tooLarge(config.maxSvgBytes))
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
            if (nextOffset > config.maxSvgBytes) {
              actions.failed(tabId, tooLarge(config.maxSvgBytes))
              return
            }
            chunks.push(chunk)
            if (value.eof) {
              const buffer = joinBytes(chunks)
              let source: string
              try {
                source = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
              } catch {
                actions.failed(tabId, invalidUtf8())
                return
              }
              const sanitized = sanitizeSvg(source, config.externalResourcePolicy)
              if (!sanitized.ok) {
                actions.failed(tabId, {
                  code: `svg-preview/${sanitized.code}`,
                  message: sanitized.message,
                  details: {},
                })
                return
              }
              const src = URL.createObjectURL(new Blob([sanitized.value], { type: 'image/svg+xml' }))
              revoke(tabId)
              urls.set(tabId, src)
              actions.document(tabId, {
                src,
                version: value.version,
                bytes: bytes ?? buffer.byteLength,
                warnings: sanitized.warnings,
              })
              return
            }
            if (nextOffset === offset) {
              actions.failed(tabId, incomplete())
              return
            }
            offset = nextOffset
          }
        }
      })().catch((error: unknown) => {
        if (retired()) return
        actions.failed(tabId, {
          code: 'svg-preview/read-failed',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        })
      })
    }

    const reload = (tabId: TabId, file: SessionFile, signal: AbortSignal): void => {
      const reads = reset(tabId, signal)
      if (reads !== undefined) load(tabId, file, signal)
    }

    return { load, reload }
  }
}
