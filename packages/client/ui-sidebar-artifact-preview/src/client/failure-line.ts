/** Human-readable failure lines for artifact preview reads. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { fileSizeText } from '@deepseek-ai/dsh-client-ui-primitives'

/** Failure payloads this package stores. */
export interface ArtifactFailure {
  /** Stable failure code. */
  readonly code: string
  /** Fallback message. */
  readonly message: string
  /** Structured details for known codes. */
  readonly details: Record<string, unknown>
}

/**
 * Keep the UI failure payload indexable without depending on a Remote code's detail type.
 * @param failure - failure returned by the Remote layer or created by this package.
 * @returns the failure form stored by artifact previews.
 */
export function artifactFailureOf(failure: { readonly code: string; readonly message: string; readonly details: object }): ArtifactFailure {
  return { code: failure.code, message: failure.message, details: { ...failure.details } }
}

/**
 * Render a byte count the way a person reads one.
 * @param bytes - byte count to format.
 * @returns a compact byte, KB, or MB label.
 */
export function humanBytes(bytes: number): string {
  return fileSizeText(bytes)
}

function detailNumber(failure: ArtifactFailure, key: string): number | undefined {
  const value = failure.details[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * Say what went wrong in terms of the file rather than the transport.
 * @param t - namespace-bound translate.
 * @param failure - the settled failure.
 * @returns the line to show in place of the artifact.
 */
export function failureLine(t: TranslateNS<'sidebarArtifactPreview'>, failure: ArtifactFailure): string {
  switch (failure.code) {
    case 'workspace-file/not-found': return t('error.notFound')
    case 'workspace-file/outside-workspace': return t('error.outsideWorkspace')
    case 'workspace-file/too-large':
      return t('error.tooLarge', { limit: humanBytes(detailNumber(failure, 'limit') ?? 0) })
    case 'workspace-file/not-text': return t('error.notText')
    case 'workspace-file/not-regular-file': return t('error.notRegularFile')
    case 'artifact-preview/image-too-large':
      return t('imageTooLarge', { limit: humanBytes(detailNumber(failure, 'limit') ?? 0) })
    case 'artifact-preview/image-incomplete': return t('imageIncomplete')
    default: return t('error.unavailable', { message: failure.message })
  }
}
