/**
 * Browser-only office preview package; the Host entry validates row config
 * and carries no runtime behavior.
 */
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'

/** Runtime limits for browser-side office previews. */
export interface Config {
  /** Largest office file the browser assembles before parsing. */
  maxOfficeBytes?: number
  /** Largest number of worksheet rows rendered from one sheet. */
  maxSpreadsheetRows?: number
  /** Largest number of worksheet columns rendered from one sheet. */
  maxSpreadsheetColumns?: number
  /** Largest number of worksheets rendered from one workbook. */
  maxSpreadsheetSheets?: number
}

/** Materialized office preview limits. */
export interface ResolvedConfig {
  /** Largest office file the browser assembles before parsing. */
  readonly maxOfficeBytes: number
  /** Largest number of worksheet rows rendered from one sheet. */
  readonly maxSpreadsheetRows: number
  /** Largest number of worksheet columns rendered from one sheet. */
  readonly maxSpreadsheetColumns: number
  /** Largest number of worksheets rendered from one workbook. */
  readonly maxSpreadsheetSheets: number
}

/** Runtime limits for browser-side office previews. */
export const Config: z<Config> = z.object({
  maxOfficeBytes: z.number().step(1).min(1).default(2 * 1024 * 1024),
  maxSpreadsheetRows: z.number().step(1).min(1).default(5000),
  maxSpreadsheetColumns: z.number().step(1).min(1).default(100),
  maxSpreadsheetSheets: z.number().step(1).min(1).default(20),
})

/**
 * Host half: configuration schema only; the browser half owns the UI behavior.
 * @param _ctx - Host plugin context, unused because the package registers no Host behavior.
 * @param _config - validated preview limits carried to the browser row.
 */
export function apply(_ctx: Context, _config: Config): void {}
