import { describe, expect, it } from 'vitest'
import { failureLine, patchFailureOf } from '../src/client/failure-line.ts'
import { t } from './fixtures.client.ts'

describe('patch preview failure lines', () => {
  it('keeps failure details and maps known codes to locale keys', () => {
    expect(patchFailureOf({ code: 'x', message: 'boom' })).toEqual({ code: 'x', message: 'boom', details: {} })
    const known = new Map([
      ['workspace-file/not-found', 'error.notFound'],
      ['workspace-file/outside-workspace', 'error.outsideWorkspace'],
      ['workspace-file/too-large', 'error.tooLarge'],
      ['workspace-file/not-text', 'error.notText'],
      ['workspace-file/not-regular-file', 'error.notRegularFile'],
      ['patch-preview/hunk-limit', 'hunkLimit'],
    ])
    for (const [code, expected] of known) {
      expect(failureLine(t, { code, message: 'boom', details: {} })).toBe(expected)
    }
    expect(failureLine(t, { code: 'patch-preview/invalid-patch', message: 'bad', details: {} }))
      .toBe('invalidPatch(message=bad)')
    expect(failureLine(t, { code: 'other', message: 'bad', details: {} })).toBe('error.unavailable(message=bad)')
  })
})
