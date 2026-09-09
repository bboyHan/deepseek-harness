import z from '@deepseek-ai/schemastery'
import type { Context } from '@deepseek-ai/cordis'

/** Runtime configuration for the SVG browser preview. */
export interface Config {
  /** Largest SVG file the browser assembles and sanitizes. */
  maxSvgBytes?: number
  /** Whether HTTP(S) references inside the SVG are stripped or kept. */
  externalResourcePolicy?: 'strip' | 'allow'
}

/** Materialized SVG preview configuration. */
export interface ResolvedConfig {
  /** Largest SVG file the browser assembles and sanitizes. */
  readonly maxSvgBytes: number
  /** Whether HTTP(S) references inside the SVG are stripped or kept. */
  readonly externalResourcePolicy: 'strip' | 'allow'
}

/** Validate SVG preview limits passed to the browser row. */
export const Config: z<Config> = z.object({
  maxSvgBytes: z.number().step(1).min(1).default(2 * 1024 * 1024),
  externalResourcePolicy: z.union(['strip', 'allow'] as const).default('allow'),
})

/**
 * Host half: configuration schema only; the browser half owns preview behavior.
 * @param _ctx - Host plugin context, unused because this package registers no Host behavior.
 * @param _config - validated preview limits carried to the browser row.
 */
export function apply(_ctx: Context, _config: Config): void {}
