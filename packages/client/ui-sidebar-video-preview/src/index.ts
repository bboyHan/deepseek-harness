/**
 * Right-Sidebar video preview package. The Host half serves session-confined
 * video bytes through HTTP Range; the browser half registers the viewer UI.
 * @module @deepseek-ai/dsh-client-ui-sidebar-video-preview
 */

import { extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-connection'
import type { FileSystem, FsInfo, FsTarget } from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Config } from './config.ts'
import type { ResolvedConfig } from './config.ts'

export { Config }
export type { Config as VideoPreviewConfig, ResolvedConfig } from './config.ts'

const ROUTE = '/api/sidebar-video-preview/file'

const VIDEO_TYPES = new Map<string, string>([
  ['.mp4', 'video/mp4'],
  ['.m4v', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.ogv', 'video/ogg'],
  ['.ogg', 'video/ogg'],
  ['.mov', 'video/quicktime'],
  ['.mkv', 'video/x-matroska'],
  ['.avi', 'video/x-msvideo'],
  ['.wmv', 'video/x-ms-wmv'],
  ['.flv', 'video/x-flv'],
  ['.3gp', 'video/3gpp'],
])

const BASE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
}

interface LocatedVideo {
  readonly target: FsTarget
  readonly info: FsInfo
  readonly mediaType: string
}

interface FsErrorLike {
  readonly code: string
}

type RangeSelection =
  | { readonly kind: 'full' }
  | { readonly kind: 'partial'; readonly offset: number; readonly length: number; readonly end: number }
  | { readonly kind: 'invalid' }

/**
 * Host services needed by the video route.
 */
interface VideoRouteContext extends Context {
  readonly fs: FileSystem
}

function fail(request: Request, status: number, text: string, headers: HeadersInit = {}): Response {
  return new Response(request.method === 'HEAD' ? null : text, { status, headers: { ...BASE_HEADERS, ...headers } })
}

function isFsErrorLike(error: unknown): error is FsErrorLike {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
    && error.code.startsWith('FS_')
}

function statusOf(error: FsErrorLike): number {
  const statuses: Record<string, number> = {
    FS_NOT_FOUND: 404,
    FS_NOT_REGULAR_FILE: 403,
    FS_PERMISSION_DENIED: 403,
    FS_SANDBOX_DENIED: 403,
    FS_ABORTED: 499,
  }
  return statuses[error.code] ?? 500
}

function sessionStatus(code: string): number {
  switch (code) {
    case 'session/not-found': return 404
    case 'session/agent-busy': return 409
    default: return 500
  }
}

function videoTypeOf(path: string): string | undefined {
  return VIDEO_TYPES.get(extname(path).toLowerCase())
}

function parseRange(value: string | null, size: number, maxRangeBytes: number): RangeSelection {
  if (value === null) return { kind: 'full' }
  const match = /^bytes=(\d*)-(\d*)$/u.exec(value.trim())
  if (match === null) return { kind: 'invalid' }
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return { kind: 'invalid' }
  let start: number
  let end: number
  if (rawStart === '') {
    const suffix = Number(rawEnd)
    if (!Number.isSafeInteger(suffix) || suffix <= 0 || size === 0) return { kind: 'invalid' }
    start = Math.max(size - suffix, 0)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return { kind: 'invalid' }
    if (start >= size || end < start) return { kind: 'invalid' }
    end = Math.min(end, size - 1)
  }
  const length = end - start + 1
  if (length > maxRangeBytes) return { kind: 'invalid' }
  return { kind: 'partial', offset: start, length, end }
}

function contentHeaders(mediaType: string, size: number, extra: Record<string, string> = {}): Record<string, string> {
  return {
    ...BASE_HEADERS,
    'Accept-Ranges': 'bytes',
    'Content-Type': mediaType,
    'Content-Length': String(size),
    ...extra,
  }
}

function streamBytes(fs: FileSystem, target: FsTarget, size: number, chunkSize: number, signal: AbortSignal): ReadableStream<Uint8Array> {
  let offset = 0
  return new ReadableStream({
    async pull(controller) {
      if (offset >= size) {
        controller.close()
        return
      }
      const length = Math.min(chunkSize, size - offset)
      const chunk = await fs.readByteRange(target, { offset, length }, signal)
      if (chunk.byteLength === 0 && length > 0) {
        controller.error(new Error('video stream stopped before EOF'))
        return
      }
      offset += chunk.byteLength
      controller.enqueue(chunk.slice())
      if (offset >= size) controller.close()
    },
  })
}

async function locateVideo(ctx: VideoRouteContext, request: Request, sessionId: string, path: string): Promise<LocatedVideo | Response> {
  const mediaType = videoTypeOf(path)
  if (mediaType === undefined) return fail(request, 415, 'unsupported video extension')
  const resolved = await ctx.sessionController.resolveAgent(sessionId as SessionId)
  if ('error' in resolved) return fail(request, sessionStatus(resolved.error.code), resolved.error.message)
  const workspaceRoot = ctx.sandboxPolicy.resolve({ session: resolved.agent.session }).workspaceRoot
  const root = await ctx.fs.resolve(workspaceRoot, { signal: request.signal })
  const entry = await ctx.fs.lstat(path, { cwd: workspaceRoot }, request.signal)
  if (entry === undefined) return fail(request, 404, 'not found')
  if (entry.type !== 'file') return fail(request, 403, 'not a regular file')
  const target = await ctx.fs.resolve(path, { cwd: workspaceRoot, signal: request.signal })
  if (!ctx.fs.contains(root, target)) return fail(request, 403, 'outside workspace')
  const info = await ctx.fs.stat(target, request.signal)
  if (info === undefined) return fail(request, 404, 'not found')
  if (info.type !== 'file') return fail(request, 403, 'not a regular file')
  return { target, info, mediaType }
}

async function serveVideo(request: Request, ctx: VideoRouteContext, config: ResolvedConfig): Promise<Response> {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  const path = url.searchParams.get('path')
  if (sessionId === null || sessionId.length === 0) return fail(request, 400, 'missing sessionId')
  if (path === null || path.length === 0 || path.includes('\0')) return fail(request, 400, 'invalid path')
  try {
    const located = await locateVideo(ctx, request, sessionId, path)
    if (located instanceof Response) return located
    const { target, info, mediaType } = located
    const size = info.size
    if (size === undefined || !Number.isSafeInteger(size) || size < 0) {
      return fail(request, 500, 'file size unavailable')
    }
    if (size > config.maxVideoBytes) return fail(request, 413, 'video exceeds byte limit')
    if (request.method === 'HEAD') {
      return new Response(null, { headers: contentHeaders(mediaType, size) })
    }
    const selected = parseRange(request.headers.get('range'), size, config.maxRangeBytes)
    if (selected.kind === 'invalid') {
      return fail(request, 416, 'range not satisfiable', {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes */${String(size)}`,
      })
    }
    if (selected.kind === 'full') {
      return new Response(streamBytes(ctx.fs, target, size, config.maxRangeBytes, request.signal), {
        headers: contentHeaders(mediaType, size),
      })
    }
    const bytes = await ctx.fs.readByteRange(target, { offset: selected.offset, length: selected.length }, request.signal)
    return new Response(bytes.slice(), {
      status: 206,
      headers: contentHeaders(mediaType, bytes.byteLength, {
        'Content-Range': `bytes ${String(selected.offset)}-${String(selected.offset + bytes.byteLength - 1)}/${String(size)}`,
      }),
    })
  } catch (error: unknown) {
    if (!isFsErrorLike(error)) throw error
    return fail(request, statusOf(error), error.code)
  }
}

/** Services required by the Host video route. */
export const inject = ['connection', 'fs', 'sandboxPolicy', 'sessionController']

/**
 * Register the authenticated video file route.
 * @param ctx - Host context carrying Connection, Session, policy, and filesystem services.
 * @param config - video source and Range limits.
 */
export function apply(ctx: Context, config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['GET', 'HEAD'],
    requestBody: 'buffered',
    fetch: request => serveVideo(request, ctx as VideoRouteContext, config),
  }), 'ui-sidebar-video-preview: video file route')
}
