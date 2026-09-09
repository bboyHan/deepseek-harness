/** Browser half: register the SVG right-Sidebar viewer. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { Config } from '../index.ts'
import type { Config as SvgPreviewConfig, ResolvedConfig } from '../index.ts'
import { SvgPreview } from './SvgPreview.tsx'
import { svgDefinitions, VIEWER } from './definitions.ts'
import { svgFace } from './face.ts'
import { en, NS, zh } from './locales.ts'
import { createReadBytes } from './rpc.ts'
import { createSvgStore } from './store.ts'

export type { SvgPreviewProps } from './PreviewChrome.tsx'
export type { SvgPreviewConfig, ResolvedConfig }
export type { SvgInjected } from './face.ts'
export type { SvgDocument, SvgState, SvgStore, SvgTabState } from './store.ts'
export type { SidebarSvgPreviewKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** SVG previews do not use file navigation params but retain typed file addresses. */
    file: WorkspaceFileParams
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** SVG preview progress, security, and failure lines. */
    sidebarSvgPreview: import('./locales.ts').SidebarSvgPreviewKey
  }
}

export { Config }

/** Required browser services for the SVG viewer. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

/**
 * Browser plugin body.
 * @param ctx - client root context carrying registries and the Remote face.
 * @param config - SVG byte limit.
 */
export function apply(ctx: ClientContext, config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  const store = createSvgStore()
  const face = svgFace(createReadBytes(ctx.remote), config)
  ctx.effect(() => {
    const disposers = svgDefinitions().map(definition => ctx.sidebarRightTabs.register(definition))
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }, 'ui-sidebar-svg-preview: tab types')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-svg-preview: dictionaries')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', function* () {
    yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWER.id, locale: NS, store, inject: face }, SvgPreview)
  }), 'ui-sidebar-svg-preview: body')
}
