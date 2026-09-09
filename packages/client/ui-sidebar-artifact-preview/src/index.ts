/**
 * Browser-only artifact preview package; the Host entry validates row config
 * and carries no runtime behavior.
 */
import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'

/** Runtime configuration for browser artifact previews. */
export interface Config {
  /** Largest image the browser preview assembles into a Blob URL. */
  maxImageBytes?: number
}

/** Materialized config after Cordis validation. */
export interface ResolvedConfig {
  /** Largest image the browser preview assembles into a Blob URL. */
  readonly maxImageBytes: number
}

/** Runtime configuration for browser artifact previews. */
export const Config: z<Config> = z.object({
  maxImageBytes: z.number().step(1).min(1).default(8 * 1024 * 1024),
})

/**
 * Host half: configuration schema only; the browser half owns the UI behavior.
 * @param _ctx - Host plugin context, unused because the package registers no Host behavior.
 * @param _config - validated preview limits carried to the browser row.
 */
export function apply(_ctx: Context, _config: Config): void {}
