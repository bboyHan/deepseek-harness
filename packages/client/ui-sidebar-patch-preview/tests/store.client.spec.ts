import { describe, expect, it } from 'vitest'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { createPatchStore, fresh } from '../src/client/store.ts'

const TAB_1 = 'tab-1' as TabId
const TAB_2 = 'tab-2' as TabId

describe('patch preview store', () => {
  it('starts empty and creates a patch bucket on load', () => {
    const instance = createPatchStore().create()
    expect(instance.getSnapshot().byTab).toEqual({})
    instance.actions.loading(TAB_1)
    expect(instance.getSnapshot().byTab[TAB_1]).toEqual({ ...fresh(), loading: true })
  })

  it('stores parsed patches, failures, scroll position, and independent tabs', () => {
    const instance = createPatchStore().create()
    const patch = {
      diffs: [{ path: 'a.txt', oldText: 'old', newText: 'new' }],
      files: 1,
      hunks: 1,
      added: 1,
      removed: 1,
      truncated: false,
      eof: true,
      version: 'v1',
    }
    instance.actions.patch(TAB_1, patch)
    instance.actions.loading(TAB_2)
    instance.actions.scrolled(TAB_1, 44)
    instance.actions.failed(TAB_1, { code: 'x', message: 'boom', details: {} })
    expect(instance.getSnapshot().byTab[TAB_1]).toMatchObject({ patch, scrollTop: 44, failure: { code: 'x' } })
    expect(instance.getSnapshot().byTab[TAB_2]).toMatchObject({ viewer: 'patch', loading: true })
  })

  it('resets one tab while keeping its scroll position and forgets it', () => {
    const instance = createPatchStore().create()
    instance.actions.loading(TAB_1)
    instance.actions.loading(TAB_2)
    instance.actions.scrolled(TAB_1, 18)
    instance.actions.reset(TAB_1)
    expect(instance.getSnapshot().byTab[TAB_1]).toEqual({ ...fresh(), scrollTop: 18 })
    instance.actions.forget(TAB_1)
    expect(Object.keys(instance.getSnapshot().byTab)).toEqual([TAB_2])
    instance.actions.scrolled(TAB_1, 99)
  })
})
