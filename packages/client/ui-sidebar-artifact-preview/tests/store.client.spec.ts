import { describe, expect, it } from 'vitest'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { createArtifactStore, fresh } from '../src/client/store.ts'
import { textPage } from './fixtures.client.ts'

const TAB_1 = 'tab-1' as TabId
const TAB_2 = 'tab-2' as TabId

describe('artifact preview store', () => {
  it('starts empty and creates a viewer bucket on the first write', () => {
    const instance = createArtifactStore().create()
    expect(instance.getSnapshot().byTab).toEqual({})
    instance.actions.loading(TAB_1, 'markdown')
    expect(instance.getSnapshot().byTab[TAB_1]).toEqual({ ...fresh('markdown'), loading: true })
  })

  it('stores text, images, failures, and scroll position per tab', () => {
    const instance = createArtifactStore().create()
    instance.actions.text(TAB_1, 'json', textPage('{"ok":true}', false))
    expect(instance.getSnapshot().byTab[TAB_1]).toMatchObject({ viewer: 'json', loading: false, text: { text: '{"ok":true}', eof: false } })
    instance.actions.scrolled(TAB_1, 44)
    instance.actions.failed(TAB_1, 'json', { code: 'workspace-file/not-text', message: 'x', details: {} })
    expect(instance.getSnapshot().byTab[TAB_1]).toMatchObject({ scrollTop: 44, failure: { code: 'workspace-file/not-text' }, text: { text: '{"ok":true}' } })
    instance.actions.image(TAB_1, 'image', { src: 'blob:test', mime: 'image/png', version: 'v1', bytes: 3 })
    expect(instance.getSnapshot().byTab[TAB_1]).toMatchObject({ viewer: 'image', image: { src: 'blob:test' }, text: undefined, failure: undefined })
  })

  it('resets one bucket and forgets only the requested tab', () => {
    const instance = createArtifactStore().create()
    instance.actions.text(TAB_1, 'csv', textPage('a,b'))
    instance.actions.text(TAB_2, 'markdown', textPage('# Title'))
    instance.actions.scrolled(TAB_1, 18)
    instance.actions.reset(TAB_1, 'csv')
    expect(instance.getSnapshot().byTab[TAB_1]).toEqual({ ...fresh('csv'), scrollTop: 18 })
    instance.actions.forget(TAB_1)
    expect(Object.keys(instance.getSnapshot().byTab)).toEqual([TAB_2])
  })
})
