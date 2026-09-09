import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { basenameOf, svgDefinitions, VIEWER } from '../src/client/definitions.ts'

describe('SVG preview definitions', () => {
  it('titles a file address by decoded basename', () => {
    expect(basenameOf('dsh-resource://file/session/s-1/work/a%20b%23c.svg')).toBe('a b#c.svg')
    expect(basenameOf('dsh-resource://file/session/s-1/work/%E0%A4%A')).toBe('%E0%A4%A')
    expect(basenameOf('dsh-resource://file/session/s-1/work/')).toBe('dsh-resource://file/session/s-1/work/')
  })

  it('claims only readable SVG file resources', () => {
    const tabs = new SidebarRightTabRegistry(new Context())
    for (const definition of svgDefinitions()) tabs.register(definition)
    expect(tabs.get('svg')?.id).toBe(VIEWER.id)
    expect(tabs.claim('dsh-resource://file/session/s-1/work/icon.svg')).toMatchObject({ kind: 'svg', title: 'icon.svg' })
    expect(tabs.claim('dsh-resource://file/session/s-1/work/icon.SVG')).toMatchObject({ kind: 'svg', title: 'icon.SVG' })
    expect(() => tabs.claim('dsh-resource://file/shared/team/icon.svg')).toThrow('no registered tab type claims')
    expect(() => tabs.claim('not-a-file-resource/icon.svg')).toThrow('no registered tab type claims')
  })
})
