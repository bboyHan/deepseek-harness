/** Rendered Markdown right-Sidebar file preview. */
import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { FailureLine, Loading, PreviewChrome, usePreviewData, useRestoredScroll } from './PreviewChrome.tsx'
import type { ArtifactPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

function markdownLabels(t: ArtifactPreviewProps['t']): MarkdownLabels {
  return {
    code: { copyLabel: t('markdown.copy'), copiedLabel: t('markdown.copied') },
    footnotes: t('markdown.footnotes'),
  }
}

/** Markdown body registered under the right Sidebar tab seat. */
export function MarkdownPreview(props: ArtifactPreviewProps): ReactNode {
  const data = usePreviewData(props, 'markdown')
  const { loadText, reloadText, actions, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) loadText(data.tabId, 'markdown', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, loadText])
  const bodyRef = useRestoredScroll(state)
  const labels = useMemo(() => markdownLabels(t), [t])
  if (state === undefined) return <Loading t={t} />
  const reload = (): void => { reloadText(data.tabId, 'markdown', data.file, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reload}>
      <div
        ref={bodyRef}
        className={css.body}
        data-artifact-preview-body
        data-artifact-preview-state="markdown"
        onScroll={(event) => { actions.scrolled(data.tabId, event.currentTarget.scrollTop) }}
      >
        {state.text !== undefined && (
          <div className={css.markdown}>
            <MarkdownText text={state.text.text} labels={labels} />
            {!state.text.eof && <p className={css.note}>{t('truncatedText')}</p>}
          </div>
        )}
        <FailureLine state={state} t={t} retry={() => { loadText(data.tabId, 'markdown', data.file, data.signal) }} />
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </PreviewChrome>
  )
}
