import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceFileBytes, WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { artifactFace } from '../src/client/face.ts'
import type { ReadArtifactBytes, ReadArtifactText } from '../src/client/rpc.ts'
import { createArtifactStore } from '../src/client/store.ts'
import { failure, okBytes, okText, PATH, SESSION } from './fixtures.client.ts'
import type { PendingByteRead, PendingTextRead } from './fixtures.client.ts'
import { mockUrl } from './fixtures.client.ts'

const TAB = 'tab-1' as TabId
const FILE = { sessionId: SESSION, path: PATH }

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

function bench() {
  const instance = createArtifactStore().create()
  const pendingText: PendingTextRead[] = []
  const pendingBytes: PendingByteRead[] = []
  const readText = vi.fn<ReadArtifactText>((_session, path) =>
    new Promise((resolve) => { pendingText.push({ path, resolve }) }))
  const readBytes = vi.fn<ReadArtifactBytes>((_session, _path, offset) =>
    new Promise((resolve) => { pendingBytes.push({ offset, resolve }) }))
  const forget = vi.fn(instance.actions.forget)
  const face = artifactFace(readText, readBytes, { maxImageBytes: 6 })('other-session' as SessionId, { ...instance.actions, forget })
  return {
    instance,
    readText,
    readBytes,
    face,
    forget,
    text(result: RemoteResult<WorkspaceFileText>) {
      const call = pendingText.shift()
      if (call === undefined) throw new Error('no pending text read')
      call.resolve(result)
    },
    bytes(result: RemoteResult<WorkspaceFileBytes>, offset?: number) {
      const at = offset === undefined ? 0 : pendingBytes.findIndex(call => call.offset === offset)
      const [call] = pendingBytes.splice(at, 1)
      if (call === undefined) throw new Error('no pending byte read')
      call.resolve(result)
    },
    pendingBytes: () => pendingBytes.map(call => call.offset),
    tab: () => instance.getSnapshot().byTab[TAB],
  }
}

describe('artifact preview face', () => {
  it('marks text loading, keeps a successful first page, and stores Remote failures', async () => {
    const h = bench()
    const signal = new AbortController().signal
    h.face.loadText(TAB, 'markdown', FILE, signal)
    expect(h.readText).toHaveBeenCalledWith(SESSION, PATH, signal)
    expect(h.tab()?.loading).toBe(true)
    h.text(okText('# Title', false))
    await flush()
    expect(h.tab()).toMatchObject({ viewer: 'markdown', loading: false, text: { text: '# Title', eof: false } })
    h.face.loadText(TAB, 'markdown', FILE, signal)
    h.text(failure('workspace-file/not-text', { path: PATH }))
    await flush()
    expect(h.tab()).toMatchObject({ loading: false, failure: { code: 'workspace-file/not-text' } })
  })

  it('reload retires the text read still in flight and keeps the newer result', async () => {
    const h = bench()
    const signal = new AbortController().signal
    h.face.loadText(TAB, 'json', FILE, signal)
    h.face.reloadText(TAB, 'json', FILE, signal)
    h.text(okText('old'))
    await flush()
    expect(h.tab()).toMatchObject({ loading: true, text: undefined })
    h.text(okText('{"new":true}', true, 'v2'))
    await flush()
    expect(h.tab()).toMatchObject({ loading: false, text: { text: '{"new":true}', version: 'v2' } })
  })

  it('settles a thrown text read error instead of leaving the tab loading', async () => {
    const h = bench()
    h.readText.mockRejectedValueOnce(new Error('socket closed'))
    h.face.loadText(TAB, 'markdown', FILE, new AbortController().signal)
    await flush()
    expect(h.tab()).toMatchObject({
      loading: false,
      failure: { code: 'artifact-preview/read-failed', message: 'socket closed' },
    })
  })

  it('assembles image windows into one Blob URL and restarts when the file version changes mid-read', async () => {
    const urls = mockUrl()
    const h = bench()
    const signal = new AbortController().signal
    h.face.loadImage(TAB, FILE, 'image/png', signal)
    expect(h.readBytes).toHaveBeenCalledWith(SESSION, PATH, 0, signal)
    h.bytes(okBytes(0, 'ab', false, 'v1', 4), 0)
    await flush()
    expect(h.pendingBytes()).toEqual([2])
    h.bytes(okBytes(2, 'xy', false, 'v2', 4), 2)
    await flush()
    expect(h.pendingBytes()).toEqual([0])
    h.bytes(okBytes(0, 'cd', false, 'v2', 4), 0)
    await flush()
    h.bytes(okBytes(2, 'ef', true, 'v2', 4), 2)
    await flush()
    expect(urls.create).toHaveBeenCalledTimes(1)
    expect(h.tab()).toMatchObject({ loading: false, image: { src: 'blob:test-1', mime: 'image/png', version: 'v2', bytes: 4 } })
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('fails image reads that exceed the browser limit or stop advancing', async () => {
    const large = bench()
    large.face.loadImage(TAB, FILE, 'image/png', new AbortController().signal)
    large.bytes(okBytes(0, 'abcdefg', true, 'v1', 7))
    await flush()
    expect(large.tab()?.failure?.code).toBe('artifact-preview/image-too-large')

    const incomplete = bench()
    incomplete.face.loadImage(TAB, FILE, 'image/png', new AbortController().signal)
    incomplete.bytes(okBytes(0, '', false, 'v1', 2))
    await flush()
    expect(incomplete.tab()?.failure?.code).toBe('artifact-preview/image-incomplete')
  })

  it('reclaims tab state and Blob URLs when the tab lifetime ends', async () => {
    const urls = mockUrl()
    const h = bench()
    const controller = new AbortController()
    h.face.loadImage(TAB, FILE, 'image/png', controller.signal)
    h.bytes(okBytes(0, 'ab', true, 'v1', 2))
    await flush()
    expect(h.tab()?.image?.src).toBe('blob:test-1')
    controller.abort()
    expect(h.forget).toHaveBeenCalledExactlyOnceWith(TAB)
    expect(urls.revoke).toHaveBeenCalledExactlyOnceWith('blob:test-1')
    expect(h.tab()).toBeUndefined()
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })
})
