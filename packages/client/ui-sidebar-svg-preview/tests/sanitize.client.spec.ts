// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sanitizeSvg } from '../src/client/sanitize.ts'

describe('SVG sanitization', () => {
  it('keeps ordinary SVG content', () => {
    const result = sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="red"/></svg>')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('<rect')
  })

  it('keeps the document while removing active content and external references', () => {
    const active = sanitizeSvg('<svg><script>alert(1)</script><rect onclick="alert(1)" /></svg>')
    expect(active).toMatchObject({
      ok: true,
      warnings: ['active-content-removed'],
    })
    if (active.ok) expect(active.value).toContain('<rect')
    const external = sanitizeSvg('<svg><image href="https://example.com/a.png" /><rect /></svg>', 'strip')
    expect(external).toMatchObject({
      ok: true,
      warnings: ['external-resources-removed'],
    })
    if (external.ok) expect(external.value).toContain('<rect')
    const styled = sanitizeSvg('<svg><style>.x { fill: red }</style><rect class="x" fill="url(https://example.com/#paint)" /></svg>', 'strip')
    expect(styled).toMatchObject({
      ok: true,
      warnings: ['external-resources-removed'],
    })
    if (styled.ok) {
      expect(styled.value).toContain('<style>.x { fill: red }</style>')
      expect(styled.value).toContain('fill="none"')
    }
    expect(sanitizeSvg('<svg><use href="#local" /></svg>')).toMatchObject({ ok: true, warnings: [] })
  })

  it('can preserve HTTPS resources when explicitly configured', () => {
    const result = sanitizeSvg('<svg><image href="https://example.com/a.png" /><rect fill="url(https://example.com/#paint)" /></svg>', 'allow')
    expect(result).toMatchObject({
      ok: true,
      warnings: ['external-resources-loaded'],
    })
    if (result.ok) expect(result.value).toContain('https://example.com/a.png')
  })

  it('preserves HTTPS resources by default and reports the network load', () => {
    expect(sanitizeSvg('<svg><image href="https://example.com/a.png" /></svg>')).toMatchObject({
      ok: true,
      warnings: ['external-resources-loaded'],
    })
  })

  it('removes non-HTTP references while retaining local fragments', () => {
    const result = sanitizeSvg([
      '<svg>',
      '<use href="#local" />',
      '<image href="data:image/png;base64,AAAA" />',
      '<image href="javascript:alert(1)" />',
      '<image href="file:///tmp/image.png" />',
      '<rect fill="url(#localPaint)" />',
      '<rect fill="url(//example.com/paint)" />',
      '</svg>',
    ].join(''), 'allow')
    expect(result).toMatchObject({ ok: true, warnings: ['external-resources-removed'] })
    if (result.ok) {
      expect(result.value).toContain('href="#local"')
      expect(result.value).toContain('fill="url(#localPaint)"')
      expect(result.value).not.toContain('data:image')
      expect(result.value).not.toContain('javascript:')
      expect(result.value).not.toContain('file:///')
      expect(result.value).not.toContain('//example.com/paint')
    }
  })

  it('keeps a valid SVG root when all content that needed removal is unsafe', () => {
    const result = sanitizeSvg('<svg><script>bad()</script><style>@import url(https://example.com/x.css);</style></svg>')
    expect(result).toMatchObject({ ok: true, warnings: ['active-content-removed'] })
    if (result.ok) expect(result.value).toMatch(/^<svg[^>]*><\/svg>$/u)
  })

  it('rejects documents without an SVG root', () => {
    expect(sanitizeSvg('<html></html>')).toMatchObject({ ok: false, code: 'invalid-document' })
    expect(sanitizeSvg('<!DOCTYPE svg><svg />')).toMatchObject({ ok: false, code: 'invalid-document' })
    expect(sanitizeSvg('<svg><')).toMatchObject({ ok: false, code: 'invalid-document' })
  })
})
