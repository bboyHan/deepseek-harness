/** Native browser video right-Sidebar file preview. */
import { useEffect } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { FailureLine, Loading, PreviewChrome, usePreviewData } from './PreviewChrome.tsx'
import type { VideoPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

function metadataOf(video: HTMLVideoElement): { duration?: number; width?: number; height?: number } {
  return {
    ...Number.isFinite(video.duration) ? { duration: video.duration } : {},
    ...video.videoWidth > 0 ? { width: video.videoWidth } : {},
    ...video.videoHeight > 0 ? { height: video.videoHeight } : {},
  }
}

function errorOf(video: HTMLVideoElement): { code: string; message: string } {
  const mediaCode = video.error?.code
  const failure = (code: string): { code: string; message: string } => ({ code, message: code })
  switch (mediaCode) {
    case 1: return failure('video-preview/aborted')
    case 2: return failure('video-preview/network')
    case 3: return failure('video-preview/decode')
    case 4: return failure('video-preview/unsupported')
    default: return failure('video-preview/unavailable')
  }
}

/** Video body registered under the right Sidebar tab seat. */
export function VideoPreview(props: VideoPreviewProps): ReactNode {
  const data = usePreviewData(props)
  const { load, reload, openExternal, actions, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) load(data.tabId, data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, load])
  if (state === undefined) return <Loading t={t} />
  const refresh = (): void => { data.meta.reload(); reload(data.tabId, data.file, data.signal) }
  const openNative = (): void => { openExternal(data.tabId, data.meta.value?.absolutePath ?? data.file.path, data.signal) }
  const handleMetadata = (event: SyntheticEvent<HTMLVideoElement>): void => {
    actions.metadata(data.tabId, metadataOf(event.currentTarget))
  }
  const handleError = (event: SyntheticEvent<HTMLVideoElement>): void => {
    actions.failed(data.tabId, errorOf(event.currentTarget))
  }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={refresh} openExternal={openNative}>
      <div className={css.body} data-video-preview-body>
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
        <FailureLine state={state} t={t} retry={refresh} />
        {state.failure === undefined && (
          <div className={css.stage}>
            <video
              key={state.source.src}
              className={css.video}
              src={state.source.src}
              title={t('videoLabel')}
              controls
              preload="metadata"
              playsInline
              data-video-preview-player
              onLoadedMetadata={handleMetadata}
              onError={handleError}
            />
          </div>
        )}
      </div>
    </PreviewChrome>
  )
}
