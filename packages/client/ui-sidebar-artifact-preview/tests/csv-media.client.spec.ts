import { describe, expect, it } from 'vitest'
import { parseDelimited } from '../src/client/csv.ts'
import { base64ToBytes, imageMimeType, joinBytes } from '../src/client/media.ts'

describe('delimited table parsing', () => {
  it('parses CSV and TSV pages with quoted delimiters and line breaks', () => {
    expect(parseDelimited('name,count\n"a,b","1"\n"two\nlines",2', ',')).toEqual({
      rows: [['name', 'count'], ['a,b', '1'], ['two\nlines', '2']],
      columns: 2,
    })
    expect(parseDelimited('a\tb\r\nc\td', '\t')).toEqual({ rows: [['a', 'b'], ['c', 'd']], columns: 2 })
  })

  it('keeps empty input empty and escaped quotes literal', () => {
    expect(parseDelimited('', ',')).toEqual({ rows: [], columns: 0 })
    expect(parseDelimited('"a""b"', ',')).toEqual({ rows: [['a"b']], columns: 1 })
  })
})

describe('image byte helpers', () => {
  it('infers browser image MIME types from file paths', () => {
    expect(imageMimeType('/tmp/a.PNG')).toBe('image/png')
    expect(imageMimeType('/tmp/a.jpeg')).toBe('image/jpeg')
    expect(imageMimeType('/tmp/a.unknown')).toBe('application/octet-stream')
  })

  it('decodes and joins byte chunks as one ArrayBuffer', () => {
    const joined = new Uint8Array(joinBytes([base64ToBytes('YWI='), base64ToBytes('Yw==')]))
    expect(Array.from(joined)).toEqual([97, 98, 99])
  })
})
