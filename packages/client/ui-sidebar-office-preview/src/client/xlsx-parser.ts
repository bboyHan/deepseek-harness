/** XLSX parsing and bounded worksheet projection. */
import * as XLSX from 'xlsx/dist/xlsx.mini.min.js'
import type { OfficeSheet, OfficeWorkbook } from './store.ts'

/** Bounded XLSX parse result. */
export type XlsxParseResult =
  | { readonly ok: true; readonly workbook: Omit<OfficeWorkbook, 'version'> }
  | { readonly ok: false; readonly message: string }

function cellTextOf(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value)
}

/**
 * Parse a workbook while bounding sheets, rows, and columns before rendering.
 * @param buffer - complete XLSX bytes.
 * @param limits - display limits.
 * @returns bounded workbook or a parser failure.
 */
export function parseXlsx(buffer: ArrayBuffer, limits: {
  readonly maxRows: number
  readonly maxColumns: number
  readonly maxSheets: number
}): XlsxParseResult {
  try {
    const signature = new Uint8Array(buffer)
    if (signature.length < 4 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
      return { ok: false, message: 'the file is not an XLSX package' }
    }
    const workbook = XLSX.read(buffer, { type: 'array', cellText: true, cellDates: true })
    const sheets: OfficeSheet[] = []
    for (const name of workbook.SheetNames.slice(0, limits.maxSheets)) {
      const sheet = workbook.Sheets[name]
      if (sheet === undefined) continue
      const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1')
      const rows: string[][] = []
      const rowEnd = Math.min(range.e.r, range.s.r + limits.maxRows - 1)
      const colEnd = Math.min(range.e.c, range.s.c + limits.maxColumns - 1)
      for (let row = range.s.r; row <= rowEnd; row += 1) {
        const cells: string[] = []
        for (let column = range.s.c; column <= colEnd; column += 1) {
          const address = XLSX.utils.encode_cell({ r: row, c: column })
          const cell = sheet[address] as { readonly w?: unknown; readonly v?: unknown } | undefined
          cells.push(cellTextOf(cell?.w ?? cell?.v))
        }
        rows.push(cells)
      }
      sheets.push({
        name,
        rows,
        truncated: range.e.r - range.s.r + 1 > limits.maxRows || range.e.c - range.s.c + 1 > limits.maxColumns,
      })
    }
    return { ok: true, workbook: { sheets } }
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}
