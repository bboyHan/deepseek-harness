// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { CsvPreview } from '../src/client/CsvPreview.tsx'
import { ImagePreview } from '../src/client/ImagePreview.tsx'
import { JsonPreview, parseJson } from '../src/client/JsonPreview.tsx'
import { MarkdownPreview } from '../src/client/MarkdownPreview.tsx'
import { meta, propsFor, TAB_ID, textPage } from './fixtures.client.ts'
import { createArtifactStore } from '../src/client/store.ts'
import type { ArtifactPreviewProps } from '../src/client/PreviewChrome.tsx'

afterEach(cleanup)

describe('artifact preview components', () => {
  it('draws markdown text and the first-page truncation note', () => {
    const instance = createArtifactStore().create()
    instance.actions.text(TAB_ID, 'markdown', textPage('# Title', false))
    const props = propsFor(instance, 'markdown')
    const view = render(<MarkdownPreview {...props} />)
    expect(view.container.textContent).toContain('Title')
    expect(view.container.textContent).toContain('truncatedText')
    expect(view.container.querySelector('[data-artifact-preview-meta]')?.textContent).toContain('100B')
    expect(props.loadText).not.toHaveBeenCalled()
  })

  it('draws JSON objects, scalars, and parse failures', () => {
    expect(parseJson('{"ok":true}')).toEqual({ ok: true, value: { ok: true } })
    expect(parseJson('{')).toMatchObject({ ok: false })

    const objectStore = createArtifactStore().create()
    objectStore.actions.text(TAB_ID, 'json', textPage('{"ok":true}'))
    const object = render(<JsonPreview {...propsFor(objectStore, 'json')} />)
    expect(object.container.textContent).toContain('ok')
    expect(object.container.textContent).toContain('true')
    cleanup()

    const scalarStore = createArtifactStore().create()
    scalarStore.actions.text(TAB_ID, 'json', textPage('5'))
    const scalar = render(<JsonPreview {...propsFor(scalarStore, 'json')} />)
    expect(scalar.container.querySelector('[aria-label="jsonScalar"]')?.textContent).toBe('5')
    cleanup()

    const invalidStore = createArtifactStore().create()
    invalidStore.actions.text(TAB_ID, 'json', textPage('{'))
    const invalid = render(<JsonPreview {...propsFor(invalidStore, 'json')} />)
    expect(invalid.container.querySelector('[data-artifact-preview-json-invalid]')?.textContent).toContain('jsonInvalid')
  })

  it('draws CSV and TSV tables with row counts and column truncation', () => {
    const instance = createArtifactStore().create()
    instance.actions.text(TAB_ID, 'csv', textPage('a,b\n"c,d",e', false))
    const view = render(<CsvPreview {...propsFor(instance, 'csv')} />)
    expect(view.container.textContent).toContain('csvRows(rows=2)')
    expect(Array.from(view.container.querySelectorAll('td'), cell => cell.textContent)).toEqual(['a', 'b', 'c,d', 'e'])
    expect(view.container.textContent).toContain('truncatedText')
  })

  it('draws an image and reloads it through resource metadata and the image face', () => {
    const instance = createArtifactStore().create()
    instance.actions.image(TAB_ID, 'image', { src: 'blob:test', mime: 'image/png', version: 'v1', bytes: 3 })
    const props = propsFor(instance, 'image')
    const resource = meta()
    props.useResource = (() => resource) as ArtifactPreviewProps['useResource']
    const view = render(<ImagePreview {...props} />)
    const image = view.container.querySelector<HTMLImageElement>('[data-artifact-preview-image]')
    expect(image?.src).toBe('blob:test')
    expect(view.container.querySelector('[data-artifact-preview-meta]')?.textContent).toContain('3B')
    fireEvent.click(view.container.querySelector<HTMLButtonElement>('[data-artifact-preview-tool="reload"]')!)
    expect(props.reloadImage).toHaveBeenCalledTimes(1)
  })
})
