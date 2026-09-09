import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { ResourceSnapshot } from '@deepseek-ai/dsh-client-resources/client'
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { WorkspaceFileResource } from '@deepseek-ai/dsh-api-workspace-files/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SvgPreviewProps } from '../src/client/PreviewChrome.tsx'
import type { SvgStore } from '../src/client/store.ts'
import { createSvgStore } from '../src/client/store.ts'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
export const PATH = 'work/result.svg'
export const ABSOLUTE_PATH = '/host/project/work/result.svg'
export const ADDRESS = 'dsh-resource://file/session/s-1/work/result.svg'

export function bytePage(offset: number, data: Uint8Array | string, eof: boolean, version = 'v1', bytes = data instanceof Uint8Array ? data.byteLength : data.length): WorkspaceFileBytes {
  const encoded = Buffer.from(data).toString('base64')
  return { absolutePath: ABSOLUTE_PATH, version, offset, data: encoded, eof, bytes }
}

export function okBytes(offset: number, data: Uint8Array | string, eof: boolean, version = 'v1', bytes?: number): RemoteResult<WorkspaceFileBytes> {
  return { ok: true, value: bytePage(offset, data, eof, version, bytes) }
}

export function failure<T = WorkspaceFileBytes>(code: string, details: object = {}): RemoteResult<T> {
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

export function propsFor(instance: ReturnType<SvgStore['create']>, address = ADDRESS): SvgPreviewProps {
  const controller = new AbortController()
  return {
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID,
        kind: 'svg',
        contentId: address,
        title: 'result.svg',
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
    load: vi.fn(),
    reload: vi.fn(),
    t,
  } as unknown as SvgPreviewProps
}

export function storeWithDocument() {
  const instance = createSvgStore().create()
  instance.actions.document(TAB_ID, { src: 'blob:test-1', version: 'v1', bytes: 20, warnings: [] })
  return instance
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
