import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { ResourceSnapshot } from '@deepseek-ai/dsh-client-resources/client'
import type { WorkspaceFileStat, WorkspaceFileText } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PatchPreviewProps } from '../src/client/PatchPreview.tsx'
import type { PatchStore } from '../src/client/store.ts'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
export const PATH = 'work/change.patch'
export const ABSOLUTE_PATH = '/host/project/work/change.patch'
export const ADDRESS = 'dsh-resource://file/session/s-1/work/change.patch'

export function textPage(text: string, eof = true, version = 'v1', bytes = text.length): WorkspaceFileText {
  return {
    absolutePath: ABSOLUTE_PATH,
    version,
    offset: 1,
    text,
    lines: text === '' ? 0 : text.split('\n').length,
    eof,
    bytes,
  }
}

export function okText(text: string, eof = true, version = 'v1', bytes = text.length): RemoteResult<WorkspaceFileText> {
  return { ok: true, value: textPage(text, eof, version, bytes) }
}

export function failure<T = WorkspaceFileText>(code: string, details: object = {}): RemoteResult<T> {
  return { ok: false, error: { code, message: 'boom', details } as RemoteFailure }
}

export function t(key: string, params?: Record<string, unknown>): string {
  return params === undefined
    ? key
    : `${key}(${Object.entries(params).map(([name, value]) => `${name}=${String(value)}`).join(',')})`
}

function hookOf<T>(instance: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(selector: (state: T) => S): S {
    return selector(useSyncExternalStore(instance.subscribe, instance.getSnapshot))
  }
}

export function meta(changed = false, remoteFailure?: RemoteFailure): ResourceSnapshot<WorkspaceFileStat> {
  const value: WorkspaceFileStat = { absolutePath: ABSOLUTE_PATH, version: changed ? 'v2' : 'v1', bytes: 100 }
  return remoteFailure === undefined
    ? { status: 'live', value, failure: undefined }
    : { status: 'failed', value, failure: remoteFailure }
}

export function propsFor(instance: ReturnType<PatchStore['create']>, address = ADDRESS): PatchPreviewProps {
  const controller = new AbortController()
  return {
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID,
        kind: 'patch',
        contentId: address,
        title: 'change.patch',
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
    loadPatch: vi.fn(),
    reloadPatch: vi.fn(),
    t,
  } as unknown as PatchPreviewProps
}
