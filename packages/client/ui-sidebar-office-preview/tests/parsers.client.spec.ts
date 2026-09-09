// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'

const { convertToHtml } = vi.hoisted(() => ({ convertToHtml: vi.fn() }))
vi.mock('mammoth/mammoth.browser.js', () => ({ default: { convertToHtml } }))

import { parseDocx } from '../src/client/docx-parser.ts'
import { parseXlsx } from '../src/client/xlsx-parser.ts'

describe('office parsers', () => {
  it('sanitizes DOCX HTML and returns parser failures', async () => {
    convertToHtml.mockResolvedValueOnce({ value: '<h1>Report</h1><script>bad()</script>' })
    await expect(parseDocx(new ArrayBuffer(0))).resolves.toEqual({ ok: true, html: '<h1>Report</h1>' })
    convertToHtml.mockRejectedValueOnce(new Error('invalid docx'))
    await expect(parseDocx(new ArrayBuffer(0))).resolves.toEqual({ ok: false, message: 'invalid docx' })
  })

  it('projects bounded worksheet rows and columns', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Name', 'Score'], ['Ada', 10], ['Lin', 9]]), 'Scores')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
    expect(parseXlsx(buffer, { maxRows: 2, maxColumns: 1, maxSheets: 1 })).toEqual({
      ok: true,
      workbook: {
        sheets: [{
          name: 'Scores',
          rows: [['Name'], ['Ada']],
          truncated: true,
        }],
      },
    })
    expect(parseXlsx(new Uint8Array([1, 2, 3]).buffer, { maxRows: 2, maxColumns: 2, maxSheets: 1 }).ok).toBe(false)
  })
})
