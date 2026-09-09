import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { basenameOf, canOpenFile, videoDefinitions, VIEWER } from '../src/client/definitions.ts'

describe('video preview definitions', () => {
  it('claims mainstream video extensions through the right-Sidebar registry', () => {
    expect(basenameOf('dsh-resource://file/session/s-1/work/a%20b.mp4')).toBe('a b.mp4')
    expect(basenameOf('dsh-resource://file/session/s-1/work/%E0%A4%A')).toBe('%E0%A4%A')
    expect(basenameOf('dsh-resource://file/session/s-1/')).toBe('dsh-resource://file/session/s-1/')
    expect(canOpenFile('dsh-resource://file/session/s-1/work/clip.mp4')).toBe(true)
    expect(canOpenFile('dsh-resource://thread/session/s-1/work/clip.mp4')).toBe(false)
    const tabs = new SidebarRightTabRegistry(new Context())
    for (const definition of videoDefinitions()) tabs.register(definition)
    for (const extension of ['mp4', 'm4v', 'webm', 'ogv', 'ogg', 'mov', 'mkv', 'avi', 'wmv', 'flv', '3gp']) {
      expect(tabs.claim(`dsh-resource://file/session/s-1/work/clip.${extension}`)).toMatchObject({
        kind: VIEWER.kind,
        title: `clip.${extension}`,
      })
    }
    expect(() => tabs.claim('dsh-resource://file/session/s-1/work/clip.txt')).toThrow('no registered tab type claims')
  })
})
