/**
 * Browser half: register PDF, DOCX, and XLSX right-Sidebar viewers.
 *
 * The shared face owns byte-window reads and Blob URLs. Each body parses or
 * displays only its own format, so a parser failure cannot affect other viewers.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileParams } from '@deepseek-ai/dsh-api-workspace-files/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-resources/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import { Config } from '../index.ts'
import type { Config as OfficePreviewConfig, ResolvedConfig } from '../index.ts'
import { DocxPreview } from './DocxPreview.tsx'
import { PdfPreview } from './PdfPreview.tsx'
import { XlsxPreview } from './XlsxPreview.tsx'
import { officeDefinitions, VIEWERS } from './definitions.ts'
import { officeFace } from './face.ts'
import { createReadBytes } from './rpc.ts'
import { createOfficeStore } from './store.ts'
import { en, NS, zh } from './locales.ts'

export type { OfficePreviewProps } from './PreviewChrome.tsx'
export type { OfficePreviewConfig, ResolvedConfig }
export type { OfficeInjected } from './face.ts'
export type { OfficeViewer } from './definitions.ts'
export type { OfficeBinary, OfficeDocx, OfficeSheet, OfficeState, OfficeStore, OfficeTabState, OfficeWorkbook } from './store.ts'
export type { SidebarOfficePreviewKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-sidebar-right/client' {
  interface SidebarRightResourceParamsMap {
    /** Office previews do not use file navigation params but keep the address typed. */
    file: WorkspaceFileParams
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Office preview progress, parser, and failure lines. */
    sidebarOfficePreview: import('./locales.ts').SidebarOfficePreviewKey
  }
}

export { Config }

/** Required browser services for the office viewers. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'remote', 'remote.workspaceFiles']

/**
 * Browser plugin body.
 * @param ctx - client root context carrying registries and the Remote face.
 * @param config - office byte and table limits.
 */
export function apply(ctx: ClientContext, config: ResolvedConfig = Config({}) as ResolvedConfig): void {
  const store = createOfficeStore()
  const face = officeFace(createReadBytes(ctx.remote), config)
  ctx.effect(() => {
    const disposers = officeDefinitions().map(definition => ctx.sidebarRightTabs.register(definition))
    return () => { for (const dispose of disposers.reverse()) dispose() }
  }, 'ui-sidebar-office-preview: tab types')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-office-preview: dictionaries')

  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', function* () {
    yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWERS.pdf.id, locale: NS, store, inject: face }, PdfPreview)
    yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWERS.docx.id, locale: NS, store, inject: face }, DocxPreview)
    yield ctx.slots.register({ name: 'sidebar.right.pane.tab', key: VIEWERS.xlsx.id, locale: NS, store, inject: face }, XlsxPreview)
  }), 'ui-sidebar-office-preview: bodies')
}
