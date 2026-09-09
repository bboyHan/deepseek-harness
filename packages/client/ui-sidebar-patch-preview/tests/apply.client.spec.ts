import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { apply, Config, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'
import { PatchPreview } from '../src/client/PatchPreview.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { PATCH_PREVIEW_ID, PATCH_PREVIEW_KIND } from '../src/client/definitions.ts'
import type { ResolvedConfig } from '../src/index.ts'

interface Recorded {
  name: string
  key: string
  locale: string
  store: unknown
  inject: unknown
  component: unknown
}

async function boot() {
  const ctx = new Context()
  const tabs = new SidebarRightTabRegistry(ctx)
  const registered: Recorded[] = []
  const slots = {
    inject: vi.fn((_name: string, register: () => unknown) => {
      const value = register()
      if (typeof value === 'function') return value
      const disposers = [...value as Iterable<() => void>]
      return () => { for (const dispose of disposers.reverse()) dispose() }
    }),
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
  const workspaceFiles = { read: vi.fn() }
  ctx.provide('sidebarRightTabs', tabs as never)
  ctx.provide('slots', slots as never)
  ctx.provide('locale', locale as never)
  ctx.provide('remote', { workspaceFiles } as never)
  ctx.provide('remote.workspaceFiles', workspaceFiles as never)
  const fiber = ctx.plugin({ inject: [...inject], apply }, Config({}) as ResolvedConfig)
  await fiber.await()
  return { tabs, registered, dictionaries, fiber }
}

describe('ui-sidebar-patch-preview apply', () => {
  it('keeps the Host entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('registers its type, dictionary, store, and body', async () => {
    const { tabs, registered, dictionaries } = await boot()
    expect(tabs.get(PATCH_PREVIEW_KIND)?.id).toBe(PATCH_PREVIEW_ID)
    expect(dictionaries.get(NS)).toEqual({ zh, en })
    expect(registered.map(entry => [entry.name, entry.key, entry.locale, entry.component])).toEqual([
      ['sidebar.right.pane.tab', PATCH_PREVIEW_ID, NS, PatchPreview],
    ])
    expect(registered[0]?.store).toBeDefined()
    expect(typeof registered[0]?.inject).toBe('function')
  })

  it('removes every registration on dispose', async () => {
    const { tabs, registered, dictionaries, fiber } = await boot()
    await fiber.dispose()
    expect(tabs.get(PATCH_PREVIEW_KIND)).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
