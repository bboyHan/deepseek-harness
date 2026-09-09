import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { patchFace } from '../src/client/face.ts'
import type { ReadPatchText } from '../src/client/rpc.ts'
import { createPatchStore } from '../src/client/store.ts'
import { failure, okText, PATH, SESSION } from './fixtures.client.ts'

const TAB = 'tab-1' as TabId
const FILE = { sessionId: SESSION, path: PATH }

interface Pending {
  resolve(result: RemoteResult<WorkspaceFileText>): void
}

const flush = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

function bench() {
  const instance = createPatchStore().create()
  const pending: Pending[] = []
  const read = vi.fn<ReadPatchText>(() => new Promise((resolve) => { pending.push({ resolve }) }))
  const face = patchFace(read, { maxHunks: 10 })(SESSION, instance.actions)
  return {
    instance,
    read,
    face,
    settle(result: RemoteResult<WorkspaceFileText>): void {
      const call = pending.shift()
      if (call === undefined) throw new Error('no pending read')
      call.resolve(result)
    },
    tab: () => instance.getSnapshot().byTab[TAB],
  }
}

describe('patchFace', () => {
  it('loads and parses the first page, and stores read failures', async () => {
    const h = bench()
    const signal = new AbortController().signal
    h.face.loadPatch(TAB, FILE, signal)
    expect(h.read).toHaveBeenCalledWith(SESSION, PATH, signal)
    expect(h.tab()?.loading).toBe(true)
    h.settle(okText('--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-a\n+b', true, 'v1', 4096))
    await flush()
    expect(h.tab()).toMatchObject({ loading: false, patch: { files: 1, added: 1, removed: 1, bytes: 4096 } })
    h.face.loadPatch(TAB, FILE, signal)
    h.settle(failure('workspace-file/not-text'))
    await flush()
    expect(h.tab()).toMatchObject({ loading: false, failure: { code: 'workspace-file/not-text' } })
  })

  it('retires an old read on reload and forgets state when the tab ends', async () => {
    const h = bench()
    const controller = new AbortController()
    h.face.loadPatch(TAB, FILE, controller.signal)
    h.face.reloadPatch(TAB, FILE, controller.signal)
    h.settle(okText('not a patch'))
    await flush()
    expect(h.tab()).toMatchObject({ loading: true, patch: undefined })
    h.settle(okText('--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new', true, 'v2'))
    await flush()
    expect(h.tab()).toMatchObject({ loading: false, patch: { version: 'v2' } })
    controller.abort()
    expect(h.tab()).toBeUndefined()
  })

  it('fails invalid patch text and ignores calls made with an aborted signal', async () => {
    const h = bench()
    const controller = new AbortController()
    h.face.loadPatch(TAB, FILE, controller.signal)
    h.settle(okText('not a patch'))
    await flush()
    expect(h.tab()).toMatchObject({ failure: { code: 'patch-preview/invalid-patch' } })
    controller.abort()
    h.face.loadPatch(TAB, FILE, controller.signal)
    h.face.reloadPatch(TAB, FILE, controller.signal)
    expect(h.read).toHaveBeenCalledTimes(1)
  })

  it('settles a thrown read error instead of leaving the tab loading', async () => {
    const h = bench()
    h.read.mockRejectedValueOnce(new Error('socket closed'))
    h.face.loadPatch(TAB, FILE, new AbortController().signal)
    await flush()
    expect(h.tab()).toMatchObject({
      loading: false,
      failure: { code: 'patch-preview/read-failed', message: 'socket closed' },
    })
  })
})
