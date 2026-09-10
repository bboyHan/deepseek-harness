/** CSV/TSV right-Sidebar file preview. */
import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { parseDelimited } from './csv.ts'
import { FailureLine, Loading, PreviewChrome, usePreviewData, useRestoredScroll } from './PreviewChrome.tsx'
import type { ArtifactPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

const MAX_COLUMNS = 40

function delimiterOf(path: string): ',' | '\t' {
  return path.toLowerCase().endsWith('.tsv') ? '\t' : ','
}

/** CSV body registered under the right Sidebar tab seat. */
export function CsvPreview(props: ArtifactPreviewProps): ReactNode {
  const data = usePreviewData(props, 'csv')
  const { loadText, reloadText, actions, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) loadText(data.tabId, 'csv', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, loadText])
  const bodyRef = useRestoredScroll(state)
  const table = useMemo(() => {
    if (state?.text === undefined) return undefined
    return parseDelimited(state.text.text, delimiterOf(data.file.path))
  }, [state?.text, data.file.path])
  if (state === undefined) return <Loading t={t} />
  const reload = (): void => { reloadText(data.tabId, 'csv', data.file, data.signal) }
  const columns = Math.min(table?.columns ?? 0, MAX_COLUMNS)
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reload}>
      <div
        ref={bodyRef}
        className={css.body}
        data-artifact-preview-body
        data-artifact-preview-state="csv"
        onScroll={(event) => { actions.scrolled(data.tabId, event.currentTarget.scrollTop) }}
      >
        {table !== undefined && table.rows.length === 0 && (
          <p className={css.statusLine} data-artifact-preview-csv-empty>{t('csvEmpty')}</p>
        )}
        {table !== undefined && table.rows.length > 0 && (
          <>
            <div className={css.tableMeta}>{t('csvRows', { rows: table.rows.length })}</div>
            <table className={css.table}>
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index}>
                    {Array.from({ length: columns }, (_, column) => (
                      <td key={column}>{row[column] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.columns > MAX_COLUMNS && <p className={css.note}>{t('csvTruncatedColumns', { columns: MAX_COLUMNS })}</p>}
            {state.text?.eof === false && <p className={css.note}>{t('truncatedText')}</p>}
          </>
        )}
        <FailureLine state={state} t={t} retry={() => { loadText(data.tabId, 'csv', data.file, data.signal) }} />
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </PreviewChrome>
  )
}
