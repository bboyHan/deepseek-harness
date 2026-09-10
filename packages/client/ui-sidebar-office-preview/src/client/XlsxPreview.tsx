/** XLSX right-Sidebar preview with bounded worksheet tables. */
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { FailureLine, Loading, PreviewChrome, usePreviewData } from './PreviewChrome.tsx'
import type { OfficePreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** XLSX body registered under the office tab seat. */
export function XlsxPreview(props: OfficePreviewProps): ReactNode {
  const data = usePreviewData(props, 'xlsx')
  const { load, reload, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) load(data.tabId, 'xlsx', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, load])
  if (state === undefined) return <Loading t={t} />
  const reloadNow = (): void => { reload(data.tabId, 'xlsx', data.file, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reloadNow}>
      <div className={css.body}>
        {state.xlsx?.sheets.map(sheet => (
          <section key={sheet.name}>
            <p className={css.sheetMeta}>{sheet.name} · {t('sheetRows', { rows: sheet.rows.length })}</p>
            {sheet.rows.length === 0
              ? <p className={css.statusLine}>{t('sheetEmpty')}</p>
              : (
                <table className={css.sheet}>
                  <tbody>
                    {sheet.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            {sheet.truncated && <p className={css.note}>{t('sheetTruncated')}</p>}
          </section>
        ))}
        {state.xlsx?.sheets.length === 0 && <p className={css.statusLine}>{t('empty')}</p>}
        <FailureLine state={state} t={t} retry={() => { load(data.tabId, 'xlsx', data.file, data.signal) }} />
        {state.loading && <Loading t={t} />}
      </div>
    </PreviewChrome>
  )
}
