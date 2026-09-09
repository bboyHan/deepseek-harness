import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import { apply, inject } from '../src/client/index.ts'
import { VideoPreview } from '../src/client/VideoPreview.tsx'
import { en, NS, zh } from '../src/client/locales.ts'
import { VIEWER } from '../src/client/definitions.ts'

function collect(value: unknown): () => void {
  if (typeof value === 'function') return value as () => void
  const disposers = [...value as Iterable<() => void>]
  return () => { for (const dispose of disposers.reverse()) dispose() }
}

describe('ui-sidebar-video-preview browser apply', () => {
  it('registers and disposes the tab type, dictionary, store, face, and body', async () => {
    const ctx = new Context()
    const tabs = new SidebarRightTabRegistry(ctx)
    const registered: Array<{ key: string; component: unknown; store: unknown; inject: unknown }> = []
    const slots = {
      inject: vi.fn((_name: string, register: () => unknown) => collect(register())),
      register: vi.fn((options: { key: string; store: unknown; inject: unknown }, component: unknown) => {
        const entry = { key: options.key, component, store: options.store, inject: options.inject }
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
    ctx.provide('sidebarRightTabs', tabs as never)
    ctx.provide('slots', slots as never)
    ctx.provide('locale', locale as never)
    const remote = { session: { openWorkspacePath: vi.fn() } }
    ctx.provide('remote', remote as never)
    ctx.provide('remote.session', remote.session as never)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(tabs.get(VIEWER.kind)?.id).toBe(VIEWER.id)
    expect(dictionaries.get(NS)).toEqual({ zh, en })
    expect(registered.map(entry => [entry.key, entry.component])).toEqual([[VIEWER.id, VideoPreview]])
    expect(registered[0]?.store).toBeDefined()
    expect(registered[0]?.inject).toBeDefined()
    await fiber.dispose()
    expect(tabs.get(VIEWER.kind)).toBeUndefined()
    expect(registered).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
