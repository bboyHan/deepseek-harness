/** Rendered right-Sidebar body for unified diff and patch files. */
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { DiffBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { DiffBlockLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { fileSizeText, IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PatchInjected } from './face.ts'
import { failureLine } from './failure-line.ts'
import { hostFileOf } from './rpc.ts'
import type { PatchStore } from './store.ts'
import css from './PatchPreview.module.css'

/** Props composed by the right Sidebar slot runtime. */
export type PatchPreviewProps =
  & PropsRuntime<'sidebar.right.pane.tab'>
  & PropsStore<PatchStore>
  & InjectFace<PatchInjected>
  & PropsLocale<'sidebarPatchPreview'>

function diffLabels(t: PatchPreviewProps['t']): DiffBlockLabels {
  return {
    copy: t('diff.copy'),
    copied: t('diff.copied'),
    collapseAria: t('diff.collapseAria'),
    expandAria: hidden => t('diff.expandAria', { hidden }),
    collapse: t('diff.collapse'),
    expand: hidden => t('diff.expand', { hidden }),
    files: count => t('diff.files', { count }),
  }
}

/**
 * Render one unified diff preview.
 * @param props - composed tab, store, face, and locale props.
 * @returns the patch viewer body.
 */
export function PatchPreview({
  useTabInfo, sessionId, useResource, useStore, actions, loadPatch, reloadPatch, t,
}: PatchPreviewProps): ReactNode {
  const { tab } = useTabInfo()
  const meta = useResource<'file'>(tab.contentId)
  const file = useMemo(() => hostFileOf(tab.contentId, sessionId), [tab.contentId, sessionId])
  const state = useStore(s => s.byTab[tab.id])
  const labels = useMemo(() => diffLabels(t), [t])
  const started = state !== undefined
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!started) loadPatch(tab.id, file, tab.signal)
  }, [started, tab.id, file, tab.signal, loadPatch])

  useEffect(() => {
    if (state?.patch !== undefined && bodyRef.current !== null) bodyRef.current.scrollTop = state.scrollTop
  }, [state?.patch !== undefined])

  if (state === undefined) {
    return (
      <div className={css.status} data-patch-preview-state="loading">
        <p className={css.statusLine}>{t('loading')}</p>
      </div>
    )
  }

  const displayPath = meta.value?.absolutePath ?? file.path
  const reload = (): void => {
    reloadPatch(tab.id, file, tab.signal)
  }
  const patch = state.patch
  const bytes = patch?.bytes ?? meta.value?.bytes
  const changed = patch !== undefined
    && meta.value !== undefined
    && patch.version !== meta.value.version

  return (
    <div className={css.preview} data-patch-preview-url={tab.contentId}>
      {meta.failure !== undefined
        ? (
          <p className={css.changed} data-patch-preview-meta-failed={meta.failure.code}>
            <span>{failureLine(t, {
              code: meta.failure.code,
              message: meta.failure.message,
              details: { ...meta.failure.details },
            })}</span>
            <button type="button" className={css.action} data-patch-preview-reload-now onClick={reload}>
              {t('reloadNow')}
            </button>
          </p>
        )
        : changed && (
          <p className={css.changed} data-patch-preview-changed>
            <span>{t('changed')}</span>
            <button type="button" className={css.action} data-patch-preview-reload-now onClick={reload}>
              {t('reloadNow')}
            </button>
          </p>
        )}
      <div className={css.header}>
        <div className={css.path} title={displayPath} data-patch-preview-path>{displayPath}</div>
        <button
          type="button"
          className={css.tool}
          aria-label={t('reload')}
          title={t('reload')}
          data-patch-preview-tool="reload"
          onClick={reload}
          disabled={state.loading}
        >
          <IconRefreshOutline16 />
        </button>
      </div>
      {bytes !== undefined && (
        <div className={css.meta} data-patch-preview-meta>
          {t('fileSize', { size: fileSizeText(bytes) })}
        </div>
      )}
      <div
        ref={bodyRef}
        className={css.body}
        data-patch-preview-body
        onScroll={(event) => { actions.scrolled(tab.id, event.currentTarget.scrollTop) }}
      >
        {patch !== undefined && (
          <>
            <p className={css.summary} data-patch-preview-summary>
              {t('summary', {
                files: patch.files,
                hunks: patch.hunks,
                added: patch.added,
                removed: patch.removed,
              })}
            </p>
            {!patch.eof && <p className={css.note} data-patch-preview-truncated>{t('truncatedText')}</p>}
            {patch.truncated && <p className={css.note} data-patch-preview-hunk-limit>{t('hunkLimit')}</p>}
            {patch.diffs.length > 0
              ? <DiffBlock diffs={patch.diffs} labels={labels} />
              : <p className={css.statusLine} data-patch-preview-empty>{t('emptyPatch')}</p>}
          </>
        )}
        {state.failure !== undefined && (
          <p className={css.statusLine} data-patch-preview-failed={state.failure.code}>
            <span>{failureLine(t, state.failure)}</span>
            <button
              type="button"
              className={css.action}
              data-patch-preview-retry
              onClick={() => { loadPatch(tab.id, file, tab.signal) }}
            >
              {t('retry')}
            </button>
          </p>
        )}
        {state.loading && <p className={css.statusLine}>{t('loading')}</p>}
      </div>
    </div>
  )
}
