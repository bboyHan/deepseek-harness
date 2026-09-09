/** Browser half: register the unified diff preview with the right Sidebar. */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client'
import { Config } from '../index.ts'
import type { Config as PatchPreviewConfig, ResolvedConfig } from '../index.ts'
import { PatchPreview } from './PatchPreview.tsx'
import { patchFace } from './face.ts'
import { patchDefinition, PATCH_PREVIEW_ID } from './definitions.ts'
import { createReadText } from './rpc.ts'
import { createPatchStore } from './store.ts'
import { en, NS, zh } from './locales.ts'

export type { PatchPreviewConfig, ResolvedConfig }
export type { PatchPreviewProps } from './PatchPreview.tsx'
export type { PatchInjected } from './face.ts'
export type { ReadPatchText, SessionFile, WorkspaceFilesPatchRemote } from './rpc.ts'
export type { ParsedPatch, PatchParseResult } from './patch.ts'
export type { PatchState, PatchStore, PatchTabState } from './store.ts'
export type { SidebarPatchPreviewKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** Patch preview reads a file resource without line navigation. */
    file: WorkspaceFileParams
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Unified diff preview progress, summary, controls, and failure lines. */
    sidebarPatchPreview: import('./locales.ts').SidebarPatchPreviewKey
  }
}

export { Config }

/** Required browser services for the tab registry, locale, slots, and file reads. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

/**
 * Register the patch tab type, dictionary, store, and keyed body.
 * @param ctx - client root context carrying registries and the Remote face.
 * @param config - validated parser limits.
 */
export function apply(ctx: ClientContext, config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  ctx.effect(() => ctx.sidebarRightTabs.register(patchDefinition()), 'ui-sidebar-patch-preview: patch type')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-patch-preview: dictionaries')

  const store = createPatchStore()
  const face = patchFace(createReadText(ctx.remote), config)
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register(
    { name: 'sidebar.right.pane.tab', key: PATCH_PREVIEW_ID, locale: NS, store, inject: face },
    PatchPreview,
  )), 'ui-sidebar-patch-preview: patch body')
}
