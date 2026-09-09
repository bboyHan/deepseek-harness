/** Human-readable failure lines for video previews. */
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import { fileSizeText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { VideoFailure } from './store.ts'

/**
 * Format a file size for compact preview metadata and failures.
 * @param bytes - byte count to display.
 * @returns localized compact size text.
 */
export function humanBytes(bytes: number): string {
  return fileSizeText(bytes)
}

/**
 * Format duration seconds for preview metadata.
 * @param seconds - media duration in seconds.
 * @returns `m:ss` or `h:mm:ss`, or an empty string for invalid durations.
 */
export function durationText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const rounded = Math.round(seconds)
  const h = Math.floor(rounded / 3600)
  const m = Math.floor((rounded % 3600) / 60)
  const s = rounded % 60
  if (h > 0) return `${String(h)}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m)}:${String(s).padStart(2, '0')}`
}

/**
 * Convert a failure into localized user-facing copy.
 * @param t - video locale translator.
 * @param failure - stored failure.
 * @returns localized failure line.
 */
export function failureLine(t: TranslateNS<'sidebarVideoPreview'>, failure: VideoFailure): string {
  switch (failure.code) {
    case 'video-preview/aborted': return t('errorAborted')
    case 'video-preview/network': return t('errorNetwork')
    case 'video-preview/decode': return t('errorDecode')
    case 'video-preview/unsupported': return t('errorUnsupported')
    case 'video-preview/open-failed': return t('errorOpenFailed', { message: failure.message })
    default: return t('errorUnavailable', { message: failure.message })
  }
}
