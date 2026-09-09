import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { FsError } from '@deepseek-ai/dsh-fs'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { SessionId } from '@deepseek-ai/dsh-session'
import { apply, Config, inject } from '../src/index.ts'

const SESSION = SessionId('s-video')
const OTHER_SESSION = SessionId('missing')
const BYTES = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

async function responseBytes(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer())
}

describe('video preview route', () => {
  let root: string
  let workspace: string
  let outside: string
  const contexts: Context[] = []

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-video-preview-')))
    workspace = join(root, 'workspace')
    outside = join(root, 'outside')
    await mkdir(workspace, { recursive: true })
    await mkdir(outside, { recursive: true })
  })

  afterEach(async () => {
    await Promise.all(contexts.splice(0).map(ctx => ctx.fiber.dispose()))
    await rm(root, { recursive: true, force: true })
  })

  async function mount(options: Partial<ReturnType<typeof Config>> & { sessionErrorCode?: string } = {}) {
    const ctx = new Context()
    contexts.push(ctx)
    let handler: ((request: Request) => Promise<Response>) | undefined
    const unregister = vi.fn(async () => {})
    ctx.provide('connection', {
      fetch: {
        register: (registered: { fetch: (request: Request) => Promise<Response> }) => {
          handler = registered.fetch
          return unregister
        },
      },
    } as never)
    const agent = { id: SESSION, session: { id: SESSION } } as unknown as Agent
    ctx.provide('sessionController', {
      resolveAgent: vi.fn(async (sessionId: typeof SESSION) => sessionId === SESSION && options.sessionErrorCode === undefined
        ? { agent }
        : { error: { code: options.sessionErrorCode ?? 'session/not-found', message: 'session missing', details: { sessionId } } }),
    } as never)
    ctx.provide('sandboxPolicy', {
      resolve: () => ({ mode: 'workspace-write', workspaceRoot: workspace }),
    } as never)
    await ctx.plugin(LocalFileSystem, { cwd: workspace }).await()
    await ctx.plugin({ inject: [...inject], apply }, Config({
      maxVideoBytes: options.maxVideoBytes ?? 1024,
      maxRangeBytes: options.maxRangeBytes ?? 4,
    }) as never).await()
    const raw = (url: string, init?: RequestInit) => {
      if (handler === undefined) throw new Error('route not registered')
      return handler(new Request(url, init))
    }
    return {
      raw,
      call: (path: string, init?: RequestInit, sessionId = SESSION) => {
        const params = new URLSearchParams()
        params.set('sessionId', sessionId)
        params.set('path', path)
        return raw(`http://127.0.0.1/api/sidebar-video-preview/file?${params.toString()}`, init)
      },
      fs: ctx.fs as LocalFileSystem,
      unregister,
      dispose: () => ctx.fiber.dispose(),
    }
  }

  it('answers HEAD and single byte ranges with video headers', async () => {
    const route = await mount()
    const path = join(workspace, 'clip.mp4')
    await writeFile(path, BYTES)
    const head = await route.call('clip.mp4', { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.body).toBeNull()
    expect(head.headers.get('content-type')).toBe('video/mp4')
    expect(head.headers.get('content-length')).toBe('10')
    expect(head.headers.get('accept-ranges')).toBe('bytes')
    expect(head.headers.get('cache-control')).toBe('private, no-store')
    expect(head.headers.get('x-content-type-options')).toBe('nosniff')

    const read = vi.spyOn(route.fs, 'readByteRange')
    const response = await route.call(path, { headers: { range: 'bytes=0-3' } })
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10')
    expect(response.headers.get('content-length')).toBe('4')
    expect(await responseBytes(response)).toEqual(BYTES.slice(0, 4))
    expect(read).toHaveBeenCalledWith(expect.anything(), { offset: 0, length: 4 }, expect.any(AbortSignal))
  })

  it('keeps HEAD failures bodyless', async () => {
    const route = await mount()
    await writeFile(join(workspace, 'clip.txt'), BYTES)
    const response = await route.call('clip.txt', { method: 'HEAD' })
    expect(response.status).toBe(415)
    expect(response.body).toBeNull()
  })

  it('serves open-ended, suffix, and clamped byte ranges', async () => {
    const route = await mount({ maxRangeBytes: 10 })
    await writeFile(join(workspace, 'clip.webm'), BYTES)
    await expect(responseBytes(await route.call('clip.webm', { headers: { range: 'bytes=4-' } })))
      .resolves.toEqual(BYTES.slice(4))
    await expect(responseBytes(await route.call('clip.webm', { headers: { range: 'bytes=-4' } })))
      .resolves.toEqual(BYTES.slice(6))
    const clamped = await route.call('clip.webm', { headers: { range: 'bytes=8-99' } })
    expect(clamped.headers.get('content-range')).toBe('bytes 8-9/10')
    await expect(responseBytes(clamped)).resolves.toEqual(BYTES.slice(8))
  })

  it('rejects malformed, multi-part, unsatisfied, and over-limit ranges', async () => {
    const route = await mount({ maxRangeBytes: 4 })
    await writeFile(join(workspace, 'clip.mov'), BYTES)
    for (const range of ['bytes=10-', 'bytes=9-8', 'bytes=-0', 'bytes=-', 'bytes=abc', 'items=0-1', 'bytes=0-1,3-4', 'bytes=0-4', 'bytes=9007199254740992-']) {
      const response = await route.call('clip.mov', { headers: { range } })
      expect(response.status).toBe(416)
      expect(response.headers.get('accept-ranges')).toBe('bytes')
      expect(response.headers.get('content-range')).toBe('bytes */10')
    }
  })

  it('streams a full GET through bounded byte windows', async () => {
    const route = await mount({ maxRangeBytes: 4 })
    await writeFile(join(workspace, 'download.ogv'), BYTES)
    const read = vi.spyOn(route.fs, 'readByteRange')
    const response = await route.call('download.ogv')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-length')).toBe('10')
    expect(await responseBytes(response)).toEqual(BYTES)
    expect(read.mock.calls.map(([, range]) => range)).toEqual([
      { offset: 0, length: 4 },
      { offset: 4, length: 4 },
      { offset: 8, length: 2 },
    ])
  })

  it('handles empty files and truncated provider reads while streaming full GETs', async () => {
    const route = await mount({ maxRangeBytes: 4 })
    await writeFile(join(workspace, 'empty.mp4'), new Uint8Array())
    const empty = await route.call('empty.mp4')
    expect(empty.status).toBe(200)
    expect(empty.headers.get('content-length')).toBe('0')
    expect(await responseBytes(empty)).toEqual(new Uint8Array())

    await writeFile(join(workspace, 'truncated.mp4'), BYTES)
    vi.spyOn(route.fs, 'readByteRange').mockResolvedValueOnce(new Uint8Array())
    const truncated = await route.call('truncated.mp4')
    expect(truncated.status).toBe(200)
    await expect(truncated.arrayBuffer()).rejects.toThrow('video stream stopped before EOF')
  })

  it('refuses unsupported extensions and oversized files before content I/O', async () => {
    const route = await mount({ maxVideoBytes: 9 })
    const read = vi.spyOn(route.fs, 'readByteRange')
    await writeFile(join(workspace, 'clip.txt'), BYTES)
    expect((await route.call('clip.txt')).status).toBe(415)
    await writeFile(join(workspace, 'huge.mp4'), BYTES)
    expect((await route.call('huge.mp4')).status).toBe(413)
    expect(read).not.toHaveBeenCalled()
  })

  it('rejects missing parameters, missing sessions, absent files, directories, and paths outside the workspace', async () => {
    const route = await mount()
    expect((await route.raw('http://127.0.0.1/api/sidebar-video-preview/file')).status).toBe(400)
    expect((await route.raw('http://127.0.0.1/api/sidebar-video-preview/file?sessionId=s-video&path=')).status).toBe(400)
    expect((await route.raw('http://127.0.0.1/api/sidebar-video-preview/file?sessionId=s-video&path=a%00b.mp4')).status).toBe(400)
    expect((await route.call('clip.mp4', undefined, OTHER_SESSION)).status).toBe(404)
    expect((await route.call('missing.mp4')).status).toBe(404)
    await mkdir(join(workspace, 'folder.mp4'))
    expect((await route.call('folder.mp4')).status).toBe(403)
    await writeFile(join(outside, 'outside.mp4'), BYTES)
    expect((await route.call(join(outside, 'outside.mp4'))).status).toBe(403)
  })

  it('maps non-404 session errors to explicit route statuses', async () => {
    await expect((await (await mount({ sessionErrorCode: 'session/agent-busy' })).call('clip.mp4')).status).toBe(409)
    await expect((await (await mount({ sessionErrorCode: 'session/internal' })).call('clip.mp4')).status).toBe(500)
  })

  it.skipIf(process.platform === 'win32')('rejects symlinks before following them outside the workspace', async () => {
    const route = await mount()
    await writeFile(join(outside, 'outside.mp4'), BYTES)
    await symlink(join(outside, 'outside.mp4'), join(workspace, 'linked.mp4'))
    expect((await route.call('linked.mp4')).status).toBe(403)
  })

  it('preserves filesystem failures and aborted requests', async () => {
    const route = await mount()
    await writeFile(join(workspace, 'clip.mkv'), BYTES)
    const read = vi.spyOn(route.fs, 'readByteRange')
    for (const [code, status] of [
      ['FS_PERMISSION_DENIED', 403],
      ['FS_SANDBOX_DENIED', 403],
      ['FS_NOT_FOUND', 404],
      ['FS_NOT_REGULAR_FILE', 403],
      ['FS_IO_ERROR', 500],
    ] as const) {
      read.mockRejectedValueOnce(new FsError('provider failure', code))
      expect((await route.call('clip.mkv', { headers: { range: 'bytes=0-1' } })).status).toBe(status)
    }
    expect((await route.call('clip.mkv', { signal: AbortSignal.abort() })).status).toBe(499)
  })

  it('rejects unavailable file sizes and unregisters on disposal', async () => {
    const route = await mount()
    await writeFile(join(workspace, 'clip.mp4'), BYTES)
    vi.spyOn(route.fs, 'stat').mockResolvedValue({ type: 'file', version: 'v1' as never })
    expect((await route.call('clip.mp4')).status).toBe(500)
    vi.spyOn(route.fs, 'stat').mockResolvedValueOnce(undefined)
    expect((await route.call('clip.mp4')).status).toBe(404)
    vi.spyOn(route.fs, 'stat').mockResolvedValueOnce({ type: 'directory', version: 'v1' as never })
    expect((await route.call('clip.mp4')).status).toBe(403)
    vi.spyOn(route.fs, 'stat').mockRejectedValueOnce(new Error('stat exploded'))
    await expect(route.call('clip.mp4')).rejects.toThrow('stat exploded')
    await route.dispose()
    expect(route.unregister).toHaveBeenCalledTimes(1)
  })
})
