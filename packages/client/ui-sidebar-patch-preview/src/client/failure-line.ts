/** Human-readable failure lines for patch preview reads and parsing. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'

/** Failure payload kept by the patch store. */
export interface PatchFailure {
  /** Stable failure code. */
  readonly code: string
  /** Fallback message. */
  readonly message: string
  /** Structured details for known codes. */
  readonly details: Record<string, unknown>
}

/**
 * Convert a Remote failure or parser failure into store state.
 * @param failure - failure fields produced by the workspace-files Remote or parser.
 * @returns the failure payload stored for the tab.
 */
export function patchFailureOf(failure: { readonly code: string; readonly message: string; readonly details?: object }): PatchFailure {
  return {
    code: failure.code,
    message: failure.message,
    details: failure.details === undefined ? {} : { ...failure.details },
  }
}

/**
 * Render one failure in file terms.
 * @param t - namespace-bound translator.
 * @param failure - the settled failure.
 * @returns the localized failure line.
 */
export function failureLine(t: TranslateNS<'sidebarPatchPreview'>, failure: PatchFailure): string {
  switch (failure.code) {
    case 'workspace-file/not-found': return t('error.notFound')
    case 'workspace-file/outside-workspace': return t('error.outsideWorkspace')
    case 'workspace-file/too-large': return t('error.tooLarge')
    case 'workspace-file/not-text': return t('error.notText')
    case 'workspace-file/not-regular-file': return t('error.notRegularFile')
    case 'patch-preview/invalid-patch': return t('invalidPatch', { message: failure.message })
    case 'patch-preview/hunk-limit': return t('hunkLimit')
    default: return t('error.unavailable', { message: failure.message })
  }
}
