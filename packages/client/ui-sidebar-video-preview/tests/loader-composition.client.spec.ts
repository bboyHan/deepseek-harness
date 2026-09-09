import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { SidebarRightTabRegistry } from '@deepseek-ai/dsh-client-ui-sidebar-right/src/client/tab-registry.ts'
import * as browserPlugin from '../src/client/index.ts'
import { VIEWER } from '../src/client/definitions.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('video preview browser Loader composition', () => {
  it('loads the browser viewer from a cordis.yml entry list', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-video-preview-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      '- name: fixture-browser-services',
      "- name: '@deepseek-ai/dsh-client-ui-sidebar-video-preview/client'",
      '',
    ].join('\n'))

    const slotRows: Array<{ key: string; component: unknown }> = []
    const dictionaries = new Map<string, unknown>()
    const browserServices = {
      name: 'fixture-browser-services',
      apply(ctx: Context) {
        const tabs = new SidebarRightTabRegistry(ctx)
        const remote = { session: { openWorkspacePath: vi.fn() } }
        ctx.provide('sidebarRightTabs', tabs as never)
        ctx.provide('slots', {
          inject(_name: string, register: () => Iterable<() => void>) {
            const disposers = [...register()]
            return () => { for (const dispose of disposers.reverse()) dispose() }
          },
          register(options: { key: string }, component: unknown) {
            const row = { key: options.key, component }
            slotRows.push(row)
            return () => { slotRows.splice(slotRows.indexOf(row), 1) }
          },
        } as never)
        ctx.provide('locale', {
          register(name: string, value: unknown) {
            dictionaries.set(name, value)
            return () => { dictionaries.delete(name) }
          },
        } as never)
        ctx.provide('remote', remote as never)
        ctx.provide('remote.session', remote.session as never)
      },
    }

    const ctx = context = new Context()
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['fixture-browser-services', browserServices],
      ['@deepseek-ai/dsh-client-ui-sidebar-video-preview/client', browserPlugin],
    ])
    ctx.loader.internal = {
      version: 'v2',
      async import(specifier: string) {
        if (!modules.has(specifier)) throw new Error(`unexpected Loader import: ${specifier}`)
        return modules.get(specifier)
      },
    } as unknown as NonNullable<typeof ctx.loader.internal>

    await ctx.loader.create({ name: 'cordis:include', config: { path: pathToFileURL(configPath).href } })
    await ctx.loader.await()

    const unloaded = [...ctx.loader.entries()]
      .filter(entry => entry.fiber === undefined && !entry.disabled)
      .map(entry => entry.options.name)
    expect(unloaded).toEqual([])
    expect(ctx.sidebarRightTabs.claim('dsh-resource://file/session/s-1/work/clip.mp4')).toMatchObject({
      kind: VIEWER.kind,
      title: 'clip.mp4',
    })
    expect(ctx.sidebarRightTabs.get(VIEWER.kind)?.id).toBe(VIEWER.id)
    expect(slotRows.map(row => row.key)).toEqual([VIEWER.id])
    expect(dictionaries.has('sidebarVideoPreview')).toBe(true)

    await ctx.fiber.dispose()
    expect(slotRows).toEqual([])
    expect(dictionaries.size).toBe(0)
  })
})
