/** Shared chrome for artifact preview bodies. */
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { fileSizeText, IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { ArtifactInjected } from './face.ts'
import { artifactFailureOf, failureLine } from './failure-line.ts'
import { hostFileOf } from './rpc.ts'
import type { ArtifactStore, ArtifactTabState } from './store.ts'
import type { ArtifactViewer } from './definitions.ts'
import css from './PreviewChrome.module.css'

/** Props shared by all artifact preview bodies. */
export type ArtifactPreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<ArtifactStore>
  & InjectFace<ArtifactInjected>
  & PropsLocale<'sidebarArtifactPreview'>

/** Metadata and state one body reads from the shared sources. */
export interface PreviewData {
  /** Tab id. */
  readonly tabId: ReturnType<ArtifactPreviewProps['useTabInfo']>['tab']['id']
  /** Tab content address. */
  readonly contentId: string
  /** Host-readable file. */
  readonly file: ReturnType<typeof hostFileOf>
  /** File metadata resource. */
  readonly meta: ReturnType<ArtifactPreviewProps['useResource']>
  /** Store bucket for this tab, if created. */
  readonly state: ArtifactTabState | undefined
  /** Tab lifetime signal. */
  readonly signal: AbortSignal
}

/**
 * Read standard tab, resource and store data for one viewer.
 * @param props - composed slot props.
 * @param viewer - viewer bucket to select.
 * @returns shared data used by the body.
 */
export function usePreviewData(props: ArtifactPreviewProps, viewer: ArtifactViewer): PreviewData {
  const { tab } = props.useTabInfo()
  const meta = props.useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, props.sessionId), [tab.contentId, props.sessionId])
  const state = props.useStore(s => s.byTab[tab.id])
  return {
    tabId: tab.id,
    contentId: tab.contentId,
    file,
    meta,
    state: state?.viewer === viewer ? state : undefined,
    signal: tab.signal,
  }
}

/**
 * Restore scroll offset for a loaded body.
 * @param state - tab state.
 * @returns the ref for the scroll container.
 */
export function useRestoredScroll(state: ArtifactTabState | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const loaded = state?.text !== undefined || state?.image !== undefined
  const scrollTop = loaded ? state.scrollTop : undefined
  useEffect(() => {
    const body = ref.current
    if (scrollTop !== undefined && body !== null) body.scrollTop = scrollTop
  }, [scrollTop])
  return ref
}

/**
 * Shared preview scaffold: change bar, header path, reload control, and body.
 * @param props - display inputs and callbacks.
 * @returns the preview shell.
 */
export function PreviewChrome({
  data, state, t, reload, children,
}: {
  data: PreviewData
  state: ArtifactTabState
  t: ArtifactPreviewProps['t']
  reload: () => void
  children: ReactNode
}): ReactNode {
  const displayPath = data.meta.value?.absolutePath ?? data.file.path
  const bytes = state.text?.bytes ?? state.image?.bytes ?? data.meta.value?.bytes
  const loadedVersion = state.text?.version ?? state.image?.version
  const changed = loadedVersion !== undefined
    && data.meta.value !== undefined
    && loadedVersion !== data.meta.value.version
  return (
    <div className={css.preview} data-artifact-preview-url={data.contentId}>
      {data.meta.failure !== undefined
        ? (
          <p className={css.changed} data-artifact-preview-meta-failed={data.meta.failure.code}>
            <span>{failureLine(t, artifactFailureOf(data.meta.failure))}</span>
            <button type="button" className={css.action} data-artifact-preview-reload-now onClick={reload}>
              {t('reloadNow')}
            </button>
          </p>
        )
        : changed && (
          <p className={css.changed} data-artifact-preview-changed>
            <span>{t('changed')}</span>
            <button type="button" className={css.action} data-artifact-preview-reload-now onClick={reload}>
              {t('reloadNow')}
            </button>
          </p>
        )}
      <div className={css.header}>
        <div className={css.path} title={displayPath} data-artifact-preview-path>{displayPath}</div>
        <button
          type="button"
          className={css.tool}
          aria-label={t('reload')}
          title={t('reload')}
          data-artifact-preview-tool="reload"
          onClick={reload}
          disabled={state.loading}
        >
          <IconRefreshOutline16 />
        </button>
      </div>
      {bytes !== undefined && (
        <div className={css.meta} data-artifact-preview-meta>
          {t('fileSize', { size: fileSizeText(bytes) })}
        </div>
      )}
      {children}
    </div>
  )
}

/**
 * Common loading placeholder before a store bucket exists.
 * @param t - locale seat.
 * @returns status line.
 */
export function Loading({ t }: { t: ArtifactPreviewProps['t'] }): ReactNode {
  return (
    <div className={css.status} data-artifact-preview-state="loading">
      <p className={css.statusLine}>{t('loading')}</p>
    </div>
  )
}

/**
 * Common failure row with retry.
 * @param props - failure inputs.
 * @returns failure row, or null.
 */
export function FailureLine({
  state, t, retry,
}: {
  state: ArtifactTabState
  t: ArtifactPreviewProps['t']
  retry: () => void
}): ReactNode {
  if (state.failure === undefined) return null
  return (
    <p className={css.statusLine} data-artifact-preview-failed={state.failure.code}>
      <span>{failureLine(t, state.failure)}</span>
      <button type="button" className={css.action} data-artifact-preview-retry onClick={retry}>
        {t('retry')}
      </button>
    </p>
  )
}
