// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { PatchPreview } from '../src/client/PatchPreview.tsx'
import { createPatchStore } from '../src/client/store.ts'
import { meta, propsFor, PATH, TAB_ID } from './fixtures.client.ts'

afterEach(cleanup)

describe('patch preview component', () => {
  it('loads on an empty tab and renders summary plus changed lines', () => {
    const empty = createPatchStore().create()
    const emptyProps = propsFor(empty)
    const emptyView = render(<PatchPreview {...emptyProps} />)
    expect(emptyView.container.querySelector('[data-patch-preview-state="loading"]')).not.toBeNull()
    expect(emptyProps.loadPatch).toHaveBeenCalledTimes(1)
    cleanup()

    const instance = createPatchStore().create()
    instance.actions.loading(TAB_ID)
    const props = propsFor(instance)
    const view = render(<PatchPreview {...props} />)
    act(() => {
      instance.actions.patch(TAB_ID, {
        diffs: [{ path: 'src/a.txt', oldText: 'old', newText: 'new' }],
        files: 1,
        hunks: 1,
        added: 1,
        removed: 1,
        truncated: false,
        eof: true,
        version: 'v1',
        bytes: 4096,
      })
    })
    expect(view.container.textContent).toContain('summary(files=1,hunks=1,added=1,removed=1)')
    expect(view.container.querySelector('[data-patch-preview-meta]')?.textContent).toContain('4.0KB')
    expect(view.container.textContent).toContain('old')
    expect(view.container.textContent).toContain('new')
  })

  it('renders empty and failure states, and reloads metadata and content together', () => {
    const instance = createPatchStore().create()
    instance.actions.patch(TAB_ID, {
      diffs: [], files: 0, hunks: 0, added: 0, removed: 0, truncated: false, eof: false, version: 'v1',
    })
    const props = propsFor(instance)
    const resource = meta(true)
    props.useResource = (() => resource) as typeof props.useResource
    const view = render(<PatchPreview {...props} />)
    expect(view.container.querySelector('[data-patch-preview-empty]')?.textContent).toContain('emptyPatch')
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[data-patch-preview-tool="reload"]')!)
    expect(resource.reload).toHaveBeenCalledTimes(1)
    expect(props.reloadPatch).toHaveBeenCalledTimes(1)
  })

  it('falls back to the address path and renders metadata failures without details', () => {
    const instance = createPatchStore().create()
    instance.actions.patch(TAB_ID, {
      diffs: [], files: 0, hunks: 0, added: 0, removed: 0, truncated: false, eof: true, version: 'v1',
    })
    const props = propsFor(instance)
    let resourceFailure = new RemoteError('workspace-file/not-found', 'missing', { path: PATH })
    props.useResource = (() => ({
      status: 'failed',
      value: undefined,
      failure: resourceFailure,
      reload: () => {},
    })) as unknown as typeof props.useResource
    const view = render(<PatchPreview {...props} />)
    expect(view.container.querySelector('[data-patch-preview-path]')?.textContent).toBe('work/change.patch')
    expect(view.container.querySelector('[data-patch-preview-meta-failed]')?.textContent).toContain('error.notFound')
    resourceFailure = new RemoteError('workspace-file/not-found', 'missing', { path: PATH })
    view.rerender(<PatchPreview {...props} />)
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[data-patch-preview-reload-now]')!)
    expect(props.reloadPatch).toHaveBeenCalledTimes(1)
  })

  it('renders the loading row, truncation notices, fold controls, and retry', () => {
    const loading = createPatchStore().create()
    loading.actions.loading(TAB_ID)
    const loadingProps = propsFor(loading)
    const loadingView = render(<PatchPreview {...loadingProps} />)
    expect(loadingView.container.textContent).toContain('loading')
    cleanup()

    const instance = createPatchStore().create()
    instance.actions.patch(TAB_ID, {
      diffs: Array.from({ length: 10 }, (_, index) => ({
        path: `file-${index}.txt`,
        oldText: 'old',
        newText: 'new',
      })),
      files: 10,
      hunks: 10,
      added: 10,
      removed: 10,
      truncated: true,
      eof: false,
      version: 'v1',
    })
    const props = propsFor(instance)
    const view = render(<PatchPreview {...props} />)
    expect(view.container.querySelector('[data-patch-preview-truncated]')).not.toBeNull()
    expect(view.container.querySelector('[data-patch-preview-hunk-limit]')).not.toBeNull()
    const fold = view.container.querySelector<HTMLButtonElement>('[aria-expanded="false"]')
    expect(fold).not.toBeNull()
    fireEvent.click(fold!)
    expect(view.container.querySelector('[aria-expanded="true"]')).not.toBeNull()
    const body = view.container.querySelector<HTMLDivElement>('[data-patch-preview-body]')!
    Object.defineProperty(body, 'scrollTop', { configurable: true, value: 42 })
    fireEvent.scroll(body)
    expect(instance.getSnapshot().byTab[TAB_ID]?.scrollTop).toBe(42)
    cleanup()

    const failed = createPatchStore().create()
    failed.actions.failed(TAB_ID, { code: 'other', message: 'boom', details: {} })
    const failedProps = propsFor(failed)
    const failedView = render(<PatchPreview {...failedProps} />)
    expect(failedView.container.querySelector('[data-patch-preview-failed]')).not.toBeNull()
    fireEvent.click(failedView.container.querySelector<HTMLButtonElement>('[data-patch-preview-retry]')!)
    expect(failedProps.loadPatch).toHaveBeenCalledTimes(1)
  })
})
