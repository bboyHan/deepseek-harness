/**
 * Browser half: register rendered artifact preview tab types for the right Sidebar.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client'
import { CsvPreview } from './CsvPreview.tsx'
import { ImagePreview } from './ImagePreview.tsx'
import { JsonPreview } from './JsonPreview.tsx'
import { MarkdownPreview } from './MarkdownPreview.tsx'
import { Config } from '../index.ts'
import type { Config as ArtifactPreviewConfig, ResolvedConfig } from '../index.ts'
import { artifactDefinitions, VIEWERS } from './definitions.ts'
import { artifactFace } from './face.ts'
import { createReadBytes, createReadText } from './rpc.ts'
import { createArtifactStore } from './store.ts'
import { en, NS, zh } from './locales.ts'

export type { ArtifactPreviewProps } from './PreviewChrome.tsx'
export type { ArtifactPreviewConfig, ResolvedConfig }
export type { ArtifactInjected } from './face.ts'
export type { ArtifactViewer } from './definitions.ts'
export type { ArtifactImage, ArtifactState, ArtifactStore, ArtifactTabState, ArtifactText } from './store.ts'
export type { SidebarArtifactPreviewKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** Rendered previews ignore file line navigation but keep the resource params typed for openResource. */
    file: WorkspaceFileParams
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Artifact-preview progress, controls, parser, and failure lines. */
    sidebarArtifactPreview: import('./locales.ts').SidebarArtifactPreviewKey
  }
}

export { Config }

/** Required browser services: the tab registry, the slot registry, copy, and the Remote face. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

/**
 * Client plugin body: register type definitions, dictionaries, and body seats.
 * @param ctx - client root context carrying the registries and Remote face.
 * @param config - browser-only preview limits.
 */
export function apply(ctx: ClientContext, config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  const store = createArtifactStore()
  const face = artifactFace(createReadText(ctx.remote), createReadBytes(ctx.remote), config)
  ctx.effect(() => {
    const disposers = artifactDefinitions().map(definition => ctx.sidebarRightTabs.register(definition))
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }, 'ui-sidebar-artifact-preview: tab types')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-artifact-preview: dictionaries')

  const seats = [
    [VIEWERS.markdown.id, MarkdownPreview],
    [VIEWERS.image.id, ImagePreview],
    [VIEWERS.json.id, JsonPreview],
    [VIEWERS.csv.id, CsvPreview],
  ] as const
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', function* () {
    for (const [key, component] of seats) {
      yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key, locale: NS, store, inject: face }, component)
    }
  }), 'ui-sidebar-artifact-preview: bodies')
}
