import { describe, expect, it } from 'vitest'
import { failureLine, humanBytes, svgFailureOf } from '../src/client/failure-line.ts'
import { t } from './fixtures.client.ts'

describe('SVG preview failure lines', () => {
  it('formats byte counts and preserves remote failure details', () => {
    expect(humanBytes(512)).toBe('512B')
    expect(humanBytes(4096)).toBe('4.0KB')
    expect(humanBytes(3 * 1024 * 1024)).toBe('3.0MB')
    expect(svgFailureOf({ code: 'x', message: 'boom', details: { path: 'a.svg' } }))
      .toEqual({ code: 'x', message: 'boom', details: { path: 'a.svg' } })
  })

  it('maps known failures and falls back to the remote message', () => {
    const known = new Map([
      ['workspace-file/not-found', 'error.notFound'],
      ['workspace-file/outside-workspace', 'error.outsideWorkspace'],
      ['workspace-file/not-regular-file', 'error.notRegularFile'],
      ['svg-preview/incomplete', 'incomplete'],
      ['svg-preview/invalid-utf8', 'invalidUtf8'],
      ['svg-preview/unsafe-content', 'unsafeContent'],
      ['svg-preview/invalid-document', 'invalidDocument'],
    ])
    for (const [code, expected] of known) {
      expect(failureLine(t, { code, message: 'boom', details: {} })).toBe(expected)
    }
    expect(failureLine(t, {
      code: 'workspace-file/too-large',
      message: 'boom',
      details: { limit: 4096 },
    })).toBe('tooLarge(limit=4.0KB)')
    expect(failureLine(t, {
      code: 'svg-preview/too-large',
      message: 'boom',
      details: { limit: 'unknown' },
    })).toBe('tooLarge(limit=0B)')
    expect(failureLine(t, { code: 'other', message: 'bad', details: {} }))
      .toBe('error.unavailable(message=bad)')
  })
})
