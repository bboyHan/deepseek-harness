/** Small CSV/TSV parser for sidebar previews. */

/** Parsed rows and the displayed column count. */
export interface DelimitedTable {
  /** Rows in file order. */
  readonly rows: readonly (readonly string[])[]
  /** Largest cell count across the parsed rows. */
  readonly columns: number
}

/**
 * Parse delimiter-separated text with RFC4180-style quotes.
 * @param text - complete text page to parse.
 * @param delimiter - cell separator.
 * @returns parsed rows in order.
 */
export function parseDelimited(text: string, delimiter: ',' | '\t'): DelimitedTable {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let index = 0
  const pushCell = (): void => {
    row.push(cell)
    cell = ''
  }
  const pushRow = (): void => {
    pushCell()
    rows.push(row)
    row = []
  }
  while (index < text.length) {
    const char = text[index] ?? ''
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"'
          index += 2
          continue
        }
        quoted = false
        index += 1
        continue
      }
      cell += char
      index += 1
      continue
    }
    if (char === '"' && cell === '') {
      quoted = true
      index += 1
      continue
    }
    if (char === delimiter) {
      pushCell()
      index += 1
      continue
    }
    if (char === '\n') {
      pushRow()
      index += 1
      continue
    }
    if (char === '\r') {
      pushRow()
      index += text[index + 1] === '\n' ? 2 : 1
      continue
    }
    cell += char
    index += 1
  }
  if (cell !== '' || row.length > 0 || quoted) pushRow()
  const columns = rows.reduce((max, item) => Math.max(max, item.length), 0)
  return { rows, columns }
}
