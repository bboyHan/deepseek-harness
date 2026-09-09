import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import {
  PATCH_PREVIEW_ID, PATCH_PREVIEW_KIND, basenameOf, patchDefinition,
} from '../src/client/definitions.ts'

describe('patch preview definition', () => {
  it('claims supported file extensions with a decoded basename', () => {
    const definition = patchDefinition()
    expect(definition).toMatchObject({
      id: PATCH_PREVIEW_ID,
      kind: PATCH_PREVIEW_KIND,
      patterns: ['*.diff', '*.patch', '*.udiff'],
      priority: 'extension',
    })
    expect(definition.title('dsh-resource://file/session/s-1/work/a%20b.patch')).toBe('a b.patch')
    expect(definition.canOpen?.('dsh-resource://file/session/s-1/work/a.patch')).toBe(true)
    expect(definition.canOpen?.('dsh-resource://file/shared/a.patch')).toBe(false)
    expect(basenameOf('dsh-resource://file/session/s-1/')).toBe('dsh-resource://file/session/s-1/')
    expect(basenameOf('dsh-resource://file/session/s-1/%E0%A4%A')).toBe('%E0%A4%A')
  })

  it('wins over the text fallback only for its extensions', () => {
    const tabs = new SidebarRightTabRegistry(new Context())
    tabs.register({ id: 'text', kind: 'text', patterns: ['dsh-resource://file/**'], priority: 'fallback', title: basenameOf })
    tabs.register(patchDefinition())
    expect(tabs.claim('dsh-resource://file/session/s-1/work/a.patch').kind).toBe(PATCH_PREVIEW_KIND)
    expect(tabs.claim('dsh-resource://file/session/s-1/work/a.txt').kind).toBe('text')
  })
})
