import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { artifactDefinitions, basenameOf, VIEWERS } from '../src/client/definitions.ts'

describe('artifact preview definitions', () => {
  it('titles a file address by decoded basename', () => {
    expect(basenameOf('dsh-resource://file/session/s-1/work/a%20b%23c.md')).toBe('a b#c.md')
    expect(basenameOf('dsh-resource://file/session/s-1/work/%E0%A4%A')).toBe('%E0%A4%A')
    expect(basenameOf('dsh-resource://file/session/s-1/')).toBe('dsh-resource://file/session/s-1/')
  })

  it('registers one extension-band claimant per first-phase viewer', () => {
    expect(artifactDefinitions()).toEqual([
      expect.objectContaining({ id: VIEWERS.markdown.id, kind: 'markdown', patterns: ['*.md', '*.markdown'], priority: 'extension' }),
      expect.objectContaining({ id: VIEWERS.image.id, kind: 'image', patterns: ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.bmp', '*.avif'], priority: 'extension' }),
      expect.objectContaining({ id: VIEWERS.json.id, kind: 'json', patterns: ['*.json'], priority: 'extension' }),
      expect.objectContaining({ id: VIEWERS.csv.id, kind: 'csv', patterns: ['*.csv', '*.tsv'], priority: 'extension' }),
    ])
  })

  it('claims matching file addresses through the real right-Sidebar registry', () => {
    const tabs = new SidebarRightTabRegistry(new Context())
    for (const definition of artifactDefinitions()) tabs.register(definition)
    expect(tabs.claim('dsh-resource://file/session/s-1/work/README.md')).toMatchObject({ kind: 'markdown', title: 'README.md' })
    expect(tabs.claim('dsh-resource://file/session/s-1/work/chart.png')).toMatchObject({ kind: 'image', title: 'chart.png' })
    expect(tabs.claim('dsh-resource://file/absolute/C:/w/data.json')).toMatchObject({ kind: 'json', title: 'data.json' })
    expect(tabs.claim('dsh-resource://file/session/s-1/work/table.tsv')).toMatchObject({ kind: 'csv', title: 'table.tsv' })
    expect(() => tabs.claim('dsh-resource://file/session/s-1/work/icon.svg')).toThrow('no registered tab type claims')
    expect(() => tabs.claim('dsh-resource://file/shared/team/README.md')).toThrow('no registered tab type claims')
  })
})
