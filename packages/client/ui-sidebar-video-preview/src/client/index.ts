/** Browser half: register the video right-Sidebar viewer. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { Config } from '../config.ts'
import type { Config as VideoPreviewConfig, ResolvedConfig } from '../config.ts'
import { VideoPreview } from './VideoPreview.tsx'
import { videoDefinitions, VIEWER } from './definitions.ts'
import { videoFace } from './face.ts'
import { en, NS, zh } from './locales.ts'
import { createVideoStore } from './store.ts'

export type { VideoPreviewProps } from './PreviewChrome.tsx'
export type { VideoPreviewConfig, ResolvedConfig }
export type { VideoInjected } from './face.ts'
export type { SessionFile, VideoRemote } from './rpc.ts'
export type { VideoFailure, VideoMetadata, VideoSource, VideoState, VideoStore, VideoTabState } from './store.ts'
export type { SidebarVideoPreviewKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** Video previews do not use file navigation params but retain typed file addresses. */
    file: WorkspaceFileParams
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Video preview progress, metadata, controls, and failure lines. */
    sidebarVideoPreview: import('./locales.ts').SidebarVideoPreviewKey
  }
}

export { Config }

/** Required browser services for the video viewer. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.session']

/**
 * Browser plugin body.
 * @param ctx - client root context carrying registries and the Remote face.
 */
export function apply(ctx: ClientContext, _config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  const store = createVideoStore()
  const face = videoFace(ctx.remote)
  ctx.effect(() => {
    const disposers = videoDefinitions().map(definition => ctx.sidebarRightTabs.register(definition))
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }, 'ui-sidebar-video-preview: tab types')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-video-preview: dictionaries')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', function* () {
    yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWER.id, locale: NS, store, inject: face }, VideoPreview)
  }), 'ui-sidebar-video-preview: body')
}
