import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { ResourceSnapshot } from '@deepseek-ai/dsh-client-resources/client'
import type { WorkspaceFileResource } from '@deepseek-ai/dsh-api-workspace-files/client'
import type { WorkspaceFileBytes, WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ArtifactPreviewProps } from '../src/client/PreviewChrome.tsx'
import type { ArtifactViewer } from '../src/client/definitions.ts'
import type { ArtifactStore } from '../src/client/store.ts'
import { createArtifactStore } from '../src/client/store.ts'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
export const PATH = 'work/result.md'
export const ABSOLUTE_PATH = '/host/project/work/result.md'
export const ADDRESS = 'dsh-resource://file/session/s-1/work/result.md'

export function textPage(text: string, eof = true, version = 'v1'): WorkspaceFileText {
  return { absolutePath: ABSOLUTE_PATH, version, offset: 1, text, lines: text === '' ? 0 : text.split('\n').length, eof, bytes: 100 }
}

export function bytePage(offset: number, data: string, eof: boolean, version = 'v1', bytes = data.length): WorkspaceFileBytes {
  return { absolutePath: ABSOLUTE_PATH, version, offset, data: Buffer.from(data).toString('base64'), eof, bytes }
}

export function okText(text: string, eof = true, version = 'v1'): RemoteResult<WorkspaceFileText> {
  return { ok: true, value: textPage(text, eof, version) }
}

export function okBytes(offset: number, data: string, eof: boolean, version = 'v1', bytes = data.length): RemoteResult<WorkspaceFileBytes> {
  return { ok: true, value: bytePage(offset, data, eof, version, bytes) }
}

export function failure<T = WorkspaceFileText>(code: string, details: object = {}): RemoteResult<T> {
  return { ok: false, error: { code, message: 'boom', details } as RemoteFailure }
}

export function t(key: string, params?: Record<string, unknown>): string {
  return params === undefined ? key : `${key}(${Object.entries(params).map(([name, value]) => `${name}=${String(value)}`).join(',')})`
}

export function hookOf<T>(inst: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(sel: (state: T) => S): S {
    return sel(useSyncExternalStore(inst.subscribe, inst.getSnapshot))
  }
}

export function meta(changed = false, remoteFailure?: RemoteFailure): ResourceSnapshot<WorkspaceFileResource> {
  const reload = vi.fn<() => void>()
  const value: WorkspaceFileResource = { absolutePath: ABSOLUTE_PATH, version: 'v1', bytes: 100, changed }
  return remoteFailure === undefined
    ? { status: 'live', value, failure: undefined, reload }
    : { status: 'failed', value, failure: remoteFailure, reload }
}

export function propsFor(instance: ReturnType<ArtifactStore['create']>, viewer: ArtifactViewer, address = ADDRESS): ArtifactPreviewProps {
  const controller = new AbortController()
  return {
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID,
        kind: viewer,
        contentId: address,
        title: 'result',
        visible: true,
        navigation: { address, revision: 1 },
        signal: controller.signal,
        actions: { openResource: vi.fn(), openTab: vi.fn(), close: vi.fn(), replace: vi.fn() },
      },
    }),
    sessionId: SESSION,
    useResource: vi.fn(() => meta()),
    useStore: hookOf(instance),
    actions: instance.actions,
    loadText: vi.fn(),
    reloadText: vi.fn(),
    loadImage: vi.fn(),
    reloadImage: vi.fn(),
    t,
  } as unknown as ArtifactPreviewProps
}

export function storeWith(viewer: ArtifactViewer): ReturnType<ArtifactStore['create']> {
  const instance = createArtifactStore().create()
  instance.actions.loading(TAB_ID, viewer)
  return instance
}

export type PendingTextRead = {
  readonly path: string
  resolve(result: RemoteResult<WorkspaceFileText>): void
}

export type PendingByteRead = {
  readonly offset: number
  resolve(result: RemoteResult<WorkspaceFileBytes>): void
}

export function mockUrl() {
  let next = 1
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:test-${next}`
    next += 1
    return url
  })
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return { create, revoke }
}
