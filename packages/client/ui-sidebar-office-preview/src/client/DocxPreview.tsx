/** DOCX right-Sidebar preview. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { FailureLine, Loading, PreviewChrome, usePreviewData } from './PreviewChrome.tsx'
import type { OfficePreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** DOCX body registered under the office tab seat. */
export function DocxPreview(props: OfficePreviewProps): ReactNode {
  const data = usePreviewData(props, 'docx')
  const { load, reload, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) load(data.tabId, 'docx', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, load])
  if (state === undefined) return <Loading t={t} />
  const reloadNow = (): void => { reload(data.tabId, 'docx', data.file, data.signal) }
  const html = state.docx?.html
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reloadNow}>
      <div className={css.body}>
        {html !== undefined && <div className={css.document} dangerouslySetInnerHTML={{ __html: html }} />}
        {html === undefined && !state.loading && state.failure === undefined && <p className={css.statusLine}>{t('empty')}</p>}
        <FailureLine state={state} t={t} retry={() => { load(data.tabId, 'docx', data.file, data.signal) }} />
        {state.loading && <Loading t={t} />}
      </div>
    </PreviewChrome>
  )
}
