/** Shared configuration schema for the video preview Host and Client rows. */
import z from '@deepseek-ai/schemastery'

/** Deployment limits for video preview delivery. */
export interface Config {
  /** Largest video source file this route serves. */
  maxVideoBytes?: number
  /** Largest byte count returned by one Range response and one full-response stream read. */
  maxRangeBytes?: number
}

/** Materialized video preview limits. */
export interface ResolvedConfig {
  /** Largest video source file this route serves. */
  readonly maxVideoBytes: number
  /** Largest byte count returned by one Range response and one full-response stream read. */
  readonly maxRangeBytes: number
}

/** Validate video preview delivery limits. */
export const Config: z<Config> = z.object({
  maxVideoBytes: z.number().step(1).min(1).default(512 * 1024 * 1024),
  maxRangeBytes: z.number().step(1).min(1).default(4 * 1024 * 1024),
})
