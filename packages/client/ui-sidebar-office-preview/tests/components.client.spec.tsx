// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { DocxPreview } from '../src/client/DocxPreview.tsx'
import { PdfPreview } from '../src/client/PdfPreview.tsx'
import { XlsxPreview } from '../src/client/XlsxPreview.tsx'
import { createOfficeStore } from '../src/client/store.ts'
import { propsFor, TAB_ID } from './fixtures.client.ts'

afterEach(cleanup)

describe('office preview components', () => {
  it('renders the PDF Blob URL and DOCX sanitized HTML', () => {
    const pdfStore = createOfficeStore().create()
    pdfStore.actions.binary(TAB_ID, 'pdf', { src: 'blob:office-pdf', version: 'v1', bytes: 4096 })
    const pdf = render(<PdfPreview {...propsFor(pdfStore, 'pdf', 'dsh-resource://file/session/s-1/work/report.pdf')} />)
    expect(pdf.container.querySelector('iframe')?.src).toBe('blob:office-pdf')
    expect(pdf.container.querySelector('[data-office-preview-meta]')?.textContent).toContain('4.0KB')
    expect(pdf.container.querySelector('[data-office-preview-pdf-actions] a[target="_blank"]')?.getAttribute('aria-label')).toBe('openPdf')
    expect(pdf.container.querySelector('[data-office-preview-pdf-actions] a[download]')?.getAttribute('download')).toBe('report.pdf')
    cleanup()

    const emptyPdfStore = createOfficeStore().create()
    emptyPdfStore.actions.reset(TAB_ID, 'pdf')
    const emptyPdf = render(<PdfPreview {...propsFor(emptyPdfStore, 'pdf')} />)
    expect(emptyPdf.container.querySelector('[data-office-preview-empty]')?.textContent).toContain('empty')
    cleanup()

    const docxStore = createOfficeStore().create()
    docxStore.actions.docx(TAB_ID, 'docx', { html: '<h1>Report</h1>', version: 'v1' })
    const docx = render(<DocxPreview {...propsFor(docxStore, 'docx')} />)
    expect(docx.container.querySelector('[data-office-preview-url]')?.textContent).toContain('Report')
  })

  it('renders worksheet names, rows, and truncation notices', () => {
    const store = createOfficeStore().create()
    store.actions.xlsx(TAB_ID, 'xlsx', {
      version: 'v1',
      sheets: [{ name: 'Scores', rows: [['Name'], ['Ada']], truncated: true }],
    })
    const view = render(<XlsxPreview {...propsFor(store, 'xlsx')} />)
    expect(view.container.textContent).toContain('Scores')
    expect(Array.from(view.container.querySelectorAll('td'), cell => cell.textContent)).toEqual(['Name', 'Ada'])
    expect(view.container.textContent).toContain('sheetTruncated')
  })
})
