import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { OfficePreviewProps } from '../src/client/PreviewChrome.tsx'
import type { OfficeViewer } from '../src/client/definitions.ts'
import type { OfficeStore } from '../src/client/store.ts'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
export const PATH = 'work/report.xlsx'
export const ABSOLUTE_PATH = '/host/project/work/report.xlsx'
export const ADDRESS = 'dsh-resource://file/session/s-1/work/report.xlsx'

export function bytePage(offset: number, data: string, eof: boolean, version = 'v1', bytes = data.length): WorkspaceFileBytes {
  return {
    absolutePath: ABSOLUTE_PATH,
    version,
    offset,
    data: Buffer.from(data).toString('base64'),
    eof,
    bytes,
  }
}

export function okBytes(offset: number, data: string, eof: boolean, version = 'v1', bytes = data.length): RemoteResult<WorkspaceFileBytes> {
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

export function propsFor(instance: ReturnType<OfficeStore['create']>, viewer: OfficeViewer, address = ADDRESS): OfficePreviewProps {
  const controller = new AbortController()
  return {
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID,
        kind: viewer,
        contentId: address,
        title: 'report',
        visible: true,
        navigation: { address, revision: 1 },
        signal: controller.signal,
        actions: { openResource: vi.fn(), openTab: vi.fn(), close: vi.fn(), replace: vi.fn() },
      },
    }),
    sessionId: SESSION,
    useResource: vi.fn(() => ({
      status: 'live',
      value: { absolutePath: ABSOLUTE_PATH, version: 'v1', bytes: 100 },
      failure: undefined,
    })),
    useStore: hookOf(instance),
    actions: instance.actions,
    load: vi.fn(),
    reload: vi.fn(),
    t,
  } as unknown as OfficePreviewProps
}

export type PendingByteRead = {
  readonly offset: number
  resolve(result: RemoteResult<WorkspaceFileBytes>): void
}

export function mockUrl() {
  let next = 1
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    const url = `blob:office-${next}`
    next += 1
    return url
  })
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  return { create, revoke }
}
