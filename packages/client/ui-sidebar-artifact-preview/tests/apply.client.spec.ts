import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { apply, Config, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { CsvPreview } from '../src/client/CsvPreview.tsx'
import { ImagePreview } from '../src/client/ImagePreview.tsx'
import { JsonPreview } from '../src/client/JsonPreview.tsx'
import { MarkdownPreview } from '../src/client/MarkdownPreview.tsx'
import { NS, en, zh } from '../src/client/locales.ts'
import { VIEWERS } from '../src/client/definitions.ts'
import type { ResolvedConfig } from '../src/index.ts'

interface Recorded {
  name: string
  key: string
  locale: string
  store: unknown
  inject: unknown
  component: unknown
}

function runSlotContribution(value: unknown): () => void {
  if (typeof value === 'function') return value as () => void
  const disposers: Array<() => void> = []
  if (typeof value === 'object' && value !== null && Symbol.iterator in value) {
    for (const dispose of value as Iterable<() => void>) disposers.push(dispose)
  }
  return () => { for (const dispose of disposers.reverse()) dispose() }
}

async function boot() {
  const ctx = new Context()
  const tabs = new SidebarRightTabRegistry(ctx)
  const registered: Recorded[] = []
  const slots = {
    inject: vi.fn((_name: string, register: () => unknown) => runSlotContribution(register())),
    register: vi.fn((options: Omit<Recorded, 'component'>, component: unknown) => {
      const entry: Recorded = { ...options, component }
      registered.push(entry)
      return () => { registered.splice(registered.indexOf(entry), 1) }
    }),
  }
  const dictionaries = new Map<string, unknown>()
  const locale = {
    register: vi.fn((ns: string, dicts: unknown) => {
      dictionaries.set(ns, dicts)
      return () => { dictionaries.delete(ns) }
    }),
  }
  const workspaceFiles = { read: vi.fn(), readBytes: vi.fn() }
  ctx.provide('sidebarRightTabs', tabs as never)
  ctx.provide('slots', slots as never)
  ctx.provide('locale', locale as never)
  ctx.provide('remote', { workspaceFiles } as never)
  ctx.provide('remote.workspaceFiles', workspaceFiles as never)
  const fiber = ctx.plugin({ inject: [...inject], apply }, Config({}) as ResolvedConfig)
  await fiber.await()
  return { tabs, registered, dictionaries, fiber }
}

describe('ui-sidebar-artifact-preview apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('registers the four tab types, dictionaries, body seats, one store, and one face', async () => {
    const { tabs, registered, dictionaries } = await boot()
    expect(tabs.get('markdown')?.id).toBe(VIEWERS.markdown.id)
    expect(tabs.get('image')?.id).toBe(VIEWERS.image.id)
    expect(tabs.get('json')?.id).toBe(VIEWERS.json.id)
    expect(tabs.get('csv')?.id).toBe(VIEWERS.csv.id)
    expect(dictionaries.get(NS)).toEqual({ zh, en })
    expect(registered.map(entry => [entry.name, entry.key, entry.locale, entry.component])).toEqual([
      ['sidebar.right.pane.tab', VIEWERS.markdown.id, NS, MarkdownPreview],
      ['sidebar.right.pane.tab', VIEWERS.image.id, NS, ImagePreview],
      ['sidebar.right.pane.tab', VIEWERS.json.id, NS, JsonPreview],
      ['sidebar.right.pane.tab', VIEWERS.csv.id, NS, CsvPreview],
    ])
    expect(new Set(registered.map(entry => entry.store)).size).toBe(1)
    expect(new Set(registered.map(entry => entry.inject)).size).toBe(1)
  })

  it('removes every registration on dispose', async () => {
    const { tabs, registered, dictionaries, fiber } = await boot()
    await fiber.dispose()
    expect(tabs.get('markdown')).toBeUndefined()
    expect(tabs.get('image')).toBeUndefined()
    expect(tabs.get('json')).toBeUndefined()
    expect(tabs.get('csv')).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
