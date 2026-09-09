import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionOpenWorkspacePathValue } from '@deepseek-ai/dsh-api-session-controller/types'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'
import { videoFace } from '../src/client/face.ts'
import type { VideoRemote } from '../src/client/rpc.ts'
import { createVideoStore } from '../src/client/store.ts'
import { ABSOLUTE_PATH, PATH, SESSION, TAB_ID } from './fixtures.client.ts'

describe('video preview face', () => {
  it('loads and reloads same-origin source URLs, then forgets state on abort', () => {
    const store = createVideoStore().create()
    const remote = { session: { openWorkspacePath: vi.fn() } }
    const controller = new AbortController()
    const face = videoFace(remote).call(undefined, SESSION, store.actions)
    face.load(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    expect(store.getSnapshot().byTab[TAB_ID]?.source.src).toContain('/api/sidebar-video-preview/file?')
    expect(store.getSnapshot().byTab[TAB_ID]?.source.src).toContain('v=0')
    face.reload(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    expect(store.getSnapshot().byTab[TAB_ID]?.source.src).toContain('v=1')
    controller.abort()
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()
  })

  it('ignores load, reload, and native open work after abort', () => {
    const store = createVideoStore().create()
    const remote = { session: { openWorkspacePath: vi.fn() } }
    const controller = new AbortController()
    controller.abort()
    const face = videoFace(remote).call(undefined, SESSION, store.actions)
    face.load(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    face.reload(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()
    expect(remote.session.openWorkspacePath).not.toHaveBeenCalled()
  })

  it('opens Host paths through the Session Remote and reports failures', async () => {
    const store = createVideoStore().create()
    const ok: RemoteResult<SessionOpenWorkspacePathValue> = { ok: true, value: { opened: true } }
    const openWorkspacePath = vi.fn<VideoRemote['session']['openWorkspacePath']>(async () => ok)
    const controller = new AbortController()
    const face = videoFace({ session: { openWorkspacePath } }).call(undefined, SESSION, store.actions)
    face.load(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    expect(store.getSnapshot().byTab[TAB_ID]?.opening).toBe(true)
    await vi.waitFor(() => { expect(store.getSnapshot().byTab[TAB_ID]?.opening).toBe(false) })
    expect(openWorkspacePath).toHaveBeenCalledWith({ path: ABSOLUTE_PATH }, expect.any(AbortSignal))

    openWorkspacePath.mockResolvedValueOnce({ ok: false, error: new RemoteError('gateway/internal', 'native failed', {}) })
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    await vi.waitFor(() => {
      expect(store.getSnapshot().byTab[TAB_ID]?.failure).toEqual({ code: 'video-preview/open-failed', message: 'native failed' })
    })
  })

  it('reports rejected native opens and ignores settlements after abort', async () => {
    const store = createVideoStore().create()
    const openWorkspacePath = vi.fn<VideoRemote['session']['openWorkspacePath']>(async () => { throw new Error('native rejected') })
    const controller = new AbortController()
    const face = videoFace({ session: { openWorkspacePath } }).call(undefined, SESSION, store.actions)
    face.load(TAB_ID, { sessionId: SESSION, path: PATH }, controller.signal)
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    await vi.waitFor(() => {
      expect(store.getSnapshot().byTab[TAB_ID]?.failure).toEqual({ code: 'video-preview/open-failed', message: 'native rejected' })
    })

    openWorkspacePath.mockImplementationOnce(async () => { throw 'plain failure' })
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    await vi.waitFor(() => {
      expect(store.getSnapshot().byTab[TAB_ID]?.failure).toEqual({ code: 'video-preview/open-failed', message: 'plain failure' })
    })

    let finish!: (value: RemoteResult<SessionOpenWorkspacePathValue>) => void
    openWorkspacePath.mockImplementationOnce(() => new Promise<RemoteResult<SessionOpenWorkspacePathValue>>((resolve) => {
      finish = resolve
    }))
    face.openExternal(TAB_ID, ABSOLUTE_PATH, controller.signal)
    controller.abort()
    finish({ ok: false, error: new RemoteError('gateway/internal', 'late', {}) })
    await Promise.resolve()
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()

    let reject!: (reason: unknown) => void
    const rejectedAfterAbort = new AbortController()
    openWorkspacePath.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise }))
    face.load(TAB_ID, { sessionId: SESSION, path: PATH }, rejectedAfterAbort.signal)
    face.openExternal(TAB_ID, ABSOLUTE_PATH, rejectedAfterAbort.signal)
    rejectedAfterAbort.abort()
    reject(new Error('late rejection'))
    await Promise.resolve()
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()
  })
})
