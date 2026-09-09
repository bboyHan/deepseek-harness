/** Rendered SVG right-Sidebar file preview. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconWarningOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { FailureLine, Loading, PreviewChrome, usePreviewData, useRestoredScroll } from './PreviewChrome.tsx'
import type { SvgPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** SVG body registered under the right Sidebar tab seat. */
export function SvgPreview(props: SvgPreviewProps): ReactNode {
  const data = usePreviewData(props)
  const { load, reload, actions, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) load(data.tabId, data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, load])
  const bodyRef = useRestoredScroll(state)
  if (state === undefined) return <Loading t={t} />
  const refresh = (): void => { data.meta.reload(); reload(data.tabId, data.file, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={refresh}>
      <div
        ref={bodyRef}
        className={css.body}
        data-svg-preview-body
        data-svg-preview-state="svg"
        onScroll={(event) => { actions.scrolled(data.tabId, event.currentTarget.scrollTop) }}
      >
        {(state.document?.warnings ?? []).map(warning => (
          <div key={warning} className={css.notice} data-svg-preview-notice={warning} role="status">
            <IconWarningOutline16 size={14} />
            <span>
              {warning === 'active-content-removed'
                ? t('activeContentRemoved')
                : warning === 'external-resources-removed'
                  ? t('externalResourcesRemoved')
                  : t('externalResourcesLoaded')}
            </span>
          </div>
        ))}
        {state.document !== undefined && (
          <img className={css.image} src={state.document.src} alt={data.file.path} data-svg-preview-image />
        )}
        <FailureLine state={state} t={t} retry={() => { load(data.tabId, data.file, data.signal) }} />
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </PreviewChrome>
  )
}
