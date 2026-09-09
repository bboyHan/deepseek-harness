import { vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { VideoPreviewProps } from '../src/client/PreviewChrome.tsx'
import type { VideoStore } from '../src/client/store.ts'

export const TAB_ID = 'tab-1' as TabId
export const SESSION = 's-1' as SessionId
export const PATH = 'work/clip.mp4'
export const ABSOLUTE_PATH = '/host/project/work/clip.mp4'
export const ADDRESS = 'dsh-resource://file/session/s-1/work/clip.mp4'

export function t(key: string, params?: Record<string, unknown>): string {
  return params === undefined ? key : `${key}(${Object.entries(params).map(([name, value]) => `${name}=${String(value)}`).join(',')})`
}

export function hookOf<T>(inst: { subscribe: (fn: () => void) => () => void; getSnapshot: () => T }) {
  return function useSelector<S>(sel: (state: T) => S): S {
    return sel(useSyncExternalStore(inst.subscribe, inst.getSnapshot))
  }
}

type FileResource = ReturnType<VideoPreviewProps['useResource']>

export function meta(changed = false): FileResource {
  return {
    status: 'live',
    value: { absolutePath: ABSOLUTE_PATH, version: 'v1', bytes: 4096, changed },
    failure: undefined,
    reload: vi.fn<() => void>(),
  }
}

export function propsFor(instance: ReturnType<VideoStore['create']>, address = ADDRESS): VideoPreviewProps {
  const controller = new AbortController()
  return {
    useTabInfo: () => ({
      sidebar: { expanded: true, fullscreen: false },
      panel: { id: 'pane-1' },
      tab: {
        id: TAB_ID,
        kind: 'video',
        contentId: address,
        title: 'clip',
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
    openExternal: vi.fn(),
    t,
  } as unknown as VideoPreviewProps
}
