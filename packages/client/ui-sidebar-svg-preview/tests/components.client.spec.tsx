// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { SvgPreview } from '../src/client/SvgPreview.tsx'
import { meta, propsFor, storeWithDocument, TAB_ID, PATH } from './fixtures.client.ts'
import { createSvgStore } from '../src/client/store.ts'

afterEach(cleanup)

describe('SVG preview component', () => {
  it('renders the loading placeholder and starts the first read', () => {
    const instance = createSvgStore().create()
    const props = propsFor(instance)
    const view = render(<SvgPreview {...props} />)
    expect(view.container.querySelector('[data-svg-preview-state="loading"]')).not.toBeNull()
    expect(props.load).toHaveBeenCalledWith(TAB_ID, expect.objectContaining({ path: 'work/result.svg' }), expect.any(AbortSignal))
  })

  it('renders the loaded SVG Blob URL and reloads through metadata and the face', () => {
    const instance = storeWithDocument()
    const props = propsFor(instance)
    const resource = meta()
    props.useResource = (() => resource) as typeof props.useResource
    const view = render(<SvgPreview {...props} />)
    expect(view.container.querySelector<HTMLImageElement>('[data-svg-preview-image]')?.src).toBe('blob:test-1')
    expect(view.container.querySelector('[data-svg-preview-meta]')?.textContent).toContain('20B')
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[aria-label="reload"]')!)
    expect(props.reload).toHaveBeenCalledWith(TAB_ID, expect.objectContaining({ path: 'work/result.svg' }), expect.any(AbortSignal))
  })

  it('renders changed and metadata-failure notices with the address path fallback', () => {
    const instance = storeWithDocument()
    const props = propsFor(instance)
    props.useResource = (() => meta(true)) as typeof props.useResource
    const changed = render(<SvgPreview {...props} />)
    expect(changed.container.querySelector('[data-svg-preview-changed]')).not.toBeNull()
    fireEvent.click(changed.container.querySelector<HTMLButtonElement>('[data-svg-preview-changed] button')!)
    expect(props.reload).toHaveBeenCalledTimes(1)
    cleanup()

    const failedProps = propsFor(instance)
    failedProps.useResource = (() => ({
      status: 'failed',
      value: undefined,
      failure: { code: 'workspace-file/not-found', message: 'missing', details: { path: PATH } },
    })) as unknown as typeof failedProps.useResource
    const failed = render(<SvgPreview {...failedProps} />)
    expect(failed.container.querySelector('[data-svg-preview-meta-failed]')?.textContent).toContain('error.notFound')
    expect(failed.container.querySelector('[data-svg-preview-path]')?.textContent).toBe('work/result.svg')
    fireEvent.click(failed.container.querySelector<HTMLButtonElement>('[data-svg-preview-meta-failed] button')!)
    expect(failedProps.reload).toHaveBeenCalledTimes(1)
  })

  it('renders loading and failure rows, retries, and stores scroll position', () => {
    const loading = createSvgStore().create()
    loading.actions.loading(TAB_ID)
    const loadingProps = propsFor(loading)
    const loadingView = render(<SvgPreview {...loadingProps} />)
    expect(loadingView.container.textContent).toContain('loading')
    expect(loadingView.container.querySelector<HTMLButtonElement>('[aria-label="reload"]')?.disabled).toBe(true)
    cleanup()

    const failed = createSvgStore().create()
    failed.actions.failed(TAB_ID, { code: 'other', message: 'boom', details: {} })
    const failedProps = propsFor(failed)
    const failedView = render(<SvgPreview {...failedProps} />)
    expect(failedView.container.querySelector('[data-svg-preview-failed]')).not.toBeNull()
    fireEvent.click(failedView.container.querySelector<HTMLButtonElement>('[data-svg-preview-failed] button')!)
    expect(failedProps.load).toHaveBeenCalledTimes(1)
    const body = failedView.container.querySelector<HTMLDivElement>('[data-svg-preview-body]')!
    Object.defineProperty(body, 'scrollTop', { configurable: true, value: 42 })
    fireEvent.scroll(body)
    expect(failed.getSnapshot().byTab[TAB_ID]?.scrollTop).toBe(42)
  })

  it('renders a document without a failure row and restores its scroll offset', () => {
    const instance = storeWithDocument()
    instance.actions.scrolled(TAB_ID, 18)
    const props = propsFor(instance)
    const view = render(<SvgPreview {...props} />)
    const body = view.container.querySelector<HTMLDivElement>('[data-svg-preview-body]')!
    expect(body.scrollTop).toBe(18)
    expect(view.container.querySelector('[data-svg-preview-failed]')).toBeNull()
    expect(view.container.querySelector('[data-svg-preview-body]')?.textContent).not.toContain('loading')
  })
})
