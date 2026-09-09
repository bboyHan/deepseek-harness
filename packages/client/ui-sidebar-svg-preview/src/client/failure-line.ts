/** Human-readable failure lines for SVG preview reads. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { fileSizeText } from '@deepseek-ai/dsh-client-ui-primitives'

/** Failure payloads stored by the SVG preview. */
export interface SvgFailure {
  /** Stable failure code. */
  readonly code: string
  /** Fallback message. */
  readonly message: string
  /** Structured details for known codes. */
  readonly details: Record<string, unknown>
}

/**
 * Copy a Remote failure into the preview store.
 * @param failure - failure returned by the Remote layer or parser.
 * @returns the failure payload stored by SVG previews.
 */
export function svgFailureOf(failure: { readonly code: string; readonly message: string; readonly details: object }): SvgFailure {
  return { code: failure.code, message: failure.message, details: { ...failure.details } }
}

/**
 * Format a byte count for a status line.
 * @param bytes - byte count to format.
 * @returns a compact byte, KB, or MB label.
 */
export function humanBytes(bytes: number): string {
  return fileSizeText(bytes)
}

function detailNumber(failure: SvgFailure, key: string): number | undefined {
  const value = failure.details[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Convert a stored failure into localized text.
 * @param t - namespace-bound translator.
 * @param failure - stored failure.
 * @returns localized failure text.
 */
export function failureLine(t: TranslateNS<'sidebarSvgPreview'>, failure: SvgFailure): string {
  switch (failure.code) {
    case 'workspace-file/not-found': return t('error.notFound')
    case 'workspace-file/outside-workspace': return t('error.outsideWorkspace')
    case 'workspace-file/too-large':
    case 'svg-preview/too-large':
      return t('tooLarge', { limit: humanBytes(detailNumber(failure, 'limit') ?? 0) })
    case 'workspace-file/not-regular-file': return t('error.notRegularFile')
    case 'svg-preview/incomplete': return t('incomplete')
    case 'svg-preview/invalid-utf8': return t('invalidUtf8')
    case 'svg-preview/unsafe-content': return t('unsafeContent')
    case 'svg-preview/invalid-document': return t('invalidDocument')
    default: return t('error.unavailable', { message: failure.message })
  }
}
