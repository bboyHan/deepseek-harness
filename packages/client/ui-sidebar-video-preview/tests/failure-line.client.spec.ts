import { describe, expect, it } from 'vitest'
import { durationText, failureLine, humanBytes } from '../src/client/failure-line.ts'
import type { VideoFailure } from '../src/client/store.ts'
import { t } from './fixtures.client.ts'

describe('video preview failure and metadata text', () => {
  it('formats byte counts and durations for compact metadata', () => {
    expect(humanBytes(4096)).toBe('4.0KB')
    expect(durationText(Number.NaN)).toBe('')
    expect(durationText(-1)).toBe('')
    expect(durationText(65)).toBe('1:05')
    expect(durationText(3661)).toBe('1:01:01')
  })

  it('maps stable failure codes to localized copy', () => {
    const cases: Array<[VideoFailure, string]> = [
      [{ code: 'video-preview/aborted', message: 'aborted' }, 'errorAborted'],
      [{ code: 'video-preview/network', message: 'network' }, 'errorNetwork'],
      [{ code: 'video-preview/decode', message: 'decode' }, 'errorDecode'],
      [{ code: 'video-preview/unsupported', message: 'unsupported' }, 'errorUnsupported'],
      [{ code: 'video-preview/open-failed', message: 'native failed' }, 'errorOpenFailed(message=native failed)'],
      [{ code: 'video-preview/other', message: 'other failed' }, 'errorUnavailable(message=other failed)'],
    ]
    for (const [failure, line] of cases) expect(failureLine(t, failure)).toBe(line)
  })
})
