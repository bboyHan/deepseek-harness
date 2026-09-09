import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { apply, Config, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { DocxPreview } from '../src/client/DocxPreview.tsx'
import { PdfPreview } from '../src/client/PdfPreview.tsx'
import { XlsxPreview } from '../src/client/XlsxPreview.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { VIEWERS } from '../src/client/definitions.ts'

function collect(value: unknown): () => void {
  if (typeof value === 'function') return value as () => void
  const disposers = [...value as Iterable<() => void>]
  return () => { for (const dispose of disposers.reverse()) dispose() }
}

describe('ui-sidebar-office-preview apply', () => {
  it('keeps the host entry inert and unregisters the browser contributions', async () => {
    expect(hostApply).not.toThrow()
    const ctx = new Context()
    const tabs = new SidebarRightTabRegistry(ctx)
    const registered: Array<{ key: string; component: unknown }> = []
    const slots = {
      inject: vi.fn((_name: string, register: () => unknown) => collect(register())),
      register: vi.fn((options: { key: string }, component: unknown) => {
        const entry = { key: options.key, component }
        registered.push(entry)
        return () => { registered.splice(registered.indexOf(entry), 1) }
      }),
    }
    const dictionaries = new Map<string, unknown>()
    const locale = {
      register: vi.fn((name: string, value: unknown) => {
        dictionaries.set(name, value)
        return () => { dictionaries.delete(name) }
      }),
    }
    const remote = { workspaceFiles: { readBytes: vi.fn() } }
    ctx.provide('sidebarRightTabs', tabs as never)
    ctx.provide('slots', slots as never)
    ctx.provide('locale', locale as never)
    ctx.provide('remote', remote as never)
    ctx.provide('remote.workspaceFiles', remote.workspaceFiles as never)
    const fiber = ctx.plugin({ inject: [...inject], apply }, Config({}) as never)
    await fiber.await()
    expect(tabs.get(VIEWERS.pdf.kind)?.id).toBe(VIEWERS.pdf.id)
    expect(tabs.get(VIEWERS.docx.kind)?.id).toBe(VIEWERS.docx.id)
    expect(tabs.get(VIEWERS.xlsx.kind)?.id).toBe(VIEWERS.xlsx.id)
    expect(dictionaries.get(NS)).toEqual({ zh, en })
    expect(registered.map(entry => entry.component)).toEqual([PdfPreview, DocxPreview, XlsxPreview])
    await fiber.dispose()
    expect(tabs.get(VIEWERS.pdf.kind)).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
