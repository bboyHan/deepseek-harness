/** Human-readable failure lines for office preview reads and parsers. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { fileSizeText } from '@deepseek-ai/dsh-client-ui-primitives'

/** Failure payload stored by an office tab. */
export interface OfficeFailure {
  /** Stable failure code. */
  readonly code: string
  /** Fallback diagnostic message. */
  readonly message: string
  /** Structured details for known failures. */
  readonly details: Record<string, unknown>
}

/**
 * Copy a Remote failure into the office store's stable form.
 * @param failure - failure returned by the Remote layer or parser.
 * @returns the failure payload stored by office previews.
 */
export function officeFailureOf(failure: { readonly code: string; readonly message: string; readonly details: object }): OfficeFailure {
  return { code: failure.code, message: failure.message, details: { ...failure.details } }
}

function detailNumber(failure: OfficeFailure, key: string): number | undefined {
  const value = failure.details[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Format a file size for compact preview metadata and failures. */
export function humanBytes(bytes: number): string {
  return fileSizeText(bytes)
}

/**
 * Convert a failure into localized user-facing copy.
 * @param t - office locale translator.
 * @param failure - stored failure.
 * @returns localized failure line.
 */
export function failureLine(t: TranslateNS<'sidebarOfficePreview'>, failure: OfficeFailure): string {
  switch (failure.code) {
    case 'workspace-file/not-found': return t('errorNotFound')
    case 'workspace-file/outside-workspace': return t('errorOutsideWorkspace')
    case 'workspace-file/too-large': return t('errorTooLarge', { limit: humanBytes(detailNumber(failure, 'limit') ?? 0) })
    case 'workspace-file/not-regular-file': return t('errorNotRegularFile')
    case 'office-preview/too-large': return t('tooLarge', { limit: humanBytes(detailNumber(failure, 'limit') ?? 0) })
    case 'office-preview/incomplete': return t('incomplete')
    case 'office-preview/empty': return t('empty')
    case 'office-preview/parse-failed': return t('parseFailed', { message: failure.message })
    default: return t('errorUnavailable', { message: failure.message })
  }
}
