// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { svgFace } from '../src/client/face.ts'
import type { ReadSvgBytes } from '../src/client/rpc.ts'
import { createSvgStore } from '../src/client/store.ts'
import { ABSOLUTE_PATH, failure, okBytes, PATH, SESSION } from './fixtures.client.ts'
import type { PendingByteRead } from './fixtures.client.ts'
import { mockUrl } from './fixtures.client.ts'

const TAB = 'tab-1' as TabId
const FILE = { sessionId: SESSION, path: PATH }
const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

function bytesWithoutSize(offset: number, data: string, eof: boolean): RemoteResult<WorkspaceFileBytes> {
  return {
    ok: true,
    value: {
      absolutePath: ABSOLUTE_PATH,
      version: 'v1',
      offset,
      data: Buffer.from(data).toString('base64'),
      eof,
    },
  }
}

function bench() {
  const instance = createSvgStore().create()
  const pending: PendingByteRead[] = []
  const readBytes = vi.fn<ReadSvgBytes>((_session, _path, offset) =>
    new Promise((resolve) => { pending.push({ offset, resolve }) }))
  const forget = vi.fn(instance.actions.forget)
  const face = svgFace(readBytes, { maxSvgBytes: 100, externalResourcePolicy: 'strip' })('other-session' as SessionId, { ...instance.actions, forget })
  return {
    instance,
    readBytes,
    face,
    forget,
    bytes(result: RemoteResult<WorkspaceFileBytes>, offset?: number) {
      const at = offset === undefined ? 0 : pending.findIndex(call => call.offset === offset)
      const [call] = pending.splice(at, 1)
      if (call === undefined) throw new Error('no pending byte read')
      call.resolve(result)
    },
    pending: () => pending.map(call => call.offset),
    tab: () => instance.getSnapshot().byTab[TAB],
  }
}

describe('SVG preview face', () => {
  it('reads, sanitizes, and publishes one SVG Blob URL', async () => {
    const urls = mockUrl()
    const h = bench()
    const signal = new AbortController().signal
    h.face.load(TAB, FILE, signal)
    expect(h.readBytes).toHaveBeenCalledWith(SESSION, PATH, 0, signal)
    h.bytes(okBytes(0, '<svg><rect /></svg>', true, 'v1', 20))
    await flush()
    expect(urls.create).toHaveBeenCalledTimes(1)
    expect(h.tab()).toMatchObject({ loading: false, document: { src: 'blob:test-1', version: 'v1', bytes: 20 } })
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('restarts from offset zero when the file version changes mid-read', async () => {
    const urls = mockUrl()
    const h = bench()
    const signal = new AbortController().signal
    h.face.load(TAB, FILE, signal)
    h.bytes(okBytes(0, '<svg>', false, 'v1', 12), 0)
    await flush()
    expect(h.pending()).toEqual([5])
    h.bytes(okBytes(5, '<rect /></svg>', true, 'v2', 20), 5)
    await flush()
    expect(h.pending()).toEqual([0])
    h.bytes(okBytes(0, '<svg><rect /></svg>', true, 'v2', 20), 0)
    await flush()
    expect(urls.create).toHaveBeenCalledTimes(1)
    expect(h.tab()?.document?.version).toBe('v2')
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('fails unsafe, invalid UTF-8, oversized, incomplete, and Remote reads', async () => {
    const unsafe = bench()
    unsafe.face.load(TAB, FILE, new AbortController().signal)
    unsafe.bytes(okBytes(0, '<svg><script /></svg>', true))
    await flush()
    expect(unsafe.tab()?.failure).toBeUndefined()
    expect(unsafe.tab()?.document?.warnings).toEqual(['active-content-removed'])

    const invalid = bench()
    invalid.face.load(TAB, FILE, new AbortController().signal)
    invalid.bytes(okBytes(0, new Uint8Array([0xc3, 0x28]), true))
    await flush()
    expect(invalid.tab()?.failure?.code).toBe('svg-preview/invalid-utf8')

    const large = bench()
    large.face.load(TAB, FILE, new AbortController().signal)
    large.bytes(okBytes(0, 'a'.repeat(101), true, 'v1', 101))
    await flush()
    expect(large.tab()?.failure?.code).toBe('svg-preview/too-large')

    const incomplete = bench()
    incomplete.face.load(TAB, FILE, new AbortController().signal)
    incomplete.bytes(okBytes(0, '', false, 'v1', 2))
    await flush()
    expect(incomplete.tab()?.failure?.code).toBe('svg-preview/incomplete')

    const remote = bench()
    remote.face.load(TAB, FILE, new AbortController().signal)
    remote.bytes(failure('workspace-file/not-found'))
    await flush()
    expect(remote.tab()?.failure?.code).toBe('workspace-file/not-found')
  })

  it('enforces the assembled byte limit when a page omits the total size', async () => {
    const h = bench()
    h.face.load(TAB, FILE, new AbortController().signal)
    h.bytes(bytesWithoutSize(0, 'a'.repeat(101), true))
    await flush()
    expect(h.tab()?.failure?.code).toBe('svg-preview/too-large')
  })

  it('publishes a document when the total size is unknown', async () => {
    const urls = mockUrl()
    const h = bench()
    h.face.load(TAB, FILE, new AbortController().signal)
    h.bytes(bytesWithoutSize(0, '<svg />', true))
    await flush()
    expect(h.tab()?.document).toMatchObject({ src: 'blob:test-1', version: 'v1' })
    expect(h.tab()?.document?.bytes).toBe(7)
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('ignores reads that are aborted or superseded by a reload', async () => {
    const aborted = bench()
    const abortedController = new AbortController()
    aborted.face.load(TAB, FILE, abortedController.signal)
    abortedController.abort()
    aborted.bytes(okBytes(0, '<svg />', true))
    await flush()
    expect(aborted.tab()).toBeUndefined()

    const urls = mockUrl()
    const stale = bench()
    const staleController = new AbortController()
    stale.face.load(TAB, FILE, staleController.signal)
    stale.face.reload(TAB, FILE, staleController.signal)
    stale.bytes(okBytes(0, '<svg />', true))
    await flush()
    expect(stale.pending()).toEqual([0])
    stale.bytes(okBytes(0, '<svg />', true))
    await flush()
    expect(stale.tab()?.document?.src).toBe('blob:test-1')
    staleController.abort()
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('does nothing when load or reload receives an already-aborted signal', () => {
    const h = bench()
    const controller = new AbortController()
    controller.abort()
    h.face.load(TAB, FILE, controller.signal)
    h.face.reload(TAB, FILE, controller.signal)
    expect(h.readBytes).not.toHaveBeenCalled()
  })

  it('reports thrown read errors and suppresses errors from aborted or stale reads', async () => {
    const error = bench()
    error.readBytes.mockRejectedValueOnce(new Error('socket closed'))
    error.face.load(TAB, FILE, new AbortController().signal)
    await flush()
    expect(error.tab()?.failure).toMatchObject({ code: 'svg-preview/read-failed', message: 'socket closed' })

    const nonError = bench()
    nonError.readBytes.mockRejectedValueOnce('closed')
    nonError.face.load(TAB, FILE, new AbortController().signal)
    await flush()
    expect(nonError.tab()?.failure).toMatchObject({ code: 'svg-preview/read-failed', message: 'closed' })

    const aborted = bench()
    const abortedController = new AbortController()
    aborted.readBytes.mockRejectedValueOnce(new Error('aborted'))
    aborted.face.load(TAB, FILE, abortedController.signal)
    abortedController.abort()
    await flush()
    expect(aborted.tab()).toBeUndefined()

    const stale = bench()
    const staleController = new AbortController()
    stale.readBytes.mockRejectedValueOnce(new Error('stale'))
    stale.face.load(TAB, FILE, staleController.signal)
    stale.face.reload(TAB, FILE, staleController.signal)
    await flush()
    expect(stale.tab()).toMatchObject({ loading: true })
    staleController.abort()
  })

  it('retires reads and reclaims Blob URLs when reloaded or aborted', async () => {
    const urls = mockUrl()
    const h = bench()
    const controller = new AbortController()
    h.face.load(TAB, FILE, controller.signal)
    h.bytes(okBytes(0, '<svg />', true))
    await flush()
    h.face.reload(TAB, FILE, controller.signal)
    expect(h.tab()).toMatchObject({ loading: true, document: undefined })
    expect(urls.revoke).toHaveBeenCalledWith('blob:test-1')
    controller.abort()
    expect(h.forget).toHaveBeenCalledExactlyOnceWith(TAB)
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })
})
