import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply, Config } from '../src/index.ts'
import type { ResolvedConfig } from '../src/index.ts'
import { SvgPreview } from '../src/client/SvgPreview.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { VIEWER } from '../src/client/definitions.ts'

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
  const workspaceFiles = { readBytes: vi.fn() }
  ctx.provide('sidebarRightTabs', tabs as never)
  ctx.provide('slots', slots as never)
  ctx.provide('locale', locale as never)
  ctx.provide('remote', { workspaceFiles } as never)
  ctx.provide('remote.workspaceFiles', workspaceFiles as never)
  const fiber = ctx.plugin({ inject: [...inject], apply }, Config({}) as ResolvedConfig)
  await fiber.await()
  return { tabs, registered, dictionaries, fiber }
}

describe('ui-sidebar-svg-preview apply', () => {
  it('defaults to retaining safe HTTP(S) resources and accepts an offline policy', () => {
    expect(Config({}).externalResourcePolicy).toBe('allow')
    expect(Config({ externalResourcePolicy: 'strip' }).externalResourcePolicy).toBe('strip')
  })

  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('registers the tab type, dictionary, body, store, and face', async () => {
    const { tabs, registered, dictionaries } = await boot()
    expect(tabs.get('svg')?.id).toBe(VIEWER.id)
    expect(dictionaries.get(NS)).toEqual({ zh, en })
    expect(registered).toEqual([
      expect.objectContaining({ name: 'sidebar.right.pane.tab', key: VIEWER.id, locale: NS, component: SvgPreview }),
    ])
    expect(registered[0]?.store).toBeDefined()
    expect(registered[0]?.inject).toBeDefined()
  })

  it('removes every registration on dispose', async () => {
    const { tabs, registered, dictionaries, fiber } = await boot()
    await fiber.dispose()
    expect(tabs.get('svg')).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
