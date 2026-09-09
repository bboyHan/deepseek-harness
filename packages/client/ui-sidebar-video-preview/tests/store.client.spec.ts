import { describe, expect, it } from 'vitest'
import { createVideoStore } from '../src/client/store.ts'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { TAB_ID } from './fixtures.client.ts'

describe('video preview store', () => {
  it('tracks source revisions, metadata, failures, opening state, and cleanup', () => {
    const store = createVideoStore().create()
    store.actions.load(TAB_ID, '/api/video?v=0')
    expect(store.getSnapshot().byTab[TAB_ID]).toMatchObject({ loading: true, source: { revision: 0 } })
    store.actions.metadata(TAB_ID, { duration: 65, width: 1280, height: 720 })
    expect(store.getSnapshot().byTab[TAB_ID]).toMatchObject({
      loading: false,
      metadata: { duration: 65, width: 1280, height: 720 },
    })
    store.actions.opening(TAB_ID)
    expect(store.getSnapshot().byTab[TAB_ID]?.opening).toBe(true)
    store.actions.failed(TAB_ID, { code: 'video-preview/unsupported', message: 'unsupported' })
    expect(store.getSnapshot().byTab[TAB_ID]).toMatchObject({ loading: false, failure: { code: 'video-preview/unsupported' } })
    store.actions.opened(TAB_ID)
    expect(store.getSnapshot().byTab[TAB_ID]?.opening).toBe(false)
    store.actions.reload(TAB_ID, '/api/video?v=1')
    expect(store.getSnapshot().byTab[TAB_ID]).toMatchObject({ loading: true, failure: undefined, source: { revision: 1 } })
    store.actions.forget(TAB_ID)
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()
  })

  it('ignores late actions after a tab is gone', () => {
    const store = createVideoStore().create()
    const other = 'tab-2' as TabId
    store.actions.load(TAB_ID, '/api/video?v=0')
    store.actions.load(other, '/api/other?v=0')
    store.actions.reload('missing' as TabId, '/api/missing?v=1')
    expect(store.getSnapshot().byTab['missing' as TabId]).toMatchObject({ source: { revision: 1 } })
    store.actions.metadata('gone' as TabId, { duration: 1 })
    store.actions.failed('gone' as TabId, { code: 'video-preview/network', message: 'network' })
    store.actions.opening('gone' as TabId)
    store.actions.opened('gone' as TabId)
    store.actions.forget(TAB_ID)
    expect(store.getSnapshot().byTab[TAB_ID]).toBeUndefined()
    expect(store.getSnapshot().byTab[other]?.source.src).toBe('/api/other?v=0')
  })
})
