import { describe, expect, it } from 'vitest'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { createOfficeStore, fresh } from '../src/client/store.ts'

const TAB = 'tab-1' as TabId

describe('office preview store', () => {
  it('creates one viewer bucket and replaces format-specific data', () => {
    const instance = createOfficeStore().create()
    expect(instance.getSnapshot().byTab).toEqual({})
    instance.actions.loading(TAB, 'xlsx')
    expect(instance.getSnapshot().byTab[TAB]).toEqual({ ...fresh('xlsx'), loading: true })
    instance.actions.xlsx(TAB, 'xlsx', { version: 'v1', sheets: [] })
    expect(instance.getSnapshot().byTab[TAB]).toMatchObject({ loading: false, xlsx: { version: 'v1', sheets: [] }, source: undefined })
    instance.actions.binary(TAB, 'pdf', { src: 'blob:office', version: 'v2' })
    expect(instance.getSnapshot().byTab[TAB]).toMatchObject({ viewer: 'pdf', source: { src: 'blob:office' }, xlsx: undefined, docx: undefined })
  })

  it('resets and forgets only the selected tab', () => {
    const instance = createOfficeStore().create()
    const other = 'tab-2' as TabId
    instance.actions.docx(TAB, 'docx', { html: '<p>one</p>', version: 'v1' })
    instance.actions.xlsx(other, 'xlsx', { version: 'v1', sheets: [] })
    instance.actions.reset(TAB, 'docx')
    expect(instance.getSnapshot().byTab[TAB]).toEqual(fresh('docx'))
    instance.actions.forget(TAB)
    expect(Object.keys(instance.getSnapshot().byTab)).toEqual([other])
  })
})
