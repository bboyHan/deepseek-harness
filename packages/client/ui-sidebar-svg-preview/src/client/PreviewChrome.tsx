/** Shared header, loading, failure, and scroll chrome for SVG previews. */
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { SvgInjected } from './face.ts'
import { failureLine, humanBytes, svgFailureOf } from './failure-line.ts'
import { hostFileOf } from './rpc.ts'
import type { SvgStore, SvgTabState } from './store.ts'
import css from './PreviewChrome.module.css'

/** Props shared by the SVG preview body. */
export type SvgPreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<SvgStore>
  & InjectFace<SvgInjected>
  & PropsLocale<'sidebarSvgPreview'>

/** Data selected from one tab's standard runtime props. */
export interface PreviewData {
  /** Tab id. */
  readonly tabId: ReturnType<SvgPreviewProps['useTabInfo']>['tab']['id']
  /** File address. */
  readonly contentId: string
  /** Host-readable file. */
  readonly file: ReturnType<typeof hostFileOf>
  /** File metadata resource. */
  readonly meta: ReturnType<SvgPreviewProps['useResource']>
  /** Current viewer state. */
  readonly state: SvgTabState | undefined
  /** Tab lifetime signal. */
  readonly signal: AbortSignal
}

/** Read the standard tab, resource, and SVG store values. */
export function usePreviewData(props: SvgPreviewProps): PreviewData {
  const { tab } = props.useTabInfo()
  const meta = props.useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, props.sessionId), [tab.contentId, props.sessionId])
  const state = props.useStore(s => s.byTab[tab.id])
  return { tabId: tab.id, contentId: tab.contentId, file, meta, state, signal: tab.signal }
}

/** Restore the saved scroll offset after the document loads. */
export function useRestoredScroll(state: SvgTabState | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const loaded = state?.document !== undefined
  useEffect(() => {
    const body = ref.current
    if (loaded && body !== null) body.scrollTop = state.scrollTop
  }, [loaded, state?.scrollTop])
  return ref
}

/** Shared path header and reload action. */
export function PreviewChrome({ data, state, t, reload, children }: {
  data: PreviewData
  state: SvgTabState
  t: SvgPreviewProps['t']
  reload: () => void
  children: ReactNode
}): ReactNode {
  const displayPath = data.meta.value?.absolutePath ?? data.file.path
  const bytes = state.document?.bytes ?? data.meta.value?.bytes
  const changed = state.document !== undefined
    && data.meta.value !== undefined
    && state.document.version !== data.meta.value.version
  return (
    <div className={css.preview} data-svg-preview-url={data.contentId}>
      {data.meta.failure !== undefined
        ? (
          <p className={css.changed} data-svg-preview-meta-failed={data.meta.failure.code}>
            <span>{failureLine(t, svgFailureOf(data.meta.failure))}</span>
            <button type="button" className={css.action} onClick={reload}>{t('reloadNow')}</button>
          </p>
        )
        : changed && (
          <p className={css.changed} data-svg-preview-changed>
            <span>{t('changed')}</span>
            <button type="button" className={css.action} onClick={reload}>{t('reloadNow')}</button>
          </p>
        )}
      <div className={css.header}>
        <div className={css.path} title={displayPath} data-svg-preview-path>{displayPath}</div>
        <button type="button" className={css.tool} aria-label={t('reload')} title={t('reload')} onClick={reload} disabled={state.loading}>
          <IconRefreshOutline16 />
        </button>
      </div>
      {bytes !== undefined && (
        <div className={css.meta} data-svg-preview-meta>
          {t('fileSize', { size: humanBytes(bytes) })}
        </div>
      )}
      {children}
    </div>
  )
}

/** Common loading placeholder before a store bucket exists. */
export function Loading({ t }: { t: SvgPreviewProps['t'] }): ReactNode {
  return <div className={css.status} data-svg-preview-state="loading"><p className={css.statusLine}>{t('loading')}</p></div>
}

/** Common failure row with retry. */
export function FailureLine({ state, t, retry }: {
  state: SvgTabState
  t: SvgPreviewProps['t']
  retry: () => void
}): ReactNode {
  if (state.failure === undefined) return null
  return (
    <p className={css.statusLine} data-svg-preview-failed={state.failure.code}>
      <span>{failureLine(t, state.failure)}</span>
      <button type="button" className={css.action} onClick={retry}>{t('retry')}</button>
    </p>
  )
}
