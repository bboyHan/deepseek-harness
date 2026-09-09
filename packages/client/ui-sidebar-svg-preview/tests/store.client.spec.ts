import { describe, expect, it } from 'vitest'
import { createSvgStore, fresh } from '../src/client/store.ts'
import { TAB_ID } from './fixtures.client.ts'

describe('SVG preview store', () => {
  it('keeps document, failure, scroll, and forget actions scoped to a tab', () => {
    const instance = createSvgStore().create()
    expect(fresh()).toEqual({ loading: false, failure: undefined, document: undefined, scrollTop: 0 })
    instance.actions.scrolled('missing' as typeof TAB_ID, 10)
    instance.actions.loading(TAB_ID)
    instance.actions.document(TAB_ID, { src: 'blob:test', version: 'v1', bytes: 4, warnings: [] })
    instance.actions.scrolled(TAB_ID, 42)
    expect(instance.getSnapshot().byTab[TAB_ID]).toMatchObject({ loading: false, document: { src: 'blob:test' }, scrollTop: 42 })
    instance.actions.failed(TAB_ID, { code: 'x', message: 'x', details: {} })
    expect(instance.getSnapshot().byTab[TAB_ID]?.failure?.code).toBe('x')
    instance.actions.reset(TAB_ID)
    expect(instance.getSnapshot().byTab[TAB_ID]).toMatchObject({ loading: false, document: undefined, failure: undefined })
    const otherTab = 'tab-2' as typeof TAB_ID
    instance.actions.loading(otherTab)
    instance.actions.forget(TAB_ID)
    expect(instance.getSnapshot().byTab[TAB_ID]).toBeUndefined()
    expect(instance.getSnapshot().byTab[otherTab]).toBeDefined()
  })
})
