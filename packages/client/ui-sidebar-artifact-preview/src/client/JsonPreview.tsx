/** JSON right-Sidebar file preview. */
import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { JsonTree } from '@deepseek-ai/dsh-client-ui-primitives'
import type { JsonTreeLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import { FailureLine, Loading, PreviewChrome, usePreviewData, useRestoredScroll } from './PreviewChrome.tsx'
import type { ArtifactPreviewProps } from './PreviewChrome.tsx'
import css from './PreviewChrome.module.css'

/** Parsed JSON payload or parse failure. */
export type ParsedJson =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string }

/** Parse a JSON document for display. */
export function parseJson(text: string): ParsedJson {
  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (error: unknown) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

function jsonLabels(t: ArtifactPreviewProps['t']): JsonTreeLabels {
  return {
    copyValue: t('json.copyValue'),
    copyJson: t('json.copyJson'),
    copyPath: t('json.copyPath'),
    copyPrettyJson: t('json.copyPrettyJson'),
    copyCompactJson: t('json.copyCompactJson'),
    copied: t('json.copied'),
    copyFailed: t('json.copyFailed'),
    collapseNode: t('json.collapseNode'),
    expandNode: t('json.expandNode'),
    copyButtonTitle: action => t('json.copyButtonTitle', { action }),
  }
}

/** JSON body registered under the right Sidebar tab seat. */
export function JsonPreview(props: ArtifactPreviewProps): ReactNode {
  const data = usePreviewData(props, 'json')
  const { loadText, reloadText, actions, t } = props
  const state = data.state
  const started = state !== undefined
  useEffect(() => {
    if (!started) loadText(data.tabId, 'json', data.file, data.signal)
  }, [started, data.tabId, data.file, data.signal, loadText])
  const bodyRef = useRestoredScroll(state)
  const labels = useMemo(() => jsonLabels(t), [t])
  const parsed = useMemo(() => state?.text === undefined ? undefined : parseJson(state.text.text), [state?.text])
  if (state === undefined) return <Loading t={t} />
  const reload = (): void => { data.meta.reload(); reloadText(data.tabId, 'json', data.file, data.signal) }
  return (
    <PreviewChrome data={data} state={state} t={t} reload={reload}>
      <div
        ref={bodyRef}
        className={css.body}
        data-artifact-preview-body
        data-artifact-preview-state="json"
        onScroll={(event) => { actions.scrolled(data.tabId, event.currentTarget.scrollTop) }}
      >
        {parsed?.ok === true && typeof parsed.value === 'object' && parsed.value !== null && (
          <>
            <JsonTree
              data={parsed.value as object | unknown[]}
              label={t('jsonRoot')}
              labels={labels}
              className={css.jsonTree}
            />
            {state.text?.eof === false && <p className={css.note}>{t('truncatedText')}</p>}
          </>
        )}
        {parsed?.ok === true && (typeof parsed.value !== 'object' || parsed.value === null) && (
          <pre className={css.scalarJson} aria-label={t('jsonScalar')}>{JSON.stringify(parsed.value, null, 2)}</pre>
        )}
        {parsed?.ok === false && (
          <p className={css.statusLine} data-artifact-preview-json-invalid>
            {t('jsonInvalid', { message: parsed.message })}
          </p>
        )}
        <FailureLine state={state} t={t} retry={() => { loadText(data.tabId, 'json', data.file, data.signal) }} />
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </PreviewChrome>
  )
}
