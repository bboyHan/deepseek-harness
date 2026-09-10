/** Shared header, metadata, and failure chrome for video previews. */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { IconDownloadOutline16, IconRefreshOutline16, IconRightUpOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { VideoInjected } from './face.ts'
import { durationText, failureLine, humanBytes } from './failure-line.ts'
import { downloadNameOf, hostFileOf } from './rpc.ts'
import type { VideoStore, VideoTabState } from './store.ts'
import css from './PreviewChrome.module.css'

/** Props shared by the video preview body. */
export type VideoPreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<VideoStore>
  & InjectFace<VideoInjected>
  & PropsLocale<'sidebarVideoPreview'>

/** Data selected from one tab's standard runtime props. */
export interface PreviewData {
  /** Tab id. */
  readonly tabId: ReturnType<VideoPreviewProps['useTabInfo']>['tab']['id']
  /** File address. */
  readonly contentId: string
  /** Host-readable file. */
  readonly file: ReturnType<typeof hostFileOf>
  /** File metadata resource. */
  readonly meta: ReturnType<VideoPreviewProps['useResource']>
  /** Current viewer state. */
  readonly state: VideoTabState | undefined
  /** Tab lifetime signal. */
  readonly signal: AbortSignal
}

/** Read the standard tab, resource, and video store values. */
export function usePreviewData(props: VideoPreviewProps): PreviewData {
  const { tab } = props.useTabInfo()
  const meta = props.useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, props.sessionId), [tab.contentId, props.sessionId])
  const state = props.useStore(s => s.byTab[tab.id])
  return { tabId: tab.id, contentId: tab.contentId, file, meta, state, signal: tab.signal }
}

function metadataLines(state: VideoTabState, bytes: number | undefined, t: VideoPreviewProps['t']): string[] {
  const lines: string[] = []
  if (bytes !== undefined) lines.push(t('fileSize', { size: humanBytes(bytes) }))
  const duration = state.metadata?.duration
  if (duration !== undefined) lines.push(t('duration', { duration: durationText(duration) }))
  const width = state.metadata?.width
  const height = state.metadata?.height
  if (width !== undefined && height !== undefined) lines.push(t('resolution', { resolution: `${String(width)} x ${String(height)}` }))
  return lines
}

/** Shared path header, file metadata, reload, download, and native-open actions. */
export function PreviewChrome({ data, state, t, reload, openExternal, children }: {
  data: PreviewData
  state: VideoTabState
  t: VideoPreviewProps['t']
  reload: () => void
  openExternal: () => void
  children: ReactNode
}): ReactNode {
  const displayPath = data.meta.value?.absolutePath ?? data.file.path
  const bytes = data.meta.value?.bytes
  const lines = metadataLines(state, bytes, t)
  const downloadName = downloadNameOf(displayPath)
  return (
    <div className={css.preview} data-video-preview-url={data.contentId}>
      {data.meta.failure !== undefined && (
        <p className={css.changed} data-video-preview-meta-failed={data.meta.failure.code}>
          <span>{t('errorUnavailable', { message: data.meta.failure.message })}</span>
          <button type="button" className={css.action} onClick={reload}>{t('reloadNow')}</button>
        </p>
      )}
      <div className={css.header}>
        <div className={css.path} title={displayPath} data-video-preview-path>{displayPath}</div>
        <button type="button" className={css.tool} aria-label={t('reload')} title={t('reload')} onClick={reload} disabled={state.loading}>
          <IconRefreshOutline16 />
        </button>
        <a className={css.actionLink} href={state.source.src} target="_blank" rel="noreferrer" aria-label={t('openInWindow')} title={t('openInWindow')}>
          <IconRightUpOutline16 size={14} />
        </a>
        <a className={css.actionLink} href={state.source.src} download={downloadName} aria-label={t('download')} title={t('download')}>
          <IconDownloadOutline16 size={14} />
        </a>
        <button type="button" className={css.tool} aria-label={t('openExternal')} title={t('openExternal')} onClick={openExternal} disabled={state.opening}>
          <IconRightUpOutline16 />
        </button>
      </div>
      {lines.length > 0 && (
        <div className={css.meta} data-video-preview-meta>
          {lines.map(line => <span key={line}>{line}</span>)}
        </div>
      )}
      {children}
    </div>
  )
}

/** Common loading placeholder before a store bucket exists. */
export function Loading({ t }: { t: VideoPreviewProps['t'] }): ReactNode {
  return <div className={css.body} data-video-preview-state="loading"><p className={css.statusLine}>{t('loading')}</p></div>
}

/** Common failure row with retry. */
export function FailureLine({ state, t, retry }: {
  state: VideoTabState
  t: VideoPreviewProps['t']
  retry: () => void
}): ReactNode {
  if (state.failure === undefined) return null
  return (
    <p className={css.statusLine} data-video-preview-failed={state.failure.code}>
      <span>{failureLine(t, state.failure)}</span>
      <button type="button" className={css.action} onClick={retry}>{t('retry')}</button>
    </p>
  )
}
