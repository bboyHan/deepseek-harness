/**
 * Browser-only unified diff preview package; the Host entry validates row
 * configuration and carries no runtime behavior.
 */
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'

/** Runtime configuration for patch previews. */
export interface Config {
  /** Largest number of parsed hunks retained from one patch page. */
  maxHunks?: number
}

/** Materialized configuration after Cordis validation. */
export interface ResolvedConfig {
  /** Largest number of parsed hunks retained from one patch page. */
  readonly maxHunks: number
}

/** Runtime configuration for patch previews. */
export const Config: z<Config> = z.object({
  maxHunks: z.number().step(1).min(1).default(500),
})

/**
 * Host half: configuration schema only; the browser half owns the preview.
 * @param _ctx - Host plugin context, unused because the package registers no Host behavior.
 * @param _config - validated preview limits carried to the browser row.
 */
export function apply(_ctx: Context, _config: Config): void {}
