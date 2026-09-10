/** PDF right-Sidebar preview using the browser's PDF document viewer. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { IconDownloadOutline16, IconRightUpOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { FailureLine, Loading, PreviewChrome, usePreviewData } from './PreviewChrome.tsx'
import type { OfficePreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** PDF body registered under the office tab seat. */
export function PdfPreview(props: OfficePreviewProps): ReactNode {
  const data = usePreviewData(props, 'pdf')
  const { load, reload, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) load(data.tabId, 'pdf', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, load])
  if (state === undefined) return <Loading t={t} />
  const reloadNow = (): void => { reload(data.tabId, 'pdf', data.file, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reloadNow}>
      <div className={css.pdfBody}>
        {state.source !== undefined && (
          <>
            <div className={css.pdfActions} data-office-preview-pdf-actions>
              <a className={css.actionLink} href={state.source.src} target="_blank" rel="noreferrer" aria-label={t('openPdf')} title={t('openPdf')}>
                <IconRightUpOutline16 size={14} />
              </a>
              <a className={css.actionLink} href={state.source.src} download={data.file.path.split('/').at(-1) ?? 'document.pdf'} aria-label={t('downloadPdf')} title={t('downloadPdf')}>
                <IconDownloadOutline16 size={14} />
              </a>
            </div>
            <iframe className={css.pdf} title={t('pdfLabel')} src={state.source.src} />
          </>
        )}
        {state.source === undefined && !state.loading && state.failure === undefined && (
          <p className={css.statusLine} data-office-preview-empty>{t('empty')}</p>
        )}
        <FailureLine state={state} t={t} retry={() => { load(data.tabId, 'pdf', data.file, data.signal) }} />
        {state.loading && <Loading t={t} />}
      </div>
    </PreviewChrome>
  )
}
