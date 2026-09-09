/** Shared header and failure chrome for office preview bodies. */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { OfficeInjected } from './face.ts'
import { failureLine, humanBytes, officeFailureOf } from './failure-line.ts'
import { hostFileOf } from './rpc.ts'
import type { OfficeStore, OfficeTabState } from './store.ts'
import type { OfficeViewer } from './definitions.ts'
import css from './PreviewChrome.module.css'

/** Props shared by all office bodies. */
export type OfficePreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<OfficeStore>
  & InjectFace<OfficeInjected>
  & PropsLocale<'sidebarOfficePreview'>

/** Data selected from one tab's standard runtime props. */
export interface PreviewData {
  /** Tab id. */
  readonly tabId: ReturnType<OfficePreviewProps['useTabInfo']>['tab']['id']
  /** File address. */
  readonly contentId: string
  /** Host-readable file. */
  readonly file: ReturnType<typeof hostFileOf>
  /** File metadata resource. */
  readonly meta: ReturnType<OfficePreviewProps['useResource']>
  /** Current viewer state. */
  readonly state: OfficeTabState | undefined
  /** Tab lifetime signal. */
  readonly signal: AbortSignal
}

/** Read the standard tab, resource, and office store values. */
export function usePreviewData(props: OfficePreviewProps, viewer: OfficeViewer): PreviewData {
  const { tab } = props.useTabInfo()
  const meta = props.useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, props.sessionId), [tab.contentId, props.sessionId])
  const state = props.useStore(s => s.byTab[tab.id])
  return { tabId: tab.id, contentId: tab.contentId, file, meta, state: state?.viewer === viewer ? state : undefined, signal: tab.signal }
}

/** Shared loading placeholder. */
export function Loading({ t }: { t: OfficePreviewProps['t'] }): ReactNode {
  return <p className={css.statusLine}>{t('loading')}</p>
}

/** Shared failure row with retry. */
export function FailureLine({ state, t, retry }: {
  state: OfficeTabState
  t: OfficePreviewProps['t']
  retry: () => void
}): ReactNode {
  if (state.failure === undefined) return null
  return (
    <p className={css.statusLine}>
      <span>{failureLine(t, state.failure)}</span>
      <button type="button" className={css.action} onClick={retry}>{t('retry')}</button>
    </p>
  )
}

/** Shared path header and reload action. */
export function PreviewChrome({ data, state, t, reload, children }: {
  data: PreviewData
  state: OfficeTabState
  t: OfficePreviewProps['t']
  reload: () => void
  children: ReactNode
}): ReactNode {
  const displayPath = data.meta.value?.absolutePath ?? data.file.path
  const bytes = state.source?.bytes
    ?? state.docx?.bytes
    ?? state.xlsx?.bytes
    ?? data.meta.value?.bytes
  return (
    <div className={css.preview} data-office-preview-url={data.contentId}>
      {data.meta.failure !== undefined && (
        <p className={css.statusLine}>
          <span>{failureLine(t, officeFailureOf(data.meta.failure))}</span>
          <button type="button" className={css.action} onClick={reload}>{t('reloadNow')}</button>
        </p>
      )}
      <div className={css.header}>
        <div className={css.path} title={displayPath}>{displayPath}</div>
        <button type="button" className={css.tool} aria-label={t('reload')} title={t('reload')} onClick={reload} disabled={state.loading}>
          <IconRefreshOutline16 />
        </button>
      </div>
      {bytes !== undefined && (
        <div className={css.meta} data-office-preview-meta>
          {t('fileSize', { size: humanBytes(bytes) })}
        </div>
      )}
      {children}
    </div>
  )
}
