/** Image right-Sidebar file preview. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { imageMimeType } from './media.ts'
import { FailureLine, Loading, PreviewChrome, usePreviewData, useRestoredScroll } from './PreviewChrome.tsx'
import type { ArtifactPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** Image body registered under the right Sidebar tab seat. */
export function ImagePreview(props: ArtifactPreviewProps): ReactNode {
  const data = usePreviewData(props, 'image')
  const { loadImage, reloadImage, actions, t } = props
  const state = data.state
  const started = state !== undefined
  const mime = imageMimeType(data.file.path)
  useEffect(() => {
    if (!started) loadImage(data.tabId, data.file, mime, data.signal)
  }, [started, data.tabId, data.file, mime, data.signal, loadImage])
  const bodyRef = useRestoredScroll(state)
  if (state === undefined) return <Loading t={t} />
  const reload = (): void => { data.meta.reload(); reloadImage(data.tabId, data.file, mime, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reload}>
      <div
        ref={bodyRef}
        className={css.imageBody}
        data-artifact-preview-body
        data-artifact-preview-state="image"
        onScroll={(event) => { actions.scrolled(data.tabId, event.currentTarget.scrollTop) }}
      >
        {state.image !== undefined && (
          <img
            className={css.image}
            src={state.image.src}
            alt={data.file.path}
            data-artifact-preview-image
          />
        )}
        <FailureLine state={state} t={t} retry={() => { loadImage(data.tabId, data.file, mime, data.signal) }} />
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </PreviewChrome>
  )
}
