import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import * as hostPlugin from '../src/index.ts'

let root: string | undefined
let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  if (root !== undefined) await rm(root, { recursive: true, force: true })
  root = undefined
})

describe('video preview Host Loader composition', () => {
  it('loads the Host route from a cordis.yml entry list', async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-video-preview-host-loader-'))
    const configPath = join(root, 'cordis.yml')
    await writeFile(configPath, [
      '- name: fixture-host-services',
      "- name: '@deepseek-ai/dsh-client-ui-sidebar-video-preview'",
      '  config:',
      '    maxVideoBytes: 1024',
      '    maxRangeBytes: 4',
      '',
    ].join('\n'))

    const routes: Array<{ path: string; methods: readonly string[]; requestBody?: string }> = []
    const hostServices = {
      name: 'fixture-host-services',
      apply(ctx: Context) {
        ctx.provide('connection', {
          fetch: {
            register(route: { path: string; methods: readonly string[]; requestBody?: string }) {
              routes.push(route)
              return () => { routes.splice(routes.indexOf(route), 1) }
            },
          },
        } as never)
        ctx.provide('fs', {} as never)
        ctx.provide('sandboxPolicy', {} as never)
        ctx.provide('sessionController', {} as never)
      },
    }

    const ctx = context = new Context()
    ctx.baseUrl = pathToFileURL(root).href + '/'
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    const modules = new Map<string, unknown>([
      ['fixture-host-services', hostServices],
      ['@deepseek-ai/dsh-client-ui-sidebar-video-preview', hostPlugin],
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
    expect(routes).toMatchObject([{
      path: '/api/sidebar-video-preview/file',
      methods: ['GET', 'HEAD'],
      requestBody: 'buffered',
    }])

    await ctx.fiber.dispose()
    expect(routes).toEqual([])
  })
})
