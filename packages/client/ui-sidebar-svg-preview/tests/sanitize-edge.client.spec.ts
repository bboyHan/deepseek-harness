// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

const sanitize = vi.hoisted(() => vi.fn())
vi.mock('dompurify', () => ({ default: { sanitize } }))

import { sanitizeSvg } from '../src/client/sanitize.ts'

describe('SVG sanitization edge cases', () => {
  it('rejects a sanitizer result that no longer has an SVG root', () => {
    sanitize.mockReturnValue('<div />')
    expect(sanitizeSvg('<svg />')).toMatchObject({ ok: false, code: 'invalid-document' })
  })
})
