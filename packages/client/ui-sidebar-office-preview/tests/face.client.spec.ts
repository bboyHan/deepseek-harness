import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import type { WorkspaceFileBytes } from '@deepseek-ai/dsh-api-workspace-files/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
const { parseDocx, parseXlsx } = vi.hoisted(() => ({
  parseDocx: vi.fn(),
  parseXlsx: vi.fn(),
}))
vi.mock('../src/client/docx-parser.ts', () => ({ parseDocx }))
vi.mock('../src/client/xlsx-parser.ts', () => ({ parseXlsx }))

import { officeFace } from '../src/client/face.ts'
import { createOfficeStore } from '../src/client/store.ts'
import { failure, mockUrl, okBytes, PATH, SESSION, type PendingByteRead } from './fixtures.client.ts'

const TAB = 'tab-1' as TabId
const FILE = { sessionId: SESSION, path: PATH }
const flush = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0))

function bench(maxOfficeBytes = 6) {
  const instance = createOfficeStore().create()
  const pending: PendingByteRead[] = []
  const readBytes = vi.fn(
    (_session: typeof SESSION, _path: string, offset: number) => new Promise<RemoteResult<WorkspaceFileBytes>>(
      (resolve) => { pending.push({ offset, resolve }) },
    ),
  )
  const face = officeFace(readBytes, {
    maxOfficeBytes,
    maxSpreadsheetRows: 10,
    maxSpreadsheetColumns: 10,
    maxSpreadsheetSheets: 2,
  })(SESSION, instance.actions)
  return {
    instance,
    face,
    readBytes,
    pending: () => pending.map(read => read.offset),
    resolve(result: RemoteResult<WorkspaceFileBytes>, offset = 0) {
      const index = pending.findIndex(read => read.offset === offset)
      const [read] = pending.splice(index, 1)
      if (read === undefined) throw new Error(`no pending read at ${String(offset)}`)
      read.resolve(result)
    },
  }
}

describe('office preview face', () => {
  beforeEach(() => {
    parseDocx.mockReset()
    parseXlsx.mockReset()
  })

  it('assembles PDF bytes and restarts a changed file before publishing', async () => {
    const urls = mockUrl()
    const h = bench()
    const signal = new AbortController().signal
    h.face.load(TAB, 'pdf', FILE, signal)
    h.resolve(okBytes(0, 'ab', false, 'v1', 4))
    await flush()
    expect(h.pending()).toEqual([2])
    h.resolve(okBytes(2, 'xy', false, 'v2', 4), 2)
    await flush()
    expect(h.pending()).toEqual([0])
    h.resolve(okBytes(0, 'cd', true, 'v2', 2))
    await flush()
    expect(h.instance.getSnapshot().byTab[TAB]).toMatchObject({ loading: false, source: { src: 'blob:office-1', version: 'v2' } })
    expect(urls.create).toHaveBeenCalledTimes(1)
    urls.create.mockRestore()
    urls.revoke.mockRestore()
  })

  it('stores read failures and enforces the complete byte limit', async () => {
    const failed = bench()
    failed.face.load(TAB, 'pdf', FILE, new AbortController().signal)
    failed.resolve(failure('workspace-file/not-found'))
    await flush()
    expect(failed.instance.getSnapshot().byTab[TAB]?.failure?.code).toBe('workspace-file/not-found')

    const large = bench()
    large.face.load(TAB, 'pdf', FILE, new AbortController().signal)
    large.resolve(okBytes(0, '1234567', true, 'v1', 7))
    await flush()
    expect(large.instance.getSnapshot().byTab[TAB]?.failure?.code).toBe('office-preview/too-large')
  })

  it('does not publish after the tab lifetime ends', async () => {
    const h = bench()
    const controller = new AbortController()
    h.face.load(TAB, 'pdf', FILE, controller.signal)
    controller.abort()
    await flush()
    expect(h.instance.getSnapshot().byTab[TAB]).toBeUndefined()
  })

  it('keeps the Host-reported source size for parsed DOCX and XLSX files', async () => {
    parseDocx.mockResolvedValueOnce({ ok: true, html: '<p>Report</p>' })
    const docx = bench(20)
    docx.face.load(TAB, 'docx', FILE, new AbortController().signal)
    docx.resolve(okBytes(0, 'docx', true, 'v1', 12))
    await flush()
    expect(docx.instance.getSnapshot().byTab[TAB]?.docx).toMatchObject({
      html: '<p>Report</p>',
      bytes: 12,
    })

    parseXlsx.mockReturnValueOnce({ ok: true, workbook: { sheets: [] } })
    const xlsx = bench(20)
    xlsx.face.load(TAB, 'xlsx', FILE, new AbortController().signal)
    xlsx.resolve(okBytes(0, 'xlsx', true, 'v1', 14))
    await flush()
    expect(xlsx.instance.getSnapshot().byTab[TAB]?.xlsx).toMatchObject({ sheets: [], bytes: 14 })
  })
})
