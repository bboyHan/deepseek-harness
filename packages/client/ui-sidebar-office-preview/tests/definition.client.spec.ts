import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { basenameOf, officeDefinitions, VIEWERS } from '../src/client/definitions.ts'

describe('office preview definitions', () => {
  it('uses decoded basenames and claims only workspace file addresses', () => {
    expect(basenameOf('dsh-resource://file/session/s-1/work/a%20b.docx')).toBe('a b.docx')
    const tabs = new SidebarRightTabRegistry(new Context())
    for (const definition of officeDefinitions()) tabs.register(definition)
    expect(tabs.claim('dsh-resource://file/session/s-1/work/report.pdf')).toMatchObject({ kind: VIEWERS.pdf.kind, title: 'report.pdf' })
    expect(tabs.claim('dsh-resource://file/session/s-1/work/report.docx')).toMatchObject({ kind: VIEWERS.docx.kind, title: 'report.docx' })
    expect(tabs.claim('dsh-resource://file/session/s-1/work/report.xlsx')).toMatchObject({ kind: VIEWERS.xlsx.kind, title: 'report.xlsx' })
    expect(() => tabs.claim('dsh-resource://file/session/s-1/work/report.xls')).toThrow('no registered tab type claims')
  })
})
